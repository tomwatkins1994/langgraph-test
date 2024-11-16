import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { env } from "$env/dynamic/private";

if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

export const pgCheckpointer = PostgresSaver.fromConnString(env.DATABASE_URL);

await pgCheckpointer.setup();
