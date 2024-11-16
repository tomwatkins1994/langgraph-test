import { app } from "$lib/server/workflows/pdf-chat";
import { HumanMessage } from "@langchain/core/messages";
import type { RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { message } = await request.json();

        const finalState = await app.invoke(
            { messages: [new HumanMessage(message)] },
            { configurable: { thread_id: "42" } }
        );

        return new Response(
            JSON.stringify({
                reply: finalState.messages[finalState.messages.length - 1]
                    .content,
            }),
            { status: 200 }
        );
    } catch (error) {
        console.error("Error processing chat:", error);
        return new Response(
            JSON.stringify({ error: "Failed to process chat" }),
            { status: 500 }
        );
    }
};