import { execifyGraph } from "$lib/server/ai/graphs/execify";
import { FinalNodeStream } from "$lib/server/ai/utils/final-node-stream";
import { HumanMessage } from "@langchain/core/messages";
import type { RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request, params }) => {
    try {
        const { message } = await request.json();

        const eventStream = execifyGraph
            .withConfig({ configurable: { thread_id: params.threadId } })
            .streamEvents(
                { messages: [new HumanMessage(message)] },
                { version: "v2" }
            );

        const { readable, writable } = new FinalNodeStream();
        eventStream.pipeTo(writable);

        return new Response(readable, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
            },
        });
    } catch (error) {
        console.error("Error processing chat:", error);
        return new Response(
            JSON.stringify({ error: "Failed to process chat" }),
            { status: 500 }
        );
    }
};
