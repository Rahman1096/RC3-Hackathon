import { z } from "zod";
import { generateStructured } from "@/lib/gemini";

const evidenceItem = z.object({ value: z.string().max(500), evidence: z.string().max(700).optional() });
export const resumeDataSchema = z.object({ name: z.string().max(120).optional(), email: z.string().email().optional(), phone: z.string().max(60).optional(), location: z.string().max(160).optional(), skills: z.array(evidenceItem).max(60).default([]), education: z.array(evidenceItem).max(20).default([]), experience: z.array(evidenceItem).max(30).default([]), projects: z.array(evidenceItem).max(30).default([]) });
export type ResumeData = z.infer<typeof resumeDataSchema>;
const aliases: Record<string, string> = { js: "JavaScript", javascript: "JavaScript", ts: "TypeScript", node: "Node.js", nodejs: "Node.js", postgres: "PostgreSQL", postgresql: "PostgreSQL", py: "Python" };
export function normalizeSkill(value: string) { const cleaned = value.trim(); return aliases[cleaned.toLowerCase()] ?? cleaned; }
export function normalizeResumeData(data: ResumeData): ResumeData { return { ...data, skills: data.skills.map((skill) => ({ ...skill, value: normalizeSkill(skill.value) })) }; }
const list = { type: "array", items: { type: "object", properties: { value: { type: "string" }, evidence: { type: "string" } }, required: ["value", "evidence"], additionalProperties: false } };
const resumeJsonSchema = { type: "object", properties: { name: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, location: { type: "string" }, skills: list, education: list, experience: list, projects: list }, required: ["skills", "education", "experience", "projects"], additionalProperties: false };
export async function extractWithAi(text: string): Promise<ResumeData> { const extracted = await generateStructured(`Extract only facts explicitly present in this resume. Every extracted item requires a short verbatim supporting excerpt. Do not infer missing data.\n\nRESUME:\n${text}`, resumeJsonSchema, resumeDataSchema); return normalizeResumeData(extracted); }
