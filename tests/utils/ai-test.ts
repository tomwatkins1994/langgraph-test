import { db, schema } from "$lib/server/db";
import { eq } from "drizzle-orm";
import { test } from "vitest";

export const aiTest = test.extend({
    // biome-ignore lint/correctness/noEmptyPattern: As per vitest example
    thread: async ({}, use) => {
        const results = await db
            .insert(schema.threads)
            .values({ name: "Graph Test" })
            .returning({ id: schema.threads.id });

        const thread = results[0];

        // Use the fixture value
        await use(thread);

        // Delete the thread after the test
        db.delete(schema.threads).where(eq(schema.threads.id, thread.id));
    },
});
