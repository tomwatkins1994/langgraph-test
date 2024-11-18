import { describe, expect, test } from "vitest";
import { Document } from "@langchain/core/documents";
import { documentGraderGraph } from "./document-grader";

describe.concurrent("Document Grader Graph", () => {
    const question =
        "What factors contributed to the decline of the Roman Empire?";

    test("Should find document relevant", async () => {
        const state = await documentGraderGraph.invoke({
            question,
            documents: [
                new Document({
                    pageContent: `
                Economic Troubles and Overreliance on Slave Labor
                The Roman Empire suffered from severe financial problems due to overreliance on slave labor, economic stagnation, and heavy taxation. 
                The reliance on slave labor slowed technological advancement, and as conquests slowed, the influx of new slaves dwindled, weakening the empire's economic base.
            `,
                }),
            ],
        });
        expect(state.relevantDocuments.length).toBe(1);
    });

    test("Should find document irrelevant", async () => {
        const state = await documentGraderGraph.invoke({
            question,
            documents: [
                new Document({
                    pageContent: `
                The Discovery of Penicillin
                In 1928, Alexander Fleming discovered penicillin, the world's first true antibiotic. 
                This breakthrough transformed the field of medicine, saving countless lives and leading to the development of further antibiotic drugs.
            `,
                }),
            ],
        });
        expect(state.relevantDocuments.length).toBe(0);
    });

    test("Should handle multiple documents", async () => {
        const state = await documentGraderGraph.invoke({
            question,
            documents: [
                new Document({
                    pageContent: `
                Economic Troubles and Overreliance on Slave Labor
                The Roman Empire suffered from severe financial problems due to overreliance on slave labor, economic stagnation, and heavy taxation. 
                The reliance on slave labor slowed technological advancement, and as conquests slowed, the influx of new slaves dwindled, weakening the empire's economic base.
            `,
                }),
                new Document({
                    pageContent: `
                The Discovery of Penicillin
                In 1928, Alexander Fleming discovered penicillin, the world's first true antibiotic. 
                This breakthrough transformed the field of medicine, saving countless lives and leading to the development of further antibiotic drugs.
            `,
                }),
            ],
        });
        expect(state.relevantDocuments.length).toBe(1);
    });
});
