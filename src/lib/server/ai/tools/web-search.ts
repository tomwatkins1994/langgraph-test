import { env } from "$env/dynamic/private";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

export const tavilySearch = new TavilySearchResults({
    maxResults: 2,
    apiKey: env.TAVILY_API_KEY,
});
