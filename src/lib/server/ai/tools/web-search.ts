import { env } from "$env/dynamic/private";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

export const webSearchTool = new TavilySearchResults({
    maxResults: 2,
    apiKey: env.TAVILY_API_KEY,
});

// export const webSearchTool = tool(
//     async ({ query }) => {
//         const results = tavilySearch.invoke({ query });
//         console.log({ query, searchResults: results });
//         return results;
//     },
//     {
//         name: "web_search",
//         description: "Search the web for the answer to a question.",
//         schema: z.object({
//             query: z.string().describe("The query to use in your search."),
//         }),
//     }
// );
