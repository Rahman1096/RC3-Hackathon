"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { generateInterviewQuestions } from "@/lib/talent-ai";
import { sourceHash } from "@/lib/gemini";

async function ownedApplication(applicationId: string) {
  const recruiter = await requireRole("RECRUITER");
  const application = await prisma.application.findFirst({ where: { id: applicationId, job: { recruiterId: recruiter.id } }, include: { job: true, assessment: true } });
  if (!application) redirect("/recruiter");
  return { recruiter, application };
}

function refresh(jobId: string, candidateId?: string) {
  revalidatePath("/recruiter"); revalidatePath(`/recruiter/jobs/${jobId}/applicants`); revalidatePath("/recruiter/interviews");
  if (candidateId) { revalidatePath("/applications"); revalidatePath("/interviews"); }
}

function planError(applicationId: string, message: string): never {
  redirect(`/recruiter/applications/${applicationId}/interview?error=${encodeURIComponent(message)}`);
}

export async function generateQuestionsAction(applicationId: string) {
  const { recruiter, application } = await ownedApplication(applicationId);
  const evidence = application.assessment ? (JSON.parse(application.assessment.evidence) as string[]) : [];
  if (!evidence.length) planError(applicationId, "Run an evidence-based assessment before generating questions.");
  try {
    const hash = sourceHash(`${application.job.description}:${evidence.join("\n")}`);
    const questions = await generateInterviewQuestions(`${application.job.title}\n${application.job.description}`, evidence.join("\n"));
    await prisma.$transaction([
      prisma.interviewQuestion.deleteMany({ where: { applicationId } }),
      ...questions.map((question) => prisma.interviewQuestion.create({ data: { applicationId, question: question.question, difficulty: question.difficulty, guideline: question.guideline, evidence: question.evidence && evidence.some((item) => item.includes(question.evidence!)) ? question.evidence : null, sourceHash: hash } })),
      prisma.auditEvent.create({ data: { applicationId, actorId: recruiter.id, action: "QUESTIONS_GENERATED", detail: "Evidence-grounded interview questions generated." } }),
    ]);
    refresh(application.jobId);
  } catch (error) {
    console.error("Interview question generation failed", error);
    planError(applicationId, error instanceof Error ? error.message : "Question generation failed. Please retry.");
  }
}

const questionSchema = z.object({ question: z.string().trim().min(5).max(1000), guideline: z.string().trim().min(5).max(2000), difficulty: z.enum(["beginner", "intermediate", "advanced"]) });
export async function updateQuestionAction(questionId: string, formData: FormData) {
  const recruiter = await requireRole("RECRUITER"); const question = await prisma.interviewQuestion.findFirst({ where: { id: questionId, application: { job: { recruiterId: recruiter.id } } }, include: { application: true } }); if (!question) redirect("/recruiter");
  await prisma.interviewQuestion.update({ where: { id: questionId }, data: questionSchema.parse(Object.fromEntries(formData)) }); refresh(question.application.jobId);
}
export async function deleteQuestionAction(questionId: string) {
  const recruiter = await requireRole("RECRUITER"); const question = await prisma.interviewQuestion.findFirst({ where: { id: questionId, application: { job: { recruiterId: recruiter.id } } }, include: { application: true } }); if (!question) redirect("/recruiter");
  await prisma.interviewQuestion.delete({ where: { id: questionId } }); refresh(question.application.jobId);
}

const scheduleSchema = z.object({ scheduledAt: z.string().min(16).max(40), timezone: z.string().trim().min(2).max(80), durationMinutes: z.coerce.number().int().min(15).max(240), interviewType: z.string().trim().min(2).max(80) });
export async function scheduleInterviewAction(applicationId: string, formData: FormData) {
  const { recruiter, application } = await ownedApplication(applicationId); const result = scheduleSchema.safeParse(Object.fromEntries(formData)); if (!result.success) planError(applicationId, "Enter a valid date, timezone, duration, and interview type."); const parsed = result.data;
  const start = new Date(parsed.scheduledAt); if (Number.isNaN(start.getTime())) planError(applicationId, "Invalid interview date and time."); const end = new Date(start.getTime() + parsed.durationMinutes * 60000); const range = { gte: new Date(start.getTime() - 240 * 60000), lte: end };
  const candidateConflicts = await prisma.interview.findMany({ where: { application: { candidateId: application.candidateId }, scheduledAt: range } }); const interviewerConflicts = await prisma.interview.findMany({ where: { interviewerId: recruiter.id, scheduledAt: range } });
  const overlaps = [...candidateConflicts, ...interviewerConflicts].some((item) => item.scheduledAt.getTime() < end.getTime() && item.scheduledAt.getTime() + item.durationMinutes * 60000 > start.getTime());
  if (overlaps) planError(applicationId, "Scheduling conflict detected for this interviewer or candidate.");
  await prisma.$transaction([prisma.interview.create({ data: { jobId: application.jobId, applicationId, interviewerId: recruiter.id, scheduledAt: start, timezone: parsed.timezone, durationMinutes: parsed.durationMinutes, interviewType: parsed.interviewType } }), prisma.application.update({ where: { id: applicationId }, data: { status: "INTERVIEW" } }), prisma.auditEvent.create({ data: { applicationId, actorId: recruiter.id, action: "STATUS_CHANGED", detail: `Status: ${application.status} -> INTERVIEW; simulated notification queued.` } })]);
  refresh(application.jobId, application.candidateId); redirect("/recruiter/interviews");
}

const feedbackSchema = z.object({ rating: z.coerce.number().int().min(1).max(5), strengths: z.string().max(2000), concerns: z.string().max(2000), notes: z.string().max(3000), decision: z.enum(["PENDING", "SELECTED", "REJECTED"]) });
export async function saveFeedbackAction(interviewId: string, formData: FormData) {
  const recruiter = await requireRole("RECRUITER"); const interview = await prisma.interview.findFirst({ where: { id: interviewId, job: { recruiterId: recruiter.id } }, include: { application: true } }); if (!interview) redirect("/recruiter"); const feedback = feedbackSchema.parse(Object.fromEntries(formData)); const newStatus = feedback.decision === "SELECTED" ? "SELECTED" : feedback.decision === "REJECTED" ? "REJECTED" : "INTERVIEW";
  await prisma.$transaction([prisma.interview.update({ where: { id: interviewId }, data: { feedback: JSON.stringify(feedback), decision: feedback.decision } }), ...(interview.applicationId ? [prisma.application.update({ where: { id: interview.applicationId }, data: { status: newStatus } }), prisma.auditEvent.create({ data: { applicationId: interview.applicationId, actorId: recruiter.id, action: "STATUS_CHANGED", detail: `Status updated to ${newStatus} after private feedback.` } })] : [])]);
  refresh(interview.jobId, interview.application?.candidateId);
  redirect("/recruiter/interviews?success=Feedback+saved+successfully.");
}
