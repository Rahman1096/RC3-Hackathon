import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { applyToJobAction } from "@/app/actions/resumes";
import { SubmitButton } from "@/app/components/submit-button";

export default async function CandidateJobsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireRole("CANDIDATE"); const { error } = await searchParams;
  let jobs: Prisma.JobGetPayload<{ include: { recruiter: { select: { name: true } } } }>[] = [];
  let resumes: Awaited<ReturnType<typeof prisma.resume.findMany>> = [];
  let applications: { jobId: string }[] = [];
  let loadError: string | undefined;
  try {
    [jobs, resumes, applications] = await Promise.all([prisma.job.findMany({ where: { status: "OPEN" }, include: { recruiter: { select: { name: true } } }, orderBy: { createdAt: "desc" } }), prisma.resume.findMany({ where: { candidateId: user.id }, orderBy: { createdAt: "desc" } }), prisma.application.findMany({ where: { candidateId: user.id }, select: { jobId: true } })]);
  } catch (loadException) {
    console.error("Candidate dashboard failed to load", loadException);
    loadError = "We could not load opportunities right now. Please refresh or contact the recruiter.";
  }
  const applied = new Set(applications.map((application) => application.jobId));
  return <main className="mx-auto max-w-6xl px-6 py-10"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-cyan-300">CANDIDATE DASHBOARD</p><h1 className="mt-1 text-3xl font-bold">Open opportunities</h1></div><div className="flex gap-3"><Link className="rounded border border-slate-700 px-3 py-2" href="/applications">My applications</Link><Link className="rounded bg-cyan-400 px-3 py-2 font-bold text-slate-950" href="/candidate/resumes/new">Upload resume</Link></div></div>{error && <p role="alert" className="mt-5 rounded bg-red-950 p-3 text-sm text-red-100">{error}</p>}{loadError && <p role="alert" className="mt-5 rounded bg-red-950 p-3 text-sm text-red-100">{loadError}</p>}<section className="mt-8 grid gap-4 md:grid-cols-2">{jobs.map((job) => <article key={job.id} className="rounded-xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-xl font-bold">{job.title}</h2><p className="mt-1 text-sm text-slate-400">{job.department} · {job.location} · {job.employmentType}</p><p className="mt-4 line-clamp-3 text-sm text-slate-300">{job.description}</p><div className="mt-4 flex flex-wrap gap-2">{JSON.parse(job.requiredSkills).map((skill: string) => <span key={skill} className="rounded bg-cyan-950 px-2 py-1 text-xs text-cyan-200">{skill}</span>)}</div>{applied.has(job.id) ? <p className="mt-5 text-sm text-emerald-300">Application submitted</p> : resumes.length ? <form action={applyToJobAction.bind(null, job.id)} className="mt-5 flex gap-2"><select name="resumeId" className="min-w-0 flex-1 rounded bg-slate-800 p-2 text-sm">{resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.originalName}</option>)}</select><SubmitButton label="Apply" pendingLabel="Applying…" className="rounded bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300" /></form> : <Link className="mt-5 inline-block text-sm text-cyan-300" href="/candidate/resumes/new">Upload a resume to apply</Link>}<p className="mt-4 text-xs text-slate-500">Posted by {job.recruiter.name}</p></article>)}</section></main>;
}
