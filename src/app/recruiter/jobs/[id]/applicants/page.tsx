import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { resumeDataSchema } from "@/lib/resume";
import { addRecruiterNoteAction, correctSkillsAction, runAssessmentAction, setApplicationStatusAction } from "@/app/actions/recruiter";

const statuses = ["SUBMITTED", "PARSED", "ASSESSMENT_READY", "RECRUITER_REVIEW", "SHORTLISTED", "REJECTED", "INTERVIEW", "SELECTED"] as const;

export default async function ApplicantsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string }> }) {
  const recruiter = await requireRole("RECRUITER");
  const { id } = await params;
  const { status } = await searchParams;
  const statusFilter = statuses.find((value) => value === status);
  const job = await prisma.job.findFirst({
    where: { id, recruiterId: recruiter.id },
    include: { applications: { where: statusFilter ? { status: statusFilter } : undefined, include: { candidate: { select: { name: true } }, resume: true, assessment: true, notes: { orderBy: { createdAt: "desc" }, take: 3 }, audits: { orderBy: { createdAt: "desc" }, take: 4 } } } },
  });
  if (!job) notFound();
  const applications = [...job.applications].sort((left, right) => (right.assessment?.score ?? -1) - (left.assessment?.score ?? -1));

  return <main className="mx-auto max-w-6xl px-6 py-10">
    <p className="text-sm font-semibold text-cyan-300">RECRUITER REVIEW · HUMAN DECISIONS REQUIRED</p>
    <h1 className="mt-1 text-3xl font-bold">{job.title}</h1>
    <p className="mt-2 text-sm text-slate-400">Score = skills 50% + experience 25% + projects 15% + qualifications 10%; skill importance adjusts the skills component.</p>
    <form className="mt-5 flex items-center gap-2"><label className="text-sm text-slate-300">Filter status <select name="status" defaultValue={statusFilter || ""} className="ml-2 rounded bg-slate-800 p-2"><option value="">All applicants</option>{statuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label><button className="rounded border border-slate-700 px-3 py-2 text-sm">Filter</button></form>
    <div className="mt-7 grid gap-5">{applications.map((application) => {
      const data = resumeDataSchema.parse(JSON.parse(application.resume.extractedData));
      const assessment = application.assessment;
      return <article key={application.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">{data.name || application.candidate.name}</h2><p className="text-sm text-slate-400">{application.status.replaceAll("_", " ")} · relevance {assessment?.score ?? "not assessed"}</p></div>
          <div className="flex flex-wrap gap-2"><form action={runAssessmentAction.bind(null, application.id)}><button className="rounded bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950">Run / retry assessment</button></form><Link href={`/recruiter/applications/${application.id}/interview`} className="rounded border border-violet-700 px-3 py-2 text-sm text-violet-100">Interview plan</Link><form action={setApplicationStatusAction.bind(null, application.id, "RECRUITER_REVIEW")}><button className="rounded border border-slate-700 px-3 py-2 text-sm">Advance to review</button></form><form action={setApplicationStatusAction.bind(null, application.id, "SHORTLISTED")}><button className="rounded border border-emerald-700 px-3 py-2 text-sm">Shortlist</button></form><form action={setApplicationStatusAction.bind(null, application.id, "REJECTED")}><button className="rounded border border-red-800 px-3 py-2 text-sm">Reject</button></form></div>
        </div>
        {assessment?.error && <p className="mt-3 rounded bg-amber-950 p-3 text-sm text-amber-100">AI explanation or matching needs retry: {assessment.error}</p>}
        {assessment && assessment.score !== null && <><div className="mt-4 grid gap-3 text-sm md:grid-cols-5"><p>Skills <b>{assessment.skillScore}%</b></p><p>Experience <b>{assessment.experienceScore}%</b></p><p>Projects <b>{assessment.projectScore}%</b></p><p>Qualifications <b>{assessment.qualificationScore}%</b></p><p>Semantic <b>{assessment.semanticScore}%</b></p></div><p className="mt-3 text-sm">Matched: {JSON.parse(assessment.matchedSkills).join(", ") || "None"}</p><p className="mt-2 text-sm text-amber-200">Missing evidence (not confirmed absence): {JSON.parse(assessment.missingEvidence).join("; ") || "None"}</p>{JSON.parse(assessment.evidence).map((excerpt: string) => <blockquote key={excerpt} className="mt-2 border-l-2 border-cyan-500 pl-3 text-xs text-slate-300">{excerpt}</blockquote>)}<p className="mt-3 text-sm text-slate-300">{assessment.explanation}</p></>}
        <form action={correctSkillsAction.bind(null, application.id)} className="mt-4 flex gap-2"><input name="skills" defaultValue={data.skills.map((skill) => skill.value).join(", ")} className="flex-1 rounded bg-slate-800 p-2 text-sm" /><button className="rounded border border-slate-700 px-3 text-sm">Correct skills · invalidate</button></form>
        <form action={addRecruiterNoteAction.bind(null, application.id)} className="mt-3 flex gap-2"><input required name="content" placeholder="Private recruiter note" className="flex-1 rounded bg-slate-800 p-2 text-sm" /><button className="rounded border border-slate-700 px-3 text-sm">Add note</button></form>
        {application.notes.map((note) => <p key={note.id} className="mt-2 text-xs text-slate-400">Private note · {note.content}</p>)}
        <p className="mt-3 text-xs text-slate-500">Audit: {application.audits.map((audit) => `${audit.createdAt.toLocaleString()} ${audit.detail || audit.action}`).join(" | ")}</p>
      </article>;
    })}{!applications.length && <p className="text-slate-400">No applicants match this filter.</p>}</div>
  </main>;
}
