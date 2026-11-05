"use server";

import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PDFParse } from "pdf-parse";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { extractWithAi, extractionWarning, normalizeResumeData, normalizeSkill, resumeDataSchema } from "@/lib/resume";

const MAX_BYTES = 5 * 1024 * 1024;
export async function uploadResumeAction(formData: FormData) {
  const user = await requireRole("CANDIDATE"); const file = formData.get("resume");
  if (!(file instanceof File) || !file.size) redirect("/candidate/resumes/new?error=Choose+a+non-empty+PDF");
  if (file.size > MAX_BYTES) redirect("/candidate/resumes/new?error=PDF+must+be+5MB+or+smaller");
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) redirect("/candidate/resumes/new?error=Only+PDF+files+are+accepted");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.subarray(0, 5).toString().startsWith("%PDF-")) redirect("/candidate/resumes/new?error=The+uploaded+file+is+not+a+valid+PDF");
  let text = "";
  try { const parser = new PDFParse({ data: bytes }); const result = await parser.getText(); text = result.text.trim(); await parser.destroy(); } catch { redirect("/candidate/resumes/new?error=This+PDF+could+not+be+read"); }
  if (!text) redirect("/candidate/resumes/new?error=This+PDF+has+no+extractable+text+(it+may+be+scanned)");
  const directory = path.join(process.cwd(), "data", "private-resumes", user.id); await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.pdf`; await writeFile(path.join(directory, filename), bytes);
  let extractedData = "{}"; let extractionError: string | null = null;
  try { const data = await extractWithAi(text); extractedData = JSON.stringify(data); extractionError = extractionWarning(text, data); } catch (error) { extractionError = error instanceof Error ? error.message : "AI extraction failed."; }
  const resume = await prisma.resume.create({ data: { candidateId: user.id, originalName: file.name.slice(0, 180), mimeType: "application/pdf", storagePath: path.join(user.id, filename), text, extractedData, extractionError } });
  redirect(`/candidate/resumes/${resume.id}`);
}

export async function updateResumeAction(resumeId: string, formData: FormData) {
  const user = await requireRole("CANDIDATE"); const resume = await prisma.resume.findFirst({ where: { id: resumeId, candidateId: user.id } }); if (!resume) redirect("/jobs");
  const existing = resumeDataSchema.parse(JSON.parse(resume.extractedData));
  const entries = (field: "skills" | "learningInterests" | "education" | "experience" | "projects", separator: string, normalize = (value: string) => value.trim().toLowerCase()) => String(formData.get(field) || "").split(separator).map((value) => value.trim()).filter(Boolean).map((value) => ({ value, evidence: existing[field].find((item) => normalize(item.value) === normalize(value))?.evidence }));
  const raw = { name: String(formData.get("name") || "").trim() || undefined, email: String(formData.get("email") || "").trim() || undefined, phone: String(formData.get("phone") || "").trim() || undefined, location: String(formData.get("location") || "").trim() || undefined, skills: entries("skills", ",", (value) => normalizeSkill(value).toLowerCase()), learningInterests: entries("learningInterests", "\n"), education: entries("education", "\n"), experience: entries("experience", "\n"), projects: entries("projects", "\n") };
  const data = normalizeResumeData(resumeDataSchema.parse(raw));
  const applications = await prisma.application.findMany({ where: { resumeId: resume.id }, select: { id: true, status: true } });
  await prisma.$transaction([
    prisma.resume.update({ where: { id: resume.id }, data: { extractedData: JSON.stringify(data), reviewedAt: new Date(), excerptIndex: null, excerptIndexHash: null } }),
    prisma.candidateProfile.update({ where: { userId: user.id }, data: { phone: data.phone || null, location: data.location || null, extractedSkills: JSON.stringify(data.skills.map((skill) => skill.value)) } }),
    prisma.assessment.deleteMany({ where: { applicationId: { in: applications.map((application) => application.id) } } }),
    ...applications.map((application) => prisma.auditEvent.create({ data: { applicationId: application.id, actorId: user.id, action: "ASSESSMENT_INVALIDATED", detail: `Assessment cleared after candidate profile edit; application status remains ${application.status}.` } })),
  ]);
  revalidatePath(`/candidate/resumes/${resume.id}`); revalidatePath("/jobs"); redirect(`/candidate/resumes/${resume.id}?saved=1`);
}

export async function applyToJobAction(jobId: string, formData: FormData) {
  const user = await requireRole("CANDIDATE"); const resumeId = String(formData.get("resumeId") || "");
  const [job, resume] = await Promise.all([prisma.job.findFirst({ where: { id: jobId, status: "OPEN" } }), prisma.resume.findFirst({ where: { id: resumeId, candidateId: user.id } })]);
  if (!job || !resume) redirect("/jobs?error=Choose+one+of+your+uploaded+resumes");
  try { await prisma.$transaction(async (tx) => { const application = await tx.application.create({ data: { candidateId: user.id, jobId: job.id, resumeId: resume.id } }); await tx.auditEvent.create({ data: { applicationId: application.id, actorId: user.id, action: "SUBMITTED", detail: "Candidate submitted application." } }); }); }
  catch (error) { if ((error as { code?: string }).code === "P2002") redirect("/jobs?error=You+have+already+applied+to+this+job"); throw error; }
  revalidatePath("/jobs"); revalidatePath("/applications"); redirect("/applications");
}
