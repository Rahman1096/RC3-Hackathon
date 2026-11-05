import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { toggleJobStatusAction } from "@/app/actions/jobs";

export default async function RecruiterDashboard() {
  const user = await requireRole("RECRUITER");
  const jobs = await prisma.job.findMany({ where: { recruiterId: user.id }, include: { _count: { select: { applications: true } } }, orderBy: { updatedAt: "desc" } });
  return <main className="mx-auto max-w-6xl px-6 py-10"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-cyan-300">RECRUITER DASHBOARD</p><h1 className="mt-1 text-3xl font-bold">Your vacancies</h1></div><Link href="/recruiter/jobs/new" className="rounded bg-cyan-400 px-4 py-2 font-bold text-slate-950">Create job</Link></div><section className="mt-8 grid gap-4">{jobs.length === 0 ? <p className="rounded border border-dashed border-slate-700 p-8 text-slate-400">No vacancies yet. Create the Backend Developer demo job.</p> : jobs.map((job) => <article key={job.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5"><div><div className="flex gap-2"><h2 className="font-bold">{job.title}</h2><span className={job.status === "OPEN" ? "text-emerald-300" : "text-amber-300"}>{job.status}</span></div><p className="mt-1 text-sm text-slate-400">{job.department} · {job.location} · {job._count.applications} applicants</p></div><div className="flex gap-2"><Link className="rounded bg-slate-800 px-3 py-2 text-sm" href={`/recruiter/jobs/${job.id}/edit`}>Edit</Link><form action={toggleJobStatusAction.bind(null, job.id)}><button className="rounded border border-slate-700 px-3 py-2 text-sm">{job.status === "OPEN" ? "Close" : "Reopen"}</button></form></div></article>)}</section></main>;
}
