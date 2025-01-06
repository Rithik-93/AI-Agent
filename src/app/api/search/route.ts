import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding } from "../db/ai";
import { pc } from "../db/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RecordMetadata, ScoredPineconeRecord } from "@pinecone-database/pinecone";

declare module "@pinecone-database/pinecone" {
    interface ScoredPineconeRecord<T> {
        metadata?: T;
    }
}

export const indexName = process.env.INDEX_NAME!;
export const INDEX_HOST = process.env.INDEX_HOST!;
const index = pc.index(indexName, INDEX_HOST);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { question, prev = [] } = body;
        if (!question) {
            return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
        }

        const allMessages = [...prev, question];

        type Embedding = number[];

        const embeddings: Embedding[] = await Promise.all(
            allMessages.map((msg) => generateEmbedding(msg))
        );

        if (!embeddings.length || !embeddings[0]?.length) {
            throw new Error('Invalid embeddings generated');
        }

        const weights = allMessages.map((_, index) =>
            Math.exp((index - allMessages.length + 1) * 0.5)
        );

        const weightSum = weights.reduce((a, b) => a + b, 0);

        const vectorSize = embeddings[0].length;
        const combinedVector: number[] = new Array(vectorSize).fill(0);

        for (let i = 0; i < embeddings.length; i++) {
            const normalizedWeight = weights[i] / weightSum;
            const embedding = embeddings[i];

            if (embedding.length !== vectorSize) {
                console.error(`Embedding ${i} has incorrect size`);
                continue;
            }

            for (let j = 0; j < vectorSize; j++) {
                combinedVector[j] += embedding[j] * normalizedWeight;
            }
        }

        const results = await queryPinecone(combinedVector);
        console.log("resultssssssssssssssssssssss", results);

        const response = await llmCall(results, question);

        // let res;
        // if (response) {
        //     res = await validateApiResponse(response);
        // }

        return NextResponse.json({ response });
    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

async function queryPinecone(queryVector: any) {
    try {
        const queryResponse = await index.namespace("api_docs").query({
            vector: queryVector,
            topK: 4,
            includeMetadata: true
        });
        return queryResponse.matches;
    } catch (error) {
        console.error('Error querying Pinecone:', error);
        throw error;
    }
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI!)
const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash'
})

export async function llmCall(
    data: ScoredPineconeRecord<RecordMetadata>[],
    question: string
): Promise<string | null> {
    try {
        let concatenatedData: string[] = [];

        for (let i = 0; i < data.length; i++) {
            const metadataData = data[i]?.metadata?.data;
            if (metadataData) {
                if (Array.isArray(metadataData)) {
                    concatenatedData = concatenatedData.concat(metadataData);
                } else {
                    concatenatedData.push(metadataData.toString());
                }
            }
        }

        const isCodeRequest = question.toLowerCase().match(
            /(code|example|curl|api|endpoint|reference|how to use|implementation|snippet)/
        );

        const role = `
You are a specialized API documentation assistant. Your purpose is to provide accurate, detailed responses based on the provided API documentation.

Analysis Requirements:
1. Thoroughly examine ALL provided documentation sections
2. Cross-reference related endpoints and features
3. Consider authentication, rate limits, and dependencies
4. Look for specific version requirements or deprecation notices

Response Structure:
{
    "content": {
        "answer": "Primary response to the question",
        "authentication": "Required auth details if applicable",
        "limitations": "Rate limits, restrictions, or prerequisites if applicable",
        "relatedEndpoints": "List of related endpoints if relevant"
    }${isCodeRequest ? `,
    "code": {
        "curl": "Complete curl example with headers and body",
        "parameters": "Explanation of each parameter used",
        "response": "Example response format"
    }` : ""}
}`;

        const payloadTemplate = `
Context: Analyze the following API documentation to answer this question: "${question}"

Documentation to analyze:
${JSON.stringify(concatenatedData, null, 2)}

Response Requirements:
1. Search thoroughly through ALL documentation sections
2. Verify compatibility and version requirements
3. Include all necessary authentication details
4. ${isCodeRequest ? 'Provide complete, tested code examples' : 'Focus on functional explanation'}
5. Mention any relevant rate limits or restrictions
6. Reference related endpoints or features that may be helpful

Format your response as a valid JSON object following the structure defined above.`;

        const response = await model.generateContent([role, payloadTemplate]);

        if (!response || !response.response?.text()) {
            throw new Error("Invalid response from LLM");
        }

        return response.response.text();
    } catch (e) {
        console.error("Error in llmCall:", e);
        return null;
    }
}