import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";

export const load: PageServerLoad = async ({ params }) => {
    const threads = await db.query.threads.findMany();

    return { threads };
};
