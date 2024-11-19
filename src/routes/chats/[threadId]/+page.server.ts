import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { BaseMessage } from "@langchain/core/messages";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
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

    const messages =
        state.values.messages?.map((message: BaseMessage) => {
            if (message instanceof HumanMessage) {
                return {
                    role: "user",
                    content: message.content,
                };
            }
            if (message instanceof AIMessage) {
                return {
                    role: "assistant",
                    content: message.content,
                };
            }
        }) || [];

    return { thread, messages };
};
