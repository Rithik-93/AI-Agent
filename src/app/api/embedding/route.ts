import { v4 as uuid } from 'uuid';
import { NextRequest, NextResponse } from 'next/server';
import { indexName, pc } from '../db/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateEmbedding } from '../db/ai';
import { INDEX_HOST } from '../search/route';


const genAI = new GoogleGenerativeAI(process.env.GEMINI!);
const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash'
})

const index = pc.index(indexName, INDEX_HOST);
async function upsertToPinecone(data:any, embedding:any) {
    const record = {
        id: uuid(),
        values: embedding,
        metadata: { data }
    };

    try {
        await index.namespace("api_docs").upsert([record]);
        console.log('Record upserted successfully!');
    } catch (error) {
        console.error('Error upserting to Pinecone:', error);
        throw error;
    }
}

export async function POST(req: NextRequest, res: NextResponse) {
    try {
        const body = await req.json();
        const { summary } = body;

        if (!summary) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const embedding = await generateEmbedding(summary);
        await upsertToPinecone(summary, embedding);

        return NextResponse.json({ message: 'Embedding stored successfully' });
    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
