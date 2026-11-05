import { createHash } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const generationModel = () => process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
export const embeddingModel = () => process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
export const sourceHash = (text: string) => createHash("sha256").update(text).digest("hex");

function client() { if (!process.env.GEMINI_API_KEY) throw new Error("Gemini is unavailable because GEMINI_API_KEY is not configured."); return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); }
function retryable(error: unknown) { const text = String(error).toLowerCase(); return text.includes("429") || text.includes("resource_exhausted") || text.includes("quota") || text.includes("503") || text.includes("unavailable"); }
async function retry<T>(operation: () => Promise<T>): Promise<T> { let lastError: unknown; for (let attempt = 0; attempt < 3; attempt += 1) { try { return await operation(); } catch (error) { lastError = error; if (!retryable(error) || attempt === 2) break; await new Promise((resolve) => setTimeout(resolve, 350 * 2 ** attempt)); } } throw new Error(`${retryable(lastError) ? "Gemini quota or service limit reached after 3 attempts. Please retry shortly." : "Gemini request failed."} ${lastError instanceof Error ? lastError.message : ""}`); }

export async function generateStructured<T>(prompt: string, jsonSchema: object, schema: z.ZodType<T>): Promise<T> {
  const response = await retry(() => client().models.generateContent({ model: generationModel(), contents: prompt, config: { responseMimeType: "application/json", responseJsonSchema: jsonSchema, temperature: 0 } }));
  if (!response.text) throw new Error("Gemini returned no structured output.");
  return schema.parse(JSON.parse(response.text));
}

export async function embedText(text: string): Promise<number[]> {
  return (await embedTexts([text]))[0];
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await retry(() => client().models.embedContent({ model: embeddingModel(), contents: texts, config: { outputDimensionality: 768 } }));
  const vectors = response.embeddings?.map((embedding) => embedding.values || []);
  if (!vectors?.length || vectors.some((vector) => !vector.length)) throw new Error("Gemini returned no embedding vectors.");
  return vectors;
}

export function cosineSimilarity(left: number[], right: number[]) { if (left.length !== right.length || !left.length) return 0; let dot = 0; let a = 0; let b = 0; for (let i = 0; i < left.length; i += 1) { dot += left[i] * right[i]; a += left[i] ** 2; b += right[i] ** 2; } return a && b ? dot / (Math.sqrt(a) * Math.sqrt(b)) : 0; }
