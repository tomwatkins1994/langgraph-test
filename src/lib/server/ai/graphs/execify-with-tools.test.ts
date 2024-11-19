import { describe, expect } from "vitest";
import { execifyGraph } from "./execify";
import { HumanMessage } from "@langchain/core/messages";
import { aiTest } from "../../../../../tests/utils/ai-test";
import { gradeAnswer } from "../tools/answer-grader";

describe.concurrent("Execify Graph With Tools", () => {
    aiTest(
        "Should answer from the PDF",
        { timeout: 30_000 },
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
            const { score } = await gradeAnswer(question, answer.content);
            expect(score).toBe("yes");
        }
    );

    aiTest(
        "Should answer from the web",
        { timeout: 30_000 },
        async ({ thread }) => {
            const question = "What is the Execify exec dashboard?";
            const state = await execifyGraph.invoke(
                {
                    messages: [new HumanMessage(question)],
                },
                { configurable: { thread_id: thread.id } }
            );
            expect(state.webSearched).toBe(true);

            const answer = state.messages[state.messages.length - 1];
            const { score } = await gradeAnswer(question, answer.content);
            expect(score).toBe("yes");
        }
    );

    aiTest(
        "Should not find an answer",
        { timeout: 30_000 },
        async ({ thread }) => {
            const question = "How many employees does execify currently have?";
            const state = await execifyGraph.invoke(
                {
                    messages: [new HumanMessage(question)],
                },
                { configurable: { thread_id: thread.id } }
            );
            expect(state.webSearched).toBe(true);
            expect(state.relevantDocuments.length).toBe(0);

            const answer = state.messages[state.messages.length - 1];
            const { score } = await gradeAnswer(question, answer.content);
            expect(score).toBe("no");
        }
    );
});
