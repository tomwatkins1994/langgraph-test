import { execifyGraph } from "$lib/server/ai/graphs/execify";
import { HumanMessage } from "@langchain/core/messages";
import type { RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request, params }) => {
    try {
        const { message } = await request.json();

        const finalState = await execifyGraph.invoke(
            { messages: [new HumanMessage(message)] },
            { configurable: { thread_id: params.threadId } }
        );

        const newMessage = finalState.messages[finalState.messages.length - 1];

        return new Response(
            JSON.stringify({
                id: newMessage.id,
                reply: newMessage.content,
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
