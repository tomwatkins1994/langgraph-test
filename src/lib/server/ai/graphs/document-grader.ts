import { env } from "$env/dynamic/private";
import type { DocumentInterface } from "@langchain/core/documents";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { Annotation, END, Send, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// Graph State

const StateAnnotation = Annotation.Root({
    question: Annotation<string>(),
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    documents: Annotation<DocumentInterface<Record<string, any>>[]>(),
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    relevantDocuments: Annotation<DocumentInterface<Record<string, any>>[]>({
        reducer: (state, update) => {
            if (update === null) {
                return [];
            }
            return state.concat(update);
        },
        default: () => [],
    }),
});

type StateUpdate = Partial<typeof StateAnnotation.State>;

const DocumentState = Annotation.Root({
    question: Annotation<string>(),
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    document: Annotation<DocumentInterface<Record<string, any>>>(),
});

// Models

const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    openAIApiKey: env.OPENAI_API_KEY,
    temperature: 0,
});

// Nodes

async function graderNode(
    state: typeof DocumentState.State
): Promise<StateUpdate> {
    const prompt = new PromptTemplate({
        template: `
            You are a grader assessing whether some text is useful to resolve a question. 
            Give a binary score 'yes' or 'no' to indicate whether the text is useful to resolve the question provided. 
            Provide the binary score as JSON with a single key 'score' and no explanation for why the score was given.

            Here is the question: {question}
            Here is the text: {text}
        `,
        inputVariables: ["question", "text"],
    });
    const chain = RunnableSequence.from([
        prompt,
        llm.withStructuredOutput(
            z.object({
                score: z.enum(["yes", "no"]),
            })
        ),
    ]);
    const response = await chain.invoke({
        question: state.question,
        text: state.document.pageContent,
    });
    if (response.score === "yes") {
        console.log("Adding relevant document");
        return { relevantDocuments: [state.document] };
    }
    return {};
}

// Conditional Edges

function gradeDocuments(state: typeof StateAnnotation.State): Send[] {
    const nodes = state.documents.map(document => {
        return new Send("grader", { document, question: state.question });
    });

    return nodes;
}

// Workflow

const workflow = new StateGraph(StateAnnotation)
    .addNode("grader", graderNode)
    .addConditionalEdges(START, gradeDocuments)
    .addEdge("grader", END);

export const documentGraderGraph = workflow.compile();
