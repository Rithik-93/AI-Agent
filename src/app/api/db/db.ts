import { Pinecone } from '@pinecone-database/pinecone';

export const pc = new Pinecone({
  apiKey: process.env.PINECONE_API!,
});

export const indexName = "testing2";

// await pc.createIndex({
//   name: indexName,
//   dimension: 1024,
//   metric: 'cosine',
//   spec: { 
//     serverless: { 
//       cloud: 'aws', 
//       region: 'us-east-1' 
//     }
//   } 
// });

// const a = await pc.describeIndex(indexName);
// // console.log(a);