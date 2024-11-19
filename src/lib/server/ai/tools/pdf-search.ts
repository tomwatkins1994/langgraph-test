import { env } from "$env/dynamic/private";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { z } from "zod";

const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    openAIApiKey: env.OPENAI_API_KEY,
    temperature: 0,
});

const loader = new PDFLoader("src/Execify - Senior AI Engineer Job Spec.pdf");
const docs = await loader.load();
const vectorStore = await MemoryVectorStore.fromDocuments(
    docs,
    new OpenAIEmbeddings({
        model: "text-embedding-3-small",
        openAIApiKey: env.OPENAI_API_KEY,
    })
);

export const pdfSearchTool = tool(
    async ({ query }) => {
        const prompt = ChatPromptTemplate.fromTemplate(
            `Answer the user's question: {input} based on the following context {context}`
        );
        const combineDocsChain = await createStuffDocumentsChain({
            llm,
            prompt,
        });
        const retriever = vectorStore.asRetriever();
        const retrievalChain = await createRetrievalChain({
            combineDocsChain,
            retriever,
        });
        const result = await retrievalChain.invoke({ input: query });

        return result.answer;
    },
    {
        name: "pdf_search",
        description: "Search the PDF for the answer to a question.",
        schema: z.object({
            query: z.string().describe("The query to use in your search."),
        }),
    }
);
