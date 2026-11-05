import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { resumeDataSchema } from "@/lib/resume";
import { addRecruiterNoteAction, correctSkillsAction, runAssessmentAction, setApplicationStatusAction } from "@/app/actions/recruiter";
import { SubmitButton } from "@/app/components/submit-button";

const statuses = ["SUBMITTED", "PARSED", "ASSESSMENT_READY", "RECRUITER_REVIEW", "SHORTLISTED", "REJECTED", "INTERVIEW", "SELECTED"] as const;
const displayScore = (score: number | null | undefined) => score === null || score === undefined ? "Not assessed" : `${Math.round(score)}%`;

export default async function ApplicantsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string; updated?: string; compareA?: string; compareB?: string }> }) {
  const recruiter = await requireRole("RECRUITER");
  const { id } = await params;
  const { status, updated, compareA, compareB } = await searchParams;
  const statusFilter = statuses.find((value) => value === status);
  const job = await prisma.job.findFirst({
    where: { id, recruiterId: recruiter.id },
    include: { applications: { where: statusFilter ? { status: statusFilter } : undefined, include: { candidate: { select: { name: true } }, resume: true, assessment: true, notes: { orderBy: { createdAt: "desc" }, take: 3 }, audits: { orderBy: { createdAt: "desc" }, take: 4 } } } },
  });
  if (!job) notFound();
  const applications = [...job.applications].sort((left, right) => (right.assessment?.score ?? -1) - (left.assessment?.score ?? -1));
  const compared = applications.filter((application) => application.id === compareA || application.id === compareB);
  const comparisonRows = compared.map((application) => {
    const data = resumeDataSchema.parse(JSON.parse(application.resume.extractedData));
    return { application, data };
  });

  return <main className="mx-auto max-w-6xl px-6 py-10">
    <p className="text-sm font-semibold text-cyan-300">RECRUITER REVIEW · HUMAN DECISIONS REQUIRED</p>
    <h1 className="mt-1 text-3xl font-bold">{job.title}</h1>
    {updated === "1" && <p role="status" aria-live="polite" className="mt-4 rounded border border-emerald-700 bg-emerald-950 p-3 text-sm text-emerald-100">Application status updated successfully.</p>}
    <p className="mt-2 text-sm text-slate-400">Score = skills 50% + experience 25% + projects 15% + qualifications 10%; skill importance adjusts the skills component.</p>
    <form className="mt-5 flex items-center gap-2"><label className="text-sm text-slate-300">Filter status <select name="status" defaultValue={statusFilter || ""} className="ml-2 rounded bg-slate-800 p-2"><option value="">All applicants</option>{statuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label><button className="rounded border border-slate-700 px-3 py-2 text-sm">Filter</button></form>
    <form method="get" className="mt-5 grid gap-3 rounded-xl border border-cyan-900 bg-slate-900 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <label className="text-sm text-slate-300">First candidate<select name="compareA" defaultValue={compareA || ""} className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2"><option value="">Choose candidate</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.candidate.name}</option>)}</select></label>
      <label className="text-sm text-slate-300">Second candidate<select name="compareB" defaultValue={compareB || ""} className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2"><option value="">Choose candidate</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.candidate.name}</option>)}</select></label>
      <button className="rounded bg-cyan-400 px-4 py-2 font-bold text-slate-950 hover:bg-cyan-300">Compare candidates</button>
    </form>
    {comparisonRows.length > 0 && comparisonRows.length < 2 && <p className="mt-3 text-sm text-amber-200">Choose two different candidates to compare their evidence side by side.</p>}
    {comparisonRows.length === 2 && <section className="mt-6 overflow-hidden rounded-xl border border-cyan-800 bg-slate-900">
      <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Candidate comparison</h2><p className="mt-1 text-sm text-slate-400">Compare job-related evidence only. Final decisions remain with the recruiter.</p></div>
      <div className="grid md:grid-cols-2">{comparisonRows.map(({ application, data }) => {
        const assessment = application.assessment;
        return <article key={application.id} className="border-b border-slate-800 p-5 last:border-0 md:border-b-0 md:border-r md:last:border-r-0">
          <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{data.name || application.candidate.name}</h3><p className="text-sm text-slate-400">{application.status.replaceAll("_", " ")}</p></div><span className="rounded bg-cyan-950 px-2 py-1 text-sm font-bold text-cyan-200">{displayScore(assessment?.score)}</span></div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-400">Skills</dt><dd className="font-semibold">{displayScore(assessment?.skillScore)}</dd></div><div><dt className="text-slate-400">Experience</dt><dd className="font-semibold">{displayScore(assessment?.experienceScore)}</dd></div><div><dt className="text-slate-400">Projects</dt><dd className="font-semibold">{displayScore(assessment?.projectScore)}</dd></div><div><dt className="text-slate-400">Qualifications</dt><dd className="font-semibold">{displayScore(assessment?.qualificationScore)}</dd></div></dl>
          <h4 className="mt-5 text-sm font-semibold">Matched skills</h4><p className="mt-1 text-sm text-emerald-300">{assessment ? JSON.parse(assessment.matchedSkills).join(", ") || "None" : "Assessment not run"}</p>
          <h4 className="mt-4 text-sm font-semibold">Missing evidence</h4><p className="mt-1 text-sm text-amber-200">{assessment ? JSON.parse(assessment.missingEvidence).join("; ") || "None" : "Assessment not run"}</p>
          <h4 className="mt-4 text-sm font-semibold">Supporting excerpts</h4>{assessment ? JSON.parse(assessment.evidence).slice(0, 3).map((excerpt: string) => <blockquote key={excerpt} className="mt-2 border-l-2 border-cyan-500 pl-3 text-xs text-slate-300">{excerpt}</blockquote>) : <p className="mt-1 text-sm text-slate-400">Run an assessment to collect evidence.</p>}
          <Link href={`/recruiter/applications/${application.id}/interview`} className="mt-5 inline-block rounded border border-violet-700 px-3 py-2 text-sm text-violet-100 hover:border-violet-500">Open interview plan</Link>
        </article>;
      })}</div>
    </section>}
    <div className="mt-7 grid gap-5">{applications.map((application) => {
      const data = resumeDataSchema.parse(JSON.parse(application.resume.extractedData));
      const assessment = application.assessment;
      return <article key={application.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">{data.name || application.candidate.name}</h2><p className="text-sm text-slate-400">{application.status.replaceAll("_", " ")} · relevance {assessment?.score ?? "not assessed"}</p></div>
          <div className="flex flex-wrap gap-2"><form action={runAssessmentAction.bind(null, application.id)}><SubmitButton label="Run / retry assessment" pendingLabel="Assessing…" className="rounded bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300" /></form><Link href={`/recruiter/applications/${application.id}/interview`} className="rounded border border-violet-700 px-3 py-2 text-sm text-violet-100">Interview plan</Link><form action={setApplicationStatusAction.bind(null, application.id, "RECRUITER_REVIEW")}><SubmitButton label="Advance to review" pendingLabel="Advancing…" className="rounded border border-slate-700 px-3 py-2 text-sm hover:border-slate-500" /></form><form action={setApplicationStatusAction.bind(null, application.id, "SHORTLISTED")}><SubmitButton label="Shortlist" pendingLabel="Shortlisting…" className="rounded border border-emerald-700 px-3 py-2 text-sm hover:border-emerald-500" /></form><form action={setApplicationStatusAction.bind(null, application.id, "REJECTED")}><SubmitButton label="Reject" pendingLabel="Rejecting…" confirmMessage="Reject this application?" className="rounded border border-red-800 px-3 py-2 text-sm hover:border-red-600" /></form></div>
        </div>
        {assessment?.error && <p className="mt-3 rounded bg-amber-950 p-3 text-sm text-amber-100">AI explanation or matching needs retry: {assessment.error}</p>}
        {assessment && assessment.score !== null && <><div className="mt-4 grid gap-3 text-sm md:grid-cols-5"><p>Skills <b>{assessment.skillScore}%</b></p><p>Experience <b>{assessment.experienceScore}%</b></p><p>Projects <b>{assessment.projectScore}%</b></p><p>Qualifications <b>{assessment.qualificationScore}%</b></p><p>Semantic <b>{assessment.semanticScore}%</b></p></div><p className="mt-3 text-sm">Matched: {JSON.parse(assessment.matchedSkills).join(", ") || "None"}</p><p className="mt-2 text-sm text-amber-200">Missing evidence (not confirmed absence): {JSON.parse(assessment.missingEvidence).join("; ") || "None"}</p>{JSON.parse(assessment.evidence).map((excerpt: string) => <blockquote key={excerpt} className="mt-2 border-l-2 border-cyan-500 pl-3 text-xs text-slate-300">{excerpt}</blockquote>)}<p className="mt-3 text-sm text-slate-300">{assessment.explanation}</p></>}
        <form action={correctSkillsAction.bind(null, application.id)} className="mt-4 flex gap-2"><input name="skills" defaultValue={data.skills.map((skill) => skill.value).join(", ")} className="flex-1 rounded bg-slate-800 p-2 text-sm" /><SubmitButton label="Correct skills · invalidate" pendingLabel="Saving skills…" className="rounded border border-slate-700 px-3 text-sm hover:border-slate-500" /></form>
        <form action={addRecruiterNoteAction.bind(null, application.id)} className="mt-3 flex gap-2"><input required name="content" placeholder="Private recruiter note" className="flex-1 rounded bg-slate-800 p-2 text-sm" /><SubmitButton label="Add note" pendingLabel="Adding…" className="rounded border border-slate-700 px-3 text-sm hover:border-slate-500" /></form>
        {application.notes.map((note) => <p key={note.id} className="mt-2 text-xs text-slate-400">Private note · {note.content}</p>)}
        <p className="mt-3 text-xs text-slate-500">Audit: {application.audits.map((audit) => `${audit.createdAt.toLocaleString()} ${audit.detail || audit.action}`).join(" | ")}</p>
      </article>;
    })}{!applications.length && <p className="text-slate-400">No applicants match this filter.</p>}</div>
  </main>;
}
