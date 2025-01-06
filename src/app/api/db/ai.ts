import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI!)
const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash'
})

export async function generateEmbedding(summary: string) {
    const model = genAI.getGenerativeModel({
        model: "text-embedding-004"
    })
    const res = await model.embedContent(summary)
    const embedding = res.embedding;
    return embedding.values
}

