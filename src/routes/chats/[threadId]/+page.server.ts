import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { BaseMessage } from "@langchain/core/messages";
import {
    AIMessage,
    AIMessageChunk,
    HumanMessage,
} from "@langchain/core/messages";
import { db, schema } from "$lib/server/db";
import { eq } from "drizzle-orm";
import { execifyWithToolsGraph } from "$lib/server/ai/graphs/execify-with-tools";

export const load: PageServerLoad = async ({ params }) => {
    const thread = await db.query.threads.findFirst({
        where: eq(schema.threads.id, params.threadId),
    });
    if (!thread) {
        error(404, "Not found");
    }

    const state = await execifyWithToolsGraph.getState({
        configurable: { thread_id: params.threadId },
    });

    const messages: { role: "user" | "assistant"; content: string }[] = [];
    for (const message of (state.values.messages || []) as BaseMessage[]) {
        if (
            typeof message.content !== "string" ||
            message.content.length === 0
        ) {
            continue;
        }

        if (message instanceof HumanMessage) {
            messages.push({
                role: "user",
                content: message.content,
            });
        } else if (
            message instanceof AIMessage ||
            message instanceof AIMessageChunk
        ) {
            messages.push({
                role: "assistant",
                content: message.content,
            });
        }
    }

    return { thread, messages };
};
