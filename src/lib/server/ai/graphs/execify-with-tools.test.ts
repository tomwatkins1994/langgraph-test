import { describe, expect } from "vitest";
import { execifyWithToolsGraph } from "./execify-with-tools";
import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { aiTest } from "../../../../../tests/utils/ai-test";
import { gradeAnswer } from "../tools/answer-grader";

describe.concurrent("Execify Graph With Tools", () => {
    aiTest(
        "Should answer from the PDF",
        { timeout: 60_000 },
        async ({ thread }) => {
            const question = "Where are Execify headquartered?";
            const state = await execifyWithToolsGraph.invoke(
                {
                    messages: [new HumanMessage(question)],
                },
                { configurable: { thread_id: thread.id } }
            );

            const answer = state.messages[state.messages.length - 1];
            expect((answer?.content || "").length).toBeGreaterThan(0);

            const { score } = await gradeAnswer(question, answer.content);
            expect(score).toBe("yes");

            // Check tool calls
            let pdfSearchCalled = false;
            let webSearchCalled = false;
            for (const message of state.messages as BaseMessage[]) {
                if (message instanceof ToolMessage) {
                    if (message.name === "pdf_search") {
                        pdfSearchCalled = true;
                    } else if (message.name === "web_search") {
                        webSearchCalled = true;
                    }
                }
                if (pdfSearchCalled && webSearchCalled) {
                    break;
                }
            }
            expect(pdfSearchCalled).toBe(true);
            expect(webSearchCalled).toBe(false);
        }
    );

    // aiTest(
    //     "Should answer from the web",
    //     { timeout: 30_000 },
    //     async ({ thread }) => {
    //         const question = "What is the Execify Exec Dashboard?";
    //         const state = await execifyWithToolsGraph.invoke(
    //             {
    //                 messages: [new HumanMessage(question)],
    //             },
    //             { configurable: { thread_id: thread.id } }
    //         );
    //         console.log(state.messages);

    //         const answer = state.messages[state.messages.length - 1];
    //         expect((answer?.content || "").length).toBeGreaterThan(0);

    //         const { score } = await gradeAnswer(question, answer.content);
    //         expect(score).toBe("yes");
    //     }
    // );

    aiTest(
        "Should attempt to find an answer on the web",
        { timeout: 60_000 },
        async ({ thread }) => {
            const question = "How many people do execify currently employ?";
            const state = await execifyWithToolsGraph.invoke(
                {
                    messages: [new HumanMessage(question)],
                },
                { configurable: { thread_id: thread.id } }
            );

            const answer = state.messages[state.messages.length - 1];
            expect((answer?.content || "").length).toBeGreaterThan(0);

            // const { score } = await gradeAnswer(question, answer.content);
            // expect(score).toBe("yes");

            // Check tool calls
            let pdfSearchCalled = false;
            let webSearchCalled = false;
            for (const message of state.messages as BaseMessage[]) {
                if (message instanceof ToolMessage) {
                    if (message.name === "pdf_search") {
                        pdfSearchCalled = true;
                    } else if (message.name === "web_search") {
                        webSearchCalled = true;
                    }
                }
                if (pdfSearchCalled && webSearchCalled) {
                    break;
                }
            }
            expect(pdfSearchCalled).toBe(true);
            expect(webSearchCalled).toBe(true);
        }
    );
});
