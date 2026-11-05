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
  const application = await prisma.application.findFirst({ where: { id: applicationId, job: { recruiterId: recruiter.id } }, include: { job: true, resume: true, assessment: true } });
  if (!application) redirect("/recruiter");
  return { recruiter, application };
}
const refresh = (jobId: string, candidateId?: string) => { revalidatePath("/recruiter"); revalidatePath(`/recruiter/jobs/${jobId}/applicants`); if (candidateId) revalidatePath("/applications"); };

export async function generateQuestionsAction(applicationId: string) {
  const { recruiter, application } = await ownedApplication(applicationId);
  const evidence = application.assessment ? JSON.parse(application.assessment.evidence) as string[] : [];
  if (!evidence.length) throw new Error("Run an evidence-based assessment before generating questions.");
  const hash = sourceHash(`${application.job.description}:${evidence.join("\n")}`);
  const questions = await generateInterviewQuestions(`${application.job.title}\n${application.job.description}`, evidence.join("\n"));
  await prisma.$transaction([prisma.interviewQuestion.deleteMany({ where: { applicationId } }), ...questions.map((question) => prisma.interviewQuestion.create({ data: { applicationId, question: question.question, difficulty: question.difficulty, guideline: question.guideline, evidence: question.evidence && evidence.some((item) => item.includes(question.evidence!)) ? question.evidence : null, sourceHash: hash } })), prisma.auditEvent.create({ data: { applicationId, actorId: recruiter.id, action: "QUESTIONS_GENERATED", detail: "Evidence-grounded interview questions generated." } })]);
  refresh(application.jobId);
}
export async function updateQuestionAction(questionId: string, formData: FormData) { const recruiter = await requireRole("RECRUITER"); const question = await prisma.interviewQuestion.findFirst({ where: { id: questionId, application: { job: { recruiterId: recruiter.id } }, include: { application: true } }); if (!question) redirect("/recruiter"); const parsed = z.object({ question: z.string().trim().min(5).max(1000), guideline: z.string().trim().min(5).max(2000), difficulty: z.enum(["beginner", "intermediate", "advanced"]) }).parse(Object.fromEntries(formData)); await prisma.interviewQuestion.update({ where: { id: questionId }, data: parsed }); refresh(question.application.jobId); }
export async function deleteQuestionAction(questionId: string) { const recruiter = await requireRole("RECRUITER"); const question = await prisma.interviewQuestion.findFirst({ where: { id: questionId, application: { job: { recruiterId: recruiter.id } }, include: { application: true } }); if (!question) redirect("/recruiter"); await prisma.interviewQuestion.delete({ where: { id: questionId } }); refresh(question.application.jobId); }

const scheduleSchema = z.object({ scheduledAt: z.string().min(16).max(40), timezone: z.string().min(2).max(80), durationMinutes: z.coerce.number().int().min(15).max(240), interviewType: z.string().trim().min(2).max(80) });
export async function scheduleInterviewAction(applicationId: string, formData: FormData) {
  const { recruiter, application } = await ownedApplication(applicationId); const parsed = scheduleSchema.parse(Object.fromEntries(formData)); const start = new Date(parsed.scheduledAt); if (Number.isNaN(start.getTime())) throw new Error("Invalid interview date and time."); const end = new Date(start.getTime() + parsed.durationMinutes * 60000);
  const candidateConflicts = await prisma.interview.findMany({ where: { application: { candidateId: application.candidateId }, scheduledAt: { gte: new Date(start.getTime() - 240 * 60000), lte: end } } });
  const interviewerConflicts = await prisma.interview.findMany({ where: { interviewerId: recruiter.id, scheduledAt: { gte: new Date(start.getTime() - 240 * 60000), lte: end } } });
  const overlaps = [...candidateConflicts, ...interviewerConflicts].some((item) => { const itemEnd = item.scheduledAt.getTime() + item.durationMinutes * 60000; return item.scheduledAt < end && itemEnd > start; });
  if (overlaps) redirect(`/recruiter/jobs/${application.jobId}/applicants?error=Scheduling+conflict+detected`);
  await prisma.$transaction([prisma.interview.create({ data: { jobId: application.jobId, applicationId, interviewerId: recruiter.id, scheduledAt: start, timezone: parsed.timezone, durationMinutes: parsed.durationMinutes, interviewType: parsed.interviewType } }), prisma.application.update({ where: { id: applicationId }, data: { status: "INTERVIEW" } }), prisma.auditEvent.create({ data: { applicationId, actorId: recruiter.id, action: "STATUS_CHANGED", detail: `Status: ${application.status} -> INTERVIEW; simulated notification queued.` } })]);
  refresh(application.jobId, application.candidateId);
}
export async function saveFeedbackAction(interviewId: string, formData: FormData) { const recruiter = await requireRole("RECRUITER"); const interview = await prisma.interview.findFirst({ where: { id: interviewId, job: { recruiterId: recruiter.id }, include: { application: true } }); if (!interview) redirect("/recruiter"); const feedback = z.object({ rating: z.coerce.number().int().min(1).max(5), strengths: z.string().max(2000), concerns: z.string().max(2000), notes: z.string().max(3000), decision: z.enum(["PENDING", "SELECTED", "REJECTED"]) }).parse(Object.fromEntries(formData)); const newStatus = feedback.decision === "SELECTED" ? "SELECTED" : feedback.decision === "REJECTED" ? "REJECTED" : "INTERVIEW"; await prisma.$transaction([prisma.interview.update({ where: { id: interviewId }, data: { feedback: JSON.stringify(feedback), decision: feedback.decision } }), ...(interview.applicationId ? [prisma.application.update({ where: { id: interview.applicationId }, data: { status: newStatus } }), prisma.auditEvent.create({ data: { applicationId: interview.applicationId, actorId: recruiter.id, action: "STATUS_CHANGED", detail: `Status updated to ${newStatus} after private feedback.` } })] : [])]); refresh(interview.jobId, interview.application?.candidateId); }
