import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { END, START, StateGraph } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { pull } from "langchain/hub";
import type { ChatPromptTemplate } from "@langchain/core/prompts";
import { env } from "$env/dynamic/private";
import { pgCheckpointer } from "../pg-peristance";
import { Document, type DocumentInterface } from "@langchain/core/documents";

const StateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
    }),
    question: Annotation<string>(),
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    documents: Annotation<DocumentInterface<Record<string, any>>[]>({
        reducer: (x, y) => {
            if (y === null) {
                return [];
            }
            return x.concat(y);
        },
    }),
});

const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    openAIApiKey: env.OPENAI_API_KEY,
    temperature: 0,
});

// PDF Vector Store

const loader = new PDFLoader("src/Execify - Senior AI Engineer Job Spec.pdf");
const docs = await loader.load();

const vectorStore = await MemoryVectorStore.fromDocuments(
    docs,
    new OpenAIEmbeddings({
        model: "text-embedding-3-small",
        openAIApiKey: env.OPENAI_API_KEY,
    })
);
const pdfRetriever = vectorStore.asRetriever();

async function pdfRetrieverNode(state: typeof StateAnnotation.State) {
    console.log("Searching PDFs", { docs: state.documents.length });
    const retrievedDocs = await pdfRetriever.invoke(String(state.question));

    return { documents: retrievedDocs };
}

// Web Search

const tavilySearch = new TavilySearchResults({
    maxResults: 2,
    apiKey: env.TAVILY_API_KEY,
});

async function webSearchNode(state: typeof StateAnnotation.State) {
    console.log("Searching the web", { docs: state.documents.length });
    const retrievedDocs = await tavilySearch.invoke(state.question);
    console.log({ retrievedDocs });
    const documents = (
        (JSON.parse(retrievedDocs) as {
            title: string;
            url: string;
            content: string;
        }[]) || []
    ).map(doc => {
        return new Document({
            pageContent: doc.content,
            metadata: {
                title: doc.title,
                url: doc.url,
            },
        });
    });

    return { documents };
}

async function getQuestionNode(state: typeof StateAnnotation.State) {
    const question = state.messages[state.messages.length - 1]?.content;
    if (!question) {
        return {};
    }

    return { question, documents: null };
}

async function generateNode(state: typeof StateAnnotation.State) {
    const prompt = await pull<ChatPromptTemplate>("rlm/rag-prompt");
    const ragChain = await createStuffDocumentsChain({
        llm: model,
        prompt,
        outputParser: new StringOutputParser(),
    });
    console.log("Generate", { docs: state.documents.length });
    const response = await ragChain.invoke({
        question: state.question,
        context: state.documents,
    });

    return { messages: [new AIMessage(response)] };
}

const workflow = new StateGraph(StateAnnotation)
    .addNode("get_question", getQuestionNode)
    .addNode("retriever", pdfRetrieverNode)
    .addNode("web_search", webSearchNode)
    .addNode("generate", generateNode)
    .addEdge(START, "get_question")
    .addEdge("get_question", "retriever")
    .addEdge("retriever", "web_search")
    .addEdge("web_search", "generate")
    .addEdge("generate", END);

export const graph = workflow.compile({ checkpointer: pgCheckpointer });
