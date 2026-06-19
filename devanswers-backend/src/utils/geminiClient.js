import { GoogleGenAI } from '@google/genai';
import { createAppError } from './createAppError.js';

let ai;
export function getAI() {
    if (!ai) ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return ai;
}

export function extractJSON(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw createAppError('AI returned an unexpected response format.', 502);
    return JSON.parse(match[0]);
}
