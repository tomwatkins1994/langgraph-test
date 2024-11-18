import { env } from "$env/dynamic/private";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    openAIApiKey: env.OPENAI_API_KEY,
    temperature: 0,
});

const prompt = new PromptTemplate({
    template: `
        You are a grader assessing whether some text is a good answer to a question. 
        Give a binary score 'yes' or 'no' to indicate whether the text is a good answer the question provided. 
        Provide the binary score as JSON with a single key 'score' and no explanation for why the score was given.

        Here is the question: {question}
        Here is the answer: {answer}
    `,
    inputVariables: ["question", "answer"],
});

const chain = RunnableSequence.from([
    prompt,
    llm.withStructuredOutput(
        z.object({
            score: z.enum(["yes", "no"]),
        })
    ),
]);

export async function gradeAnswer(question: string, answer: string) {
    const response = await chain.invoke({
        question,
        answer,
    });

    return response;
}

export const answerGraderTool = tool(
    async ({ question, answer }) => {
        const { score } = await gradeAnswer(question, answer);
        return score;
    },
    {
        name: "answer_grader",
        description:
            "Call to check if an AI assistant response is a good answer to a users question.",
        schema: z.object({
            question: z.string().describe("The question asked by the user."),
            answer: z.string().describe("The response from the AI assistant."),
        }),
    }
);
