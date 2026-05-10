import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function getTextModel() {
  return genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  });
}

const AI_TIMEOUT_MS = 15_000;

export async function generateText(prompt: string): Promise<string> {
  const model = getTextModel();
  const result = await Promise.race([
    model.generateContent(prompt),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI request timeout")), AI_TIMEOUT_MS)
    ),
  ]);
  return result.response.text();
}
