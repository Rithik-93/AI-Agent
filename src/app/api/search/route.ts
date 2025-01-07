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
        console.log(results[0]?.score);

        if (!results.length) {
            return NextResponse.json({ content: defaultPrompt }, { status: 200 });
        }
        if ( results[0]?.score !== undefined && results[0]?.score < 0.55) {
            return NextResponse.json({ content: defaultPrompt }, { status: 200 });
        }

        const llmResponse = await llmCall(results, question);

        const response = parseLLMResponse(llmResponse || "");

        const content = response.content;
        const api = response.API;
        const code = response.code;
        if ( !api || !code) {
            return NextResponse.json({ content }, { status: 201 });
        }
        // let res;
        // if (response) {
        //     res = await validateApiResponse(response);
        // }

        return NextResponse.json({ content, code }, { status: 200 });
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
            includeMetadata: true,

            // filter: {
            //     threshold: 0.4
            // },

        });
        return queryResponse.matches;
    } catch (error) {
        console.error('Error querying Pinecone:', error);
        throw new Error(`Pinecone query failed: ${error}`);
    }
}
const defaultPrompt = `Hey there!👋 \n Hmm, I couldn’t find anything that matches your request super well. Maybe try rephrasing or giving me a bit more detail? I’ll do my best to help you out! 😊`

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

        const isCodeRequest: boolean = /(code|example|curl|api|endpoint|reference|how to use|implementation|implement|snippet)/.test(question.toLowerCase());
        console.log(isCodeRequest, "asdasd");

        const role = `
You are a specialized API documentation assistant. Your purpose is to provide accurate, detailed responses based on the provided API documentation.

Analysis Requirements:
1. Thoroughly examine ALL provided documentation sections
2. Cross-reference related endpoints and features(if it exists)
3. Consider authentication, rate limits, and dependencies(if it exists)
4. Look for specific version requirements or deprecation notices(if it exists)

Response Structure:
{
    "content":  "Primary response to the question"(not more than 80 words),${isCodeRequest ? `,
    "API": "The api that user asked for. e.g. "https://api.crustdata.com/screener/company"",    
    "code": {
        "curl": "Complete code api call(curl or python) example with headers and body",
        "example": "Example curl code of the api call with headers and body and whatever is needed for that api call",
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

interface LLMResponse {
    content: string;
    [key: string]: any;
}

class ParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ParseError';
    }
}

export function parseLLMResponse(responseText: string): LLMResponse {
    const jsonPattern = /```json\n([\s\S]*?)\n```/;
    const match = responseText.match(jsonPattern);

    if (!match) {
        throw new ParseError('No JSON code block found in response');
    }

    const jsonStr = match[1];

    try {
        const parsed = JSON.parse(jsonStr);
        return parsed as LLMResponse;
    } catch (error) {
        throw new ParseError(`Failed to parse JSON content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

