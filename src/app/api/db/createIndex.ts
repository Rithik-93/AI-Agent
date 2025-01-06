// // Install Pinecone SDK via npm: npm install @pinecone-database/pinecone
// import { Pinecone } from '@pinecone-database/pinecone';

// async function createIndex() {
//     const apiKey = 'YOUR_API_KEY';
//     const pc = new Pinecone();

//     await pc.init({
//         apiKey: apiKey,
//         environment: 'us-east-1', // Replace with your environment if different
//     });

//     const indexName = "example-index";

//     try {
//         const indexModel = await pc.createIndex({
//             name: indexName,
//             dimension: 768,  // Replace with the appropriate dimension of the embedding model
//             metric: 'cosine', // Default similarity metric; change if necessary
//             metadataConfig: {
//                 indexed: ['chunk_text'], // Fields to be indexed
//             },
//         });

//         console.log(indexModel);
//     } catch (error) {
//         console.error('Error creating index:', error);
//     }
// }

// createIndex();
