import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AnalysisResult {
  toneScores: {
    aggressive: number;
    passiveAggressive: number;
    helpful: number;
    urgent: number;
    empathetic: number;
    professional: number;
  };
  suggestedText: string;
  explanation: string;
}

export async function analyzeTone(text: string): Promise<AnalysisResult> {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following message for emotional tone and suggest a more "nuanced", professional, and empathetic version if needed. 
    
    Message: "${text}"
    
    Return the analysis in JSON format with:
    - toneScores: An object with scores from 0 to 1 for: aggressive, passiveAggressive, helpful, urgent, empathetic, professional.
    - suggestedText: A rephrased version of the message that is clearer and more empathetic.
    - explanation: A brief explanation of why the changes were made.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          toneScores: {
            type: Type.OBJECT,
            properties: {
              aggressive: { type: Type.NUMBER },
              passiveAggressive: { type: Type.NUMBER },
              helpful: { type: Type.NUMBER },
              urgent: { type: Type.NUMBER },
              empathetic: { type: Type.NUMBER },
              professional: { type: Type.NUMBER },
            },
            required: ["aggressive", "passiveAggressive", "helpful", "urgent", "empathetic", "professional"],
          },
          suggestedText: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ["toneScores", "suggestedText", "explanation"],
      },
    },
  });

  const response = await model;
  const result = JSON.parse(response.text || "{}");
  return result as AnalysisResult;
}
