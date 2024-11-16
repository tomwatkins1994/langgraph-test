import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { StateGraph } from "@langchain/langgraph";
import { MemorySaver, Annotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { pull } from "langchain/hub";
import type { ChatPromptTemplate } from "@langchain/core/prompts";

const StateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
    }),
    documents: Annotation<string[]>({
        reducer: (x, y) => x.concat(y),
    }),
});

const loader = new PDFLoader("src/Execify - Senior AI Engineer Job Spec.pdf");
const docs = await loader.load();

const vectorStore = await MemoryVectorStore.fromDocuments(
    docs,
    new OpenAIEmbeddings({ model: "text-embedding-3-small" })
);
const retriever = vectorStore.asRetriever();

const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
});

async function callModel(state: typeof StateAnnotation.State) {
    const question = state.messages[state.messages.length - 1]?.content;
    if (!question) {
        return {};
    }

    const prompt = await pull<ChatPromptTemplate>("rlm/rag-prompt");
    const ragChain = await createStuffDocumentsChain({
        llm: model,
        prompt,
        outputParser: new StringOutputParser(),
    });
    const retrievedDocs = await retriever.invoke(String(question));
    const response = await ragChain.invoke({
        question,
        context: retrievedDocs,
    });

    return { messages: [new AIMessage(response)] };
}

const workflow = new StateGraph(StateAnnotation)
    .addNode("agent", callModel)
    .addEdge("__start__", "agent")
    .addEdge("agent", "__end__");

const checkpointer = new MemorySaver();

export const app = workflow.compile({ checkpointer });
