
import fs from 'fs';
import { GoogleGenerativeAI } from "@google/generative-ai";
// import * as dotenv from 'dotenv'; // Log disabled

// Manually load env since we are running node directly
const envFile = fs.readFileSync('.env.local', 'utf8');
const apiKeyMatch = envFile.match(/VITE_GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

console.log(`API Key found: ${!!apiKey}`);
console.log(`API Key length: ${apiKey ? apiKey.length : 0}`);
console.log(`API Key prefix: ${apiKey ? apiKey.substring(0, 4) : 'N/A'}`);

if (!apiKey) {
    fs.writeFileSync('debug_error.log', 'NO_API_KEY_FOUND');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
    try {
        console.log(`Testing ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello, are you there?");
        const response = await result.response;
        console.log(`${modelName} SUCCESS:`, response.text());
        return `${modelName}: SUCCESS`;
    } catch (error) {
        console.error(`${modelName} FAILED:`);
        // Log full object properties
        const errDetails = {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            errorDetails: error.errorDetails,
            stack: error.stack
        };
        return `${modelName} ERROR: ${JSON.stringify(errDetails, null, 2)}`;
    }
}


async function listModels() {
    try {
        console.log("Listing models via raw fetch...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:", data.models.map(m => m.name));
            return `Available Models: ${JSON.stringify(data.models.map(m => m.name), null, 2)}`;
        } else {
            console.error("ListModels Failed:", data);
            return `ListModels Failed: ${JSON.stringify(data, null, 2)}`;
        }
    } catch (error) {
        console.error("ListModels Request Error:", error);
        return `ListModels Request Error: ${error.message}`;
    }
}

async function run() {
    const results = [];
    results.push(await listModels());
    results.push(await testModel('gemini-1.5-flash'));

    results.push(await testModel('gemini-1.5-flash-001'));
    results.push(await testModel('gemini-pro'));

    fs.writeFileSync('debug_output.log', results.join('\n\n'));
    console.log("Done. Check debug_output.log");
}

run();
