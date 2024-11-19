import {
    AIMessage,
    RemoveMessage,
    type BaseMessage,
} from "@langchain/core/messages";
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
import { documentGraderGraph } from "./document-grader";
import { setupLangsmith } from "../utils/setup-langsmith";

setupLangsmith();

// Graph State

const StateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
    }),
    question: Annotation<string>(),
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    documents: Annotation<DocumentInterface<Record<string, any>>[] | null>({
        reducer: (x, y) => {
            let docs = x;
            if (x === null) {
                docs = [];
            }
            if (y === null) {
                return [];
            }
            return (docs || []).concat(y);
        },
        default: () => [],
    }),
    relevantDocuments: Annotation<
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        DocumentInterface<Record<string, any>>[] | null
    >({
        reducer: (x, y) => {
            if (y === null) {
                return [];
            }
            return (x || []).concat(y);
        },
        default: () => [],
    }),
    webSearched: Annotation<boolean>(),
});

type StateUpdate = Partial<typeof StateAnnotation.State>;

// Models

const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    openAIApiKey: env.OPENAI_API_KEY,
    temperature: 0,
});

// Nodes

async function getQuestionNode(
    state: typeof StateAnnotation.State
): Promise<StateUpdate> {
    const question = state.messages[state.messages.length - 1];

    return {
        question: String(question.content),
        documents: null,
        relevantDocuments: null,
        webSearched: false,
    };
}

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

async function pdfRetrieverNode(
    state: typeof StateAnnotation.State
): Promise<StateUpdate> {
    console.log("Searching PDFs");
    const retrievedDocs = await pdfRetriever.invoke(state.question);

    return { documents: retrievedDocs };
}

// Web Search

const tavilySearch = new TavilySearchResults({
    maxResults: 2,
    apiKey: env.TAVILY_API_KEY,
});

async function webSearchNode(
    state: typeof StateAnnotation.State
): Promise<StateUpdate> {
    console.log("Searching the web");
    const retrievedDocs = await tavilySearch.invoke(state.question);
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

    return { documents, webSearched: true };
}

async function generateNode(
    state: typeof StateAnnotation.State
): Promise<StateUpdate> {
    const prompt = await pull<ChatPromptTemplate>("rlm/rag-prompt");
    const ragChain = await createStuffDocumentsChain({
        llm: model.withConfig({
            tags: ["final_node"],
        }),
        prompt,
        outputParser: new StringOutputParser(),
    });
    console.log("Generate", {
        docs: state.documents?.length,
        relevantDocs: state.relevantDocuments?.length,
    });
    const response = await ragChain.invoke({
        question: state.question,
        context: state.relevantDocuments || [],
    });

    return { messages: [new AIMessage(response)] };
}

// Conditonal Edges

async function needsMoreContent(state: typeof StateAnnotation.State) {
    console.log("Checking if we have relevant documents", {
        relevantDocuments: state.relevantDocuments?.length,
        webSearched: state.webSearched,
    });
    if ((state.relevantDocuments?.length || 0) > 0 || state.webSearched) {
        return "generate";
    }

    return "web_search";
}

// Workflow

const workflow = new StateGraph(StateAnnotation)
    .addNode("get_question", getQuestionNode)
    .addNode("retriever", pdfRetrieverNode)
    .addNode("document_grader", documentGraderGraph)
    .addNode("web_search", webSearchNode)
    .addNode("generate", generateNode)
    .addEdge(START, "get_question")
    .addEdge("get_question", "retriever")
    .addEdge("retriever", "document_grader")
    .addConditionalEdges("document_grader", needsMoreContent)
    .addEdge("web_search", "document_grader")
    .addEdge("generate", END);

export const execifyGraph = workflow.compile({ checkpointer: pgCheckpointer });
