"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { matchJobToResume } from "@/lib/matching";
import { assessEvidence } from "@/lib/talent-ai";
import { sourceHash } from "@/lib/gemini";
import { normalizeSkill, resumeDataSchema } from "@/lib/resume";

async function owned(applicationId: string) {
  const user = await requireRole("RECRUITER");
  const application = await prisma.application.findFirst({ where: { id: applicationId, job: { recruiterId: user.id } }, include: { job: true, resume: true, assessment: true } });
  if (!application) redirect("/recruiter");
  return { user, application };
}
const refresh = (jobId: string) => { revalidatePath(`/recruiter/jobs/${jobId}/applicants`); revalidatePath("/recruiter"); };

export async function runAssessmentAction(applicationId: string) {
  const { application } = await owned(applicationId);
  const hash = sourceHash(`${application.job.description}:${application.job.requiredSkills}:${application.job.skillImportance}:${application.job.experience}:${application.job.qualifications}:${application.resume.text}:${application.resume.extractedData}`);
  if (application.assessment?.sourceHash === hash && !application.assessment.error) return;
  try {
    const { result, jobEmbedding, skillEmbeddings, skillEmbeddingsHash } = await matchJobToResume(application.job, application.resume);
    const { assessmentInput, excerptIndex, excerptIndexHash, ...stored } = result;
    let explanation: string;
    let error: string | null = null;
    try { explanation = (await assessEvidence(`${application.job.title}\n${application.job.requiredSkills}\n${application.job.experience || ""}\n${application.job.qualifications || ""}`, assessmentInput)).explanation; }
    catch (cause) { explanation = "AI explanation unavailable. Retry assessment."; error = cause instanceof Error ? cause.message : "Gemini assessment unavailable."; }
    await prisma.$transaction([
      prisma.job.update({ where: { id: application.jobId }, data: { embedding: JSON.stringify(jobEmbedding), embeddingSourceHash: sourceHash(application.job.description), skillEmbeddings: JSON.stringify(skillEmbeddings), skillEmbeddingsHash } }),
      prisma.resume.update({ where: { id: application.resumeId }, data: { excerptIndex, excerptIndexHash } }),
      prisma.assessment.upsert({ where: { applicationId }, create: { applicationId, ...stored, matchedSkills: JSON.stringify(result.matchedSkills), missingEvidence: JSON.stringify(result.missingEvidence), evidence: JSON.stringify(result.evidence), explanation, error, sourceHash: hash }, update: { ...stored, matchedSkills: JSON.stringify(result.matchedSkills), missingEvidence: JSON.stringify(result.missingEvidence), evidence: JSON.stringify(result.evidence), explanation, error, sourceHash: hash } }),
    ]);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Assessment failed.";
    await prisma.assessment.upsert({ where: { applicationId }, create: { applicationId, sourceHash: hash, error: message }, update: { sourceHash: hash, error: message } });
  }
  refresh(application.jobId);
}

export async function setApplicationStatusAction(applicationId: string, status: "RECRUITER_REVIEW" | "SHORTLISTED" | "REJECTED" | "INTERVIEW") {
  const { user, application } = await owned(applicationId);
  if (!["RECRUITER_REVIEW", "SHORTLISTED", "REJECTED", "INTERVIEW"].includes(status)) throw new Error("Invalid application status.");
  if (application.status === status) return;
  await prisma.$transaction([
    prisma.application.update({ where: { id: applicationId }, data: { status } }),
    prisma.auditEvent.create({ data: { applicationId, actorId: user.id, action: "STATUS_CHANGED", detail: `Status: ${application.status} -> ${status}` } }),
  ]);
  refresh(application.jobId);
}

export async function addRecruiterNoteAction(applicationId: string, formData: FormData) {
  const { user, application } = await owned(applicationId);
  const content = String(formData.get("content") || "").trim();
  if (content) await prisma.recruiterNote.create({ data: { applicationId, recruiterId: user.id, content: content.slice(0, 2000) } });
  refresh(application.jobId);
}

export async function correctSkillsAction(applicationId: string, formData: FormData) {
  const { user, application } = await owned(applicationId);
  const data = resumeDataSchema.parse(JSON.parse(application.resume.extractedData));
  const skills = String(formData.get("skills") || "").split(",").map((value) => value.trim()).filter(Boolean).map((value) => ({ value: normalizeSkill(value) }));
  const affected = await prisma.application.findMany({ where: { resumeId: application.resumeId }, select: { id: true, jobId: true } });
  await prisma.$transaction([
    prisma.resume.update({ where: { id: application.resumeId }, data: { extractedData: JSON.stringify({ ...data, skills }), reviewedAt: new Date(), excerptIndex: null, excerptIndexHash: null } }),
    prisma.assessment.deleteMany({ where: { applicationId: { in: affected.map((item) => item.id) } } }),
    ...affected.map((item) => prisma.auditEvent.create({ data: { applicationId: item.id, actorId: user.id, action: "ASSESSMENT_INVALIDATED", detail: "Recruiter corrected shared resume skills; assessment invalidated." } })),
  ]);
  for (const jobId of new Set(affected.map((item) => item.jobId))) refresh(jobId);
}
