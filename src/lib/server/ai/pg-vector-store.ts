import { env } from "$env/dynamic/private";
import {
    PGVectorStore,
    type DistanceStrategy,
} from "@langchain/community/vectorstores/pgvector";
import { OpenAIEmbeddings } from "@langchain/openai";
import type { PoolConfig } from "pg";

// Sample config
const config = {
    postgresConnectionOptions: {
        type: "postgres",
        host: env.DATABASE_HOST,
        port: Number(env.DATABASE_PORT),
        user: env.DATABASE_USER,
        password: env.DATABASE_PASSWORD,
        database: env.DATABASE_NAME,
    } as PoolConfig,
    tableName: "embeddings",
    columns: {
        idColumnName: "id",
        vectorColumnName: "vector",
        contentColumnName: "content",
        metadataColumnName: "metadata",
    },
    // supported distance strategies: cosine (default), innerProduct, or euclidean
    distanceStrategy: "cosine" as DistanceStrategy,
};

export const vectorStore = await PGVectorStore.initialize(
    new OpenAIEmbeddings({
        model: "text-embedding-3-small",
    }),
    config
);
