// function cleanLLMResponse(llmResponse: string) {
//     let cleaned = llmResponse.replace(/```json\n|\n```/g, '');

//     cleaned = cleaned.trim();

//     try {
//         return JSON.parse(cleaned);
//     } catch (e) {
//         console.error("Parse error:", e);
//         throw new Error("Failed to parse LLM response after cleaning");
//     }
// }

// export async function validateApiResponse(llmResponse: string) {
//     try {
//         // console.log(llmResponse, "llmResponse");

//         const parsedResponse = cleanLLMResponse(llmResponse);

//         const curlCommand = parsedResponse.code;

//         const urlMatch = curlCommand.match(/--url\s+(https:\/\/[^\s]+)/);
//         const headerMatches = curlCommand.matchAll(/--header\s+'([^']+)'/g);
//         const dataMatch = curlCommand.match(/--data\s+'([^']+)'/);

//         if (!urlMatch) throw new Error("No URL found in curl command");

//         const headers: {[key: string]: string} = {};
//         for (const match of headerMatches) {
//             const [key, value] = match[1].split(': ');
//             headers[key] = value;
//         }

//         const requestOptions = {
//             method: curlCommand.includes('--request POST') ? 'POST' : 'GET',
//             headers: headers,
//             body: dataMatch ? dataMatch[1] : undefined
//         };

//         const response = await fetch(urlMatch[1], requestOptions);

//         // Check if the response is successful
//         //   if (!response.ok) {
//         //     throw new Error(`API request failed with status ${response.status}`);
//         //   }

//         console.log(response, "asssssssssssssssssssssssssssssssssssss");

//         return {
//             isValid: true,
//             response: parsedResponse
//         };

//     } catch (error) {
//         console.error("Validation error:", error);
//         return {
//             isValid: false,
//             error: error
//         };
//     }
// }