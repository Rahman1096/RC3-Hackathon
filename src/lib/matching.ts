import { cosineSimilarity, embedTexts, sourceHash } from "@/lib/gemini";
import { normalizeSkill, resumeDataSchema } from "@/lib/resume";

type JobInput = { description: string; requiredSkills: string; skillImportance: string; experience: string | null; qualifications: string | null; embedding: string | null; embeddingSourceHash: string | null; skillEmbeddings: string | null; skillEmbeddingsHash: string | null };
type ResumeInput = { text: string; extractedData: string; embedding: string | null; embeddingSourceHash: string | null; excerptIndex: string | null; excerptIndexHash: string | null };
export type MatchResult = { score: number; skillScore: number; experienceScore: number; projectScore: number; qualificationScore: number; semanticScore: number; matchedSkills: string[]; missingEvidence: string[]; evidence: string[]; assessmentInput: string; excerptIndex: string; excerptIndexHash: string };
type ExcerptVector = { text: string; vector: number[] };
const parseVector = (value: string | null): number[] | null => { try { return value ? JSON.parse(value) as number[] : null; } catch { return null; } };
const parseVectors = (value: string | null): number[][] | null => { try { const parsed = value ? JSON.parse(value) as number[][] : null; return parsed?.length && parsed.every((vector) => vector.length > 0) ? parsed : null; } catch { return null; } };
const safeExcerpt = (value: string, name?: string, location?: string) => {
  const normalized = value.toLowerCase();
  if ((name && normalized.includes(name.toLowerCase())) || (location && normalized.includes(location.toLowerCase()))) return false;
  if (/\b(address|date of birth|dob|birth date|nationality|gender|marital status|religion|citizenship|age)\s*[:|-]/i.test(value)) return false;
  return !/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(value) && !/\+?[\d][\d\s().-]{7,}\d/.test(value);
};
const numericYears = (value: string) => Number(value.match(/(\d+)\s*\+?\s*years?/i)?.[1] || 0);
const asPercent = (value: number) => Math.round(value * 100);
export const weightedTotal = (scores: { skills: number; experience: number; projects: number; qualifications: number }) => scores.skills * 0.5 + scores.experience * 0.25 + scores.projects * 0.15 + scores.qualifications * 0.1;
export const verifiedEvidence = (originalText: string, candidates: string[]) => candidates.filter((excerpt) => excerpt.length > 0 && originalText.includes(excerpt));

export async function matchJobToResume(job: JobInput, resume: ResumeInput) {
  const parsed = resumeDataSchema.parse(JSON.parse(resume.extractedData));
  const verifiedItems = (items: Array<{ value: string; evidence?: string }>) => items.filter((item) => item.evidence && resume.text.includes(item.evidence));
  const verifiedSkills = verifiedItems(parsed.skills); const verifiedExperience = verifiedItems(parsed.experience); const verifiedProjects = verifiedItems(parsed.projects); const verifiedEducation = verifiedItems(parsed.education);
  const semanticProfile = [...verifiedSkills.map((item) => item.value), ...verifiedExperience.map((item) => item.value), ...verifiedProjects.map((item) => item.value), ...verifiedEducation.map((item) => item.value)].join("\n");
  if (!semanticProfile.trim()) throw new Error("Candidate profile has no reviewed skills, experience, projects, or education to assess.");
  const jobHash = sourceHash(job.description);
  const sourceChunks = resume.text.split(/\n{2,}|(?<=[.!?])\s+/).map((item) => item.trim()).filter((item) => item.length > 25 && item.length < 500 && safeExcerpt(item, parsed.name, parsed.location)).slice(0, 40);
  if (!sourceChunks.length) throw new Error("No safe resume excerpts could be retrieved for assessment.");
  const profileHash = sourceHash(sourceChunks.join("\n"));
  const required = (JSON.parse(job.requiredSkills) as string[]).map(normalizeSkill); const skillHash = sourceHash(JSON.stringify(required));
  const jobVector = job.embeddingSourceHash === jobHash ? parseVector(job.embedding) : null;
  const cachedSkills = job.skillEmbeddingsHash === skillHash ? parseVectors(job.skillEmbeddings) : null;
  const cachedChunks = resume.excerptIndexHash === profileHash ? JSON.parse(resume.excerptIndex || "[]") as ExcerptVector[] : [];
  const chunks = sourceChunks;
  const uncachedChunkText = cachedChunks.length ? [] : chunks;
  const [jobEmbeddings, chunkEmbeddings, skillEmbeddingVectors] = await Promise.all([jobVector ? Promise.resolve([jobVector]) : embedTexts([job.description]), uncachedChunkText.length ? embedTexts(uncachedChunkText) : Promise.resolve([]), cachedSkills ? Promise.resolve(cachedSkills) : required.length ? embedTexts(required) : Promise.resolve([])]);
  const resolvedJobVector = jobEmbeddings[0];
  const excerptIndex = cachedChunks.length ? cachedChunks : chunks.map((text, index) => ({ text, vector: chunkEmbeddings[index] }));
  const retrieved = excerptIndex.map((item) => ({ text: item.text, similarity: cosineSimilarity(resolvedJobVector, item.vector) })).filter((item) => safeExcerpt(item.text, parsed.name, parsed.location)).sort((a, b) => b.similarity - a.similarity).slice(0, 5);

  const skills = verifiedSkills.map((item) => normalizeSkill(item.value)); const importance = JSON.parse(job.skillImportance || "{}") as Record<string, number>;
  let totalWeight = 0; let matchedWeight = 0; const matchedSkills: string[] = []; const missingEvidence: string[] = [];
  for (let index = 0; index < required.length; index += 1) { const skill = required[index]; const rawWeight = Number(importance[skill] ?? importance[skill.toLowerCase()] ?? 1); const weight = Number.isFinite(rawWeight) && rawWeight > 0 ? rawWeight : 1; totalWeight += weight; const exact = skills.some((candidate) => candidate.toLowerCase() === skill.toLowerCase()); const semanticallySupported = excerptIndex.some((item) => cosineSimilarity(skillEmbeddingVectors[index], item.vector) >= 0.62); if (exact || semanticallySupported) { matchedWeight += weight; matchedSkills.push(skill); } else missingEvidence.push(`No resume evidence found for ${skill}; this is not confirmation that the candidate lacks it.`); }
  const skillScore = totalWeight ? matchedWeight / totalWeight : 0;
  const requiredYears = numericYears(job.experience || job.description); const candidateYears = numericYears(verifiedExperience.map((item) => item.value).join(" ")); const experienceScore = requiredYears ? Math.min(1, candidateYears / requiredYears) : verifiedExperience.length ? 0.7 : 0;
  const semanticScore = Math.max(0, ...retrieved.map((item) => item.similarity)); const projectScore = verifiedProjects.length ? Math.min(1, 0.45 + semanticScore * 0.55) : 0; const qualificationScore = job.qualifications ? (verifiedEducation.length ? 0.8 : 0) : verifiedEducation.length ? 0.7 : 0;
  const score = Math.round(weightedTotal({ skills: asPercent(skillScore), experience: asPercent(experienceScore), projects: asPercent(projectScore), qualifications: asPercent(qualificationScore) }) * 10) / 10;
  const evidence = verifiedEvidence(resume.text, retrieved.filter((item) => item.similarity > 0.15).map((item) => item.text));
  const assessmentInput = `Verified skills: ${skills.join(", ")}\nExperience: ${verifiedExperience.map((item) => item.value).join("; ")}\nProjects: ${verifiedProjects.map((item) => item.value).join("; ")}\nEducation: ${verifiedEducation.map((item) => item.value).join("; ")}\nRetrieved verbatim evidence:\n${evidence.join("\n")}`;
  return { jobEmbedding: resolvedJobVector, skillEmbeddings: skillEmbeddingVectors, skillEmbeddingsHash: skillHash, result: { score, skillScore: asPercent(skillScore), experienceScore: asPercent(experienceScore), projectScore: asPercent(projectScore), qualificationScore: asPercent(qualificationScore), semanticScore: asPercent(semanticScore), matchedSkills, missingEvidence, evidence, assessmentInput, excerptIndex: JSON.stringify(excerptIndex), excerptIndexHash: profileHash } };
}
