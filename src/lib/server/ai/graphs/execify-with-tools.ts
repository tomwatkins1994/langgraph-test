import { SystemMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { END, START, StateGraph } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { env } from "$env/dynamic/private";
import { pgCheckpointer } from "../pg-peristance";
import { setupLangsmith } from "../utils/setup-langsmith";
import { webSearchTool } from "../tools/web-search";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { pdfSearchTool } from "../tools/pdf-search";
import { convertToOpenAITool } from "@langchain/core/utils/function_calling";

setupLangsmith();

// Graph State

const StateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (state, update) => state.concat(update),
    }),
});

type StateUpdate = Partial<typeof StateAnnotation.State>;

// Models

const tools = [pdfSearchTool, webSearchTool];
const toolNode = new ToolNode(tools);

const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    openAIApiKey: env.OPENAI_API_KEY,
    temperature: 0,
}).bind({ tools: tools.map(tool => convertToOpenAITool(tool)) });

// Nodes

async function agentNode(
    state: typeof StateAnnotation.State
): Promise<StateUpdate> {
    const systemTemplate = `
        You are an assistant for question-answering tasks. 
        Always try and find the answer by searching in the PDF before looking elsewhere.
        If you cannot find the answer in the PDF then search for the answer on the web.
        If you still don't know the answer after the first web search, just say that you don't know.
        Use three sentences maximum and keep the answer concise.`;
    const systemMessage = new SystemMessage(systemTemplate);
    const response = await llm
        .withConfig({ tags: ["final_node"] })
        .invoke([systemMessage, ...state.messages]);

    return { messages: [response] };
}

// Workflow

const workflow = new StateGraph(StateAnnotation)
    .addNode("agent", agentNode)
    .addNode("tools", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", toolsCondition)
    .addEdge("tools", "agent")
    .addEdge("agent", END);

export const execifyWithToolsGraph = workflow.compile({
    checkpointer: pgCheckpointer,
});
