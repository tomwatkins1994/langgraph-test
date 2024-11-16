import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { END, START, StateGraph } from "@langchain/langgraph";
import { MemorySaver, Annotation } from "@langchain/langgraph";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { pull } from "langchain/hub";
import type { ChatPromptTemplate } from "@langchain/core/prompts";
import { env } from "$env/dynamic/private";
import { pgCheckpointer } from "../pg-peristance";
import type { DocumentInterface } from "@langchain/core/documents";

const StateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
    }),
    question: Annotation<string>(),
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    documents: Annotation<DocumentInterface<Record<string, any>>[]>({
        reducer: (x, y) => x.concat(y),
    }),
});

const loader = new PDFLoader("src/Execify - Senior AI Engineer Job Spec.pdf");
const docs = await loader.load();

const vectorStore = await MemoryVectorStore.fromDocuments(
    docs,
    new OpenAIEmbeddings({
        model: "text-embedding-3-small",
        openAIApiKey: env.OPENAI_API_KEY,
    })
);
const retriever = vectorStore.asRetriever();

const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    openAIApiKey: env.OPENAI_API_KEY,
    temperature: 0,
});

async function retrieverNode(state: typeof StateAnnotation.State) {
    const question = state.messages[state.messages.length - 1]?.content;
    if (!question) {
        return {};
    }

    const retrievedDocs = await retriever.invoke(String(question));

    return { documents: retrievedDocs, question };
}

async function generateNode(state: typeof StateAnnotation.State) {
    const prompt = await pull<ChatPromptTemplate>("rlm/rag-prompt");
    const ragChain = await createStuffDocumentsChain({
        llm: model,
        prompt,
        outputParser: new StringOutputParser(),
    });
    const response = await ragChain.invoke({
        question: state.question,
        context: state.documents,
    });

    return { messages: [new AIMessage(response)] };
}

const workflow = new StateGraph(StateAnnotation)
    .addNode("retriever", retrieverNode)
    .addNode("generate", generateNode)
    .addEdge(START, "retriever")
    .addEdge("retriever", "generate")
    .addEdge("generate", END);

export const graph = workflow.compile({ checkpointer: pgCheckpointer });
