import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding } from "../db/ai";
import { pc } from "../db/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { validateApiResponse } from "../actions/action";
import { RecordMetadata, ScoredPineconeRecord } from "@pinecone-database/pinecone";

declare module "@pinecone-database/pinecone" {
    interface ScoredPineconeRecord<T> {
        metadata?: T;
    }
}

export const indexName = process.env.INDEX_NAME!;
export const INDEX_HOST = process.env.INDEX_HOST!;  
const index = pc.index(indexName, INDEX_HOST);

export async function POST(req: NextRequest, res: NextResponse) {
    try {
        const body = await req.json();
        const { question, prev } = body;
        if (!question) {
            return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
        }

        const queryVector = await generateEmbedding(question);

        const results = await queryPinecone(queryVector);


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
            topK: 2,
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
) {
    try {
        let concatenatedData: string[] = [];
        for (let i = 0; i < data.length; i++) {
            if (Array.isArray(data[i]?.metadata?.data)) {
                concatenatedData = concatenatedData.concat(data[i]?.metadata?.data as string[]);
            }
        }

        const isCodeRequest = question.toLowerCase().match(
            /(code|example|curl|api|endpoint|reference|how to use|implementation|snippet)/
        );

        const role = `
  You are an API documentation assistant being very polite. You'll be provided with API documentation and must generate helpful responses.
  
  Your responses must follow this JSON structure:
  {
      "content": "Clear explanation of the relevant information",
      ${isCodeRequest ? `"code": "Complete curl command example with all necessary headers and data"` : ""}
  }
  
  Key guidelines:
  - Only include code examples when specifically asked about implementation or when showing the API usage is necessary
  - Keep explanations clear and concise
  - Focus on answering the exact question asked
  - Don't include code snippets for general questions about functionality`;

        const payloadTemplate = `
  Given the following API documentation and question: "${question}", generate a helpful response that:
  1. Addresses the specific question asked
  2. ${isCodeRequest ? 'Provides a complete curl example if relevant' : 'Focuses on explaining the functionality'}
  3. Mentions authentication requirements if relevant
  
  Format the response as a JSON object following this structure:
  {
      "content": "Brief and clear explanation",
      ${isCodeRequest ? `"code": "Curl command example if relevant to the question"` : ""}
  }
  
  API Documentation:
  ${JSON.stringify(concatenatedData, null, 2)}
  
  Requirements:
  - Keep the content explanation clear and concise
  - Only include code if specifically asked or absolutely necessary
  - Always mention authentication requirements when relevant
  - Format the response as a valid JSON object`;

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
