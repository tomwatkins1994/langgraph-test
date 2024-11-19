import { env } from "$env/dynamic/private";

export function setupLangsmith() {
    process.env.LANGCHAIN_TRACING_V2 = env.LANGCHAIN_TRACING_V2;
    process.env.LANGCHAIN_ENDPOINT = env.LANGCHAIN_ENDPOINT;
    process.env.LANGCHAIN_API_KEY = env.LANGCHAIN_API_KEY;
}
