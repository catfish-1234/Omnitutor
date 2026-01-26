import { useState, useCallback } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { Subject, Message, Role } from '../types';

interface UseAIReturn {
    sendMessage: (text: string, subject: Subject, previousMessages: Message[], attachment?: { content: string, type: 'image' | 'text', mimeType?: string }) => Promise<string>;
    isLoading: boolean;
    error: string | null;
    statusMessage: string | null;
}

export const useAI = (): UseAIReturn => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const sendMessage = useCallback(async (text: string, subject: Subject, previousMessages: Message[], attachment?: { content: string, type: 'image' | 'text', mimeType?: string }) => {
        setIsLoading(true);
        setError(null);
        setStatusMessage(null);

        // Common System Instruction
        let systemInstruction = `You are an expert ${subject} tutor. If the user asks for a comparison or list, ALWAYS format the output as a Markdown Table.`;
        if ([Subject.MATH, Subject.PHYSICS, Subject.CHEMISTRY].includes(subject)) {
            systemInstruction += ` Use LaTeX for all math equations. Wrap block equations in $$ and inline in $. Provide clear, step-by-step explanations.`;
        }

        // --- TRAFFIC ROUTER LOGIC ---
        // IF image attachment -> Gemini (Vision)
        // IF text only -> Groq (Llama 3) -> Fallback to Gemini

        const hasImage = attachment?.type === 'image';

        if (hasImage) {
            // --- ROUTE: GEMINI VISION ---
            console.log("Image detected, routing to Gemini Vision");
            setStatusMessage("Analyzing image...");

            try {
                const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
                if (!geminiApiKey) throw new Error("Gemini API Key missing");

                const genAI = new GoogleGenerativeAI(geminiApiKey);

                // Construct History with text-only parts for simplicity in this demo, 
                // or proper structures if needed. OpenAI/Gemini SDKs differ in history format.
                // For this implementation, we'll send the prompt + image as a single turn generated content
                // because typically history doesn't persist images well in these lightweight demos without storage.

                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction });

                // Construct parts
                const promptParts: any[] = [{ text }];
                if (attachment && attachment.content) {
                    // Extract base64 without prefix if present, though usually handled by file reader
                    const base64Data = attachment.content.split(',')[1] || attachment.content;
                    promptParts.push({
                        inlineData: {
                            data: base64Data,
                            mimeType: attachment.mimeType || "image/jpeg"
                        }
                    });
                }

                const result = await model.generateContent(promptParts);
                const response = result.response.text();
                return response;

            } catch (visionError: any) {
                console.error("Gemini Vision failed", visionError);
                setError(visionError.message || "Failed to analyze image.");
                throw visionError;
            }

        } else {
            // --- ROUTE: GROQ (Text) ---
            try {
                const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
                if (!groqApiKey) throw new Error("Groq API Key missing");

                const groq = new Groq({ apiKey: groqApiKey, dangerouslyAllowBrowser: true });

                // Appending text attachment content to prompt if it's code/text file
                let finalPrompt = text;
                if (attachment?.type === 'text') {
                    finalPrompt += `\n\n[Attached File Content]:\n${attachment.content}`;
                }

                // Transform history for Groq
                const messages: any[] = [
                    { role: "system", content: systemInstruction },
                    ...previousMessages.map(msg => ({
                        role: msg.role === Role.USER ? "user" : "assistant",
                        content: msg.content + (msg.attachment?.type === 'text' ? `\n[File]: ${msg.attachment.content}` : '') // simplified context
                    })),
                    { role: "user", content: finalPrompt }
                ];

                const completion = await groq.chat.completions.create({
                    messages: messages,
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.7,
                    max_tokens: 1024,
                });

                const response = completion.choices[0]?.message?.content;
                if (!response) throw new Error("Empty response from Groq");

                return response;

            } catch (groqError: any) {
                console.warn("Groq Limit/Error hit, switching to Gemini Fallback...", groqError);
                setStatusMessage("Traffic high. Switching to backup AI...");

                // --- FALLBACK: GEMINI FLASH (Text) ---
                let attempt = 0;
                const maxRetries = 1;

                try {
                    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
                    if (!geminiApiKey) throw new Error("Gemini API Key missing");

                    const genAI = new GoogleGenerativeAI(geminiApiKey);

                    // Simple text history mapping
                    const geminiHistory = previousMessages.map(msg => ({
                        role: msg.role === Role.USER ? 'user' : 'model',
                        parts: [{ text: msg.content }]
                    }));

                    const model = genAI.getGenerativeModel({
                        model: "gemini-1.5-flash", // Updated to 1.5 Flash as requested
                        systemInstruction: systemInstruction,
                    });

                    const chat = model.startChat({
                        history: geminiHistory,
                        generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
                    });

                    while (attempt <= maxRetries) {
                        try {
                            const result = await chat.sendMessage(text + (attachment?.type === 'text' ? `\n\nFile Content:\n${attachment.content}` : ''));
                            return result.response.text();
                        } catch (geminiErr: any) {
                            const is429 = geminiErr.message?.includes('429') || geminiErr.status === 429;
                            if (is429 && attempt < maxRetries) {
                                setStatusMessage("Server busy. Retrying backup connection...");
                                await new Promise(resolve => setTimeout(resolve, 3000));
                                attempt++;
                                continue;
                            } else {
                                throw geminiErr;
                            }
                        }
                    }
                    throw new Error("Max retries exceeded on fallback.");

                } catch (finalError: any) {
                    console.error("All AI services failed.", finalError);
                    setError(finalError.message || "All AI services are currently busy.");
                    throw finalError;
                }
            }
        }
    }, []);

    return { sendMessage, isLoading, error, statusMessage };
};
