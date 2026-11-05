import { z } from "zod";
import { generateStructured } from "@/lib/gemini";

const evidenceItem = z.object({ value: z.string().max(500), evidence: z.string().max(700).optional() });
export const resumeDataSchema = z.object({
  name: z.string().max(120).optional(), email: z.string().email().optional(), phone: z.string().max(60).optional(), location: z.string().max(160).optional(),
  skills: z.array(evidenceItem).max(80).default([]), learningInterests: z.array(evidenceItem).max(30).default([]), education: z.array(evidenceItem).max(20).default([]), experience: z.array(evidenceItem).max(30).default([]), projects: z.array(evidenceItem).max(30).default([]),
});
export type ResumeData = z.infer<typeof resumeDataSchema>;

const aliases: Record<string, string> = { js: "JavaScript", javascript: "JavaScript", ts: "TypeScript", node: "Node.js", nodejs: "Node.js", postgres: "PostgreSQL", postgresql: "PostgreSQL", py: "Python" };
export function normalizeSkill(value: string) { const cleaned = value.trim(); return aliases[cleaned.toLowerCase()] ?? cleaned; }
export function normalizeResumeData(data: ResumeData): ResumeData { return { ...data, skills: data.skills.map((skill) => ({ ...skill, value: normalizeSkill(skill.value) })) }; }

const list = { type: "array", items: { type: "object", properties: { value: { type: "string" }, evidence: { type: "string" } }, required: ["value", "evidence"], additionalProperties: false } };
const resumeJsonSchema = { type: "object", properties: { name: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, location: { type: "string" }, skills: list, learningInterests: list, education: list, experience: list, projects: list }, required: ["skills", "learningInterests", "education", "experience", "projects"], additionalProperties: false };

function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
/** Returns the original PDF substring, allowing only whitespace differences in model output. */
export function sourceExcerpt(text: string, evidence?: string) {
  const words = evidence?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!words.length) return undefined;
  return text.match(new RegExp(words.map(escapeRegExp).join("\\s+"), "i"))?.[0];
}

export function extractionWarning(text: string, data: ResumeData) {
  const expected = [
    ["education", /\beducation\b/i, data.education.length],
    ["experience", /\b(experience|employment|work history)\b/i, data.experience.length],
    ["projects", /\bprojects?\b/i, data.projects.length],
    ["skills", /\b(skills?|technologies|technical)\b/i, data.skills.length],
  ].filter(([, marker]) => (marker as RegExp).test(text)).filter(([, , count]) => !count).map(([name]) => name);
  return expected.length ? `Extraction is incomplete: no supported ${expected.join(", ")} entries were found. Review or retry extraction.` : null;
}

export async function extractWithAi(text: string): Promise<ResumeData> {
  const extracted = normalizeResumeData(await generateStructured(`Extract only facts explicitly present in this resume. Do not infer or fabricate details.

Return ALL supported entries. Use one complete entry per degree/course, role/fellowship, and project. Each project entry must include its title and explicitly stated technologies or outcome where present.
For skills, return individual demonstrated technologies/tools/languages (for example, one item per technology), never category headings such as "Languages", "Frameworks", or "Technical Skills". Put only explicitly labelled learning interests/interests in learningInterests, not skills.
Every list item needs a short, contiguous, verbatim excerpt from the resume as evidence. Preserve degree institution, dates and CGPA when stated; preserve role organization and dates when stated.

RESUME:\n${text}`, resumeJsonSchema, resumeDataSchema));
  const supported = <T extends { evidence?: string }>(items: T[]) => items.flatMap((item) => {
    const evidence = sourceExcerpt(text, item.evidence);
    return evidence ? [{ ...item, evidence }] : [];
  });
  return {
    ...extracted,
    name: extracted.name && sourceExcerpt(text, extracted.name) ? extracted.name : undefined,
    email: extracted.email && sourceExcerpt(text, extracted.email) ? extracted.email : undefined,
    phone: extracted.phone && sourceExcerpt(text, extracted.phone) ? extracted.phone : undefined,
    location: extracted.location && sourceExcerpt(text, extracted.location) ? extracted.location : undefined,
    skills: supported(extracted.skills), learningInterests: supported(extracted.learningInterests), education: supported(extracted.education), experience: supported(extracted.experience), projects: supported(extracted.projects),
  };
}
