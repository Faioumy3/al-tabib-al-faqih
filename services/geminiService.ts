import { GoogleGenAI } from "@google/genai";
import { Fatwa } from '../types';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Semantic Search Service
 * STRICTLY RETRIEVAL ONLY - NO GENERATION
 */
export const searchFatwaOrChat = async (
  query: string,
  currentFatwas: Fatwa[]
): Promise<{ matchId: string | null }> => {

  const modelId = 'gemini-2.5-flash';

  // We only send the semantic data (Question + Keywords + ID)
  const knowledgeMap = currentFatwas.map(f => ({
    id: f.id,
    keywords: f.medical_context, // Renamed for clarity in prompt
    question: f.question,
    title: f.title
  }));

  const systemInstruction = `
    ROLE: You are an intelligent semantic search engine for a medical-religious database.
    
    DATA:
    ${JSON.stringify(knowledgeMap)}

    TASK:
    1. Analyze the user's input (query).
    2. Find the ONE entry in the DATA that is most relevant.
    3. MATCHING RULES:
       - If the user types a medical keyword (e.g., "nose", "anesthesia", "death"), match the entry containing related concepts.
       - Fuzzy matching is allowed (e.g., "tahajol" -> "tajmeel").
       - If the query is a general greeting or unrelated, return null.
    4. Return ONLY the "id" of that entry.

    OUTPUT FORMAT:
    { "matchId": "string_or_null" }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: query,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.3 // Slightly increased for better fuzzy matching
      }
    });

    const resultText = response.text;
    if (!resultText) return { matchId: null };

    const parsed = JSON.parse(resultText);
    return { matchId: parsed.matchId };

  } catch (error) {
    console.error("Gemini Semantic Search Error:", error);
    return { matchId: null };
  }
};
