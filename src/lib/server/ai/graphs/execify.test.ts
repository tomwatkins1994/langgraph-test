import { describe, expect } from "vitest";
import { execifyGraph } from "./execify";
import { HumanMessage } from "@langchain/core/messages";
import { aiTest } from "../../../../../tests/utils/ai-test";
import { ChatOpenAI } from "@langchain/openai";
import { env } from "$env/dynamic/private";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";
import { gradeAnswer } from "../tools/answer-grader";

describe.concurrent("Execify Graph", () => {
    aiTest(
        "Should answer from the PDF",
        { timeout: 10_000 },
        async ({ thread }) => {
            const question =
                "What key skills are needed for the Senior AI Engineer job?";
            const state = await execifyGraph.invoke(
                {
                    messages: [new HumanMessage(question)],
                },
                { configurable: { thread_id: thread.id } }
            );

            expect(state.webSearched).toBe(false);

            const answer = state.messages[state.messages.length - 1];
            const { score } = await gradeAnswer(question, answer);
            expect(score).toBe("yes");
        }
    );
});
