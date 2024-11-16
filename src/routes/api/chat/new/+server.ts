import { db, schema } from "$lib/server/db";
import type { RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { name } = await request.json();

        const result = await db
            .insert(schema.threads)
            .values({ name })
            .returning({ id: schema.threads.id });

        const id = result[0].id;

        return new Response(
            JSON.stringify({
                id,
            }),
            { status: 200 }
        );
    } catch (error) {
        console.error("Error creating chat:", error);
        return new Response(
            JSON.stringify({ error: "Failed to create chat" }),
            { status: 500 }
        );
    }
};
