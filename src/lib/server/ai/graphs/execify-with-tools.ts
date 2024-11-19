import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { END, START, StateGraph } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { env } from "$env/dynamic/private";
import { pgCheckpointer } from "../pg-peristance";
import type { DocumentInterface } from "@langchain/core/documents";
import { setupLangsmith } from "../utils/setup-langsmith";
import { tavilySearch } from "../tools/web-search";
import { ToolNode } from "@langchain/langgraph/prebuilt";

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
});

type StateUpdate = Partial<typeof StateAnnotation.State>;

// Models

const tools = [tavilySearch];
const toolNode = new ToolNode(tools);

const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    openAIApiKey: env.OPENAI_API_KEY,
    temperature: 0,
}).bindTools(tools);

// Nodes

async function getQuestionNode(
    state: typeof StateAnnotation.State
): Promise<StateUpdate> {
    const question = state.messages[state.messages.length - 1];

    return {
        question: String(question.content),
        documents: null,
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
    const retrievedDocs = await pdfRetriever.invoke(state.question);
    return { documents: retrievedDocs };
}

async function generateNode(
    state: typeof StateAnnotation.State
): Promise<StateUpdate> {
    const prompt = new PromptTemplate({
        template: `
            You are an assistant for question-answering tasks. 
            Use the provided context to answer the question. 
            If you cant't find the answer in the context, search the web for the answer. 
            If dont get an answer from the web search then just say that you don't know the answer to the question. 
            Use three sentences maximum and keep the answer concise.

            Question: {question} 
            Context: {context} 
            Answer:
        `,
        inputVariables: ["question", "context"],
    });
    const ragChain = await createStuffDocumentsChain({
        llm: model.withConfig({
            tags: ["final_node"],
        }),
        prompt,
        outputParser: new StringOutputParser(),
    });
    const response = await ragChain.invoke({
        question: state.question,
        context: state.documents || [],
    });

    return { messages: [new AIMessage(response)] };
}

// Conditonal Edges

function shouldContinue(state: typeof StateAnnotation.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1] as AIMessage;

    if (lastMessage.tool_calls?.length) {
        return "tools";
    }

    return "__end__";
}

// Workflow

const workflow = new StateGraph(StateAnnotation)
    .addNode("get_question", getQuestionNode)
    .addNode("retriever", pdfRetrieverNode)
    .addNode("generate", generateNode)
    .addNode("tools", toolNode)
    .addEdge(START, "get_question")
    .addEdge("get_question", "retriever")
    .addEdge("retriever", "generate")
    .addConditionalEdges("generate", shouldContinue)
    .addEdge("tools", "generate")
    .addEdge("generate", END);

export const execifyWithToolsGraph = workflow.compile({
    checkpointer: pgCheckpointer,
});
