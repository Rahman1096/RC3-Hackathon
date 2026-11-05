"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { embedText, sourceHash } from "@/lib/gemini";
import { extractJobRequirements } from "@/lib/talent-ai";

const jobSchema = z.object({ title: z.string().trim().min(2).max(120), department: z.string().trim().min(2).max(80), location: z.string().trim().min(2).max(120), employmentType: z.string().trim().min(2).max(50), salary: z.string().trim().max(80), description: z.string().trim().min(20).max(10000), requiredSkills: z.string().max(1000), preferredSkills: z.string().max(1000), skillImportance: z.string().max(2000), experience: z.string().trim().max(300), qualifications: z.string().trim().max(1000) });
const skills = (value: string) => JSON.stringify(value.split(",").map((item) => item.trim()).filter(Boolean));
const importance = (value: string) => { try { return JSON.stringify(JSON.parse(value || "{}")); } catch { return "{}"; } };

function readJob(formData: FormData) {
  const parsed = jobSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Invalid job details.");
  const data = parsed.data;
  return { ...data, requiredSkills: skills(data.requiredSkills), preferredSkills: skills(data.preferredSkills), skillImportance: importance(data.skillImportance), salary: data.salary || null, experience: data.experience || null, qualifications: data.qualifications || null };
}

export async function createJobAction(formData: FormData) {
  const user = await requireRole("RECRUITER");
  const job = await prisma.job.create({ data: { ...readJob(formData), recruiterId: user.id } });
  await refreshJobAi(job.id, job.description, null);
  redirect(`/recruiter/jobs/${job.id}/edit`);
}

export async function updateJobAction(jobId: string, formData: FormData) {
  const user = await requireRole("RECRUITER");
  const job = await prisma.job.findFirst({ where: { id: jobId, recruiterId: user.id } });
  if (!job) redirect("/recruiter");
  const data = readJob(formData); await prisma.job.update({ where: { id: jobId }, data });
  await refreshJobAi(jobId, data.description, job.aiSourceHash);
  revalidatePath("/recruiter"); revalidatePath(`/recruiter/jobs/${jobId}/edit`); revalidatePath("/jobs");
}

async function refreshJobAi(jobId: string, description: string, previousHash: string | null) {
  if (!process.env.GEMINI_API_KEY) return;
  const hash = sourceHash(description); if (hash === previousHash) return;
  try { const [requirements, embedding] = await Promise.all([extractJobRequirements(description), embedText(description)]); await prisma.job.update({ where: { id: jobId }, data: { aiRequirements: JSON.stringify(requirements), aiSourceHash: hash, embedding: JSON.stringify(embedding), embeddingSourceHash: hash } }); }
  catch (error) { await prisma.job.update({ where: { id: jobId }, data: { aiRequirements: JSON.stringify({ status: "unavailable", message: error instanceof Error ? error.message : "Gemini extraction failed." }) } }); }
}

export async function toggleJobStatusAction(jobId: string) {
  const user = await requireRole("RECRUITER");
  const job = await prisma.job.findFirst({ where: { id: jobId, recruiterId: user.id } });
  if (!job) redirect("/recruiter");
  await prisma.job.update({ where: { id: job.id }, data: { status: job.status === "OPEN" ? "CLOSED" : "OPEN" } });
  revalidatePath("/recruiter"); revalidatePath("/jobs");
}
