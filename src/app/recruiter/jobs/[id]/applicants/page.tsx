import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { resumeDataSchema } from "@/lib/resume";

export default async function ApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("RECRUITER"); const { id } = await params;
  const job = await prisma.job.findFirst({ where: { id, recruiterId: user.id }, include: { applications: { include: { candidate: { select: { name: true, email: true } }, resume: true }, orderBy: { createdAt: "desc" } } } }); if (!job) notFound();
  return <main className="mx-auto max-w-5xl px-6 py-10"><p className="text-sm font-semibold text-cyan-300">AUTHORIZED APPLICANTS</p><h1 className="mt-1 text-3xl font-bold">{job.title}</h1><div className="mt-7 grid gap-4">{job.applications.map((application) => { const data = resumeDataSchema.parse(JSON.parse(application.resume.extractedData)); return <article key={application.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5"><div className="flex justify-between"><div><h2 className="font-bold">{data.name || application.candidate.name}</h2><p className="text-sm text-slate-400">{data.email || application.candidate.email} · {application.status.replaceAll("_", " ")}</p></div><span className="text-xs text-slate-500">{application.createdAt.toLocaleDateString()}</span></div><p className="mt-3 text-sm text-slate-300">Skills: {data.skills.map((skill) => skill.value).join(", ") || "Awaiting candidate review"}</p>{data.skills.filter((skill) => skill.evidence).slice(0, 2).map((skill) => <p key={skill.value} className="mt-2 border-l-2 border-cyan-500 pl-3 text-xs text-slate-400">{skill.evidence}</p>)}</article>; })}{!job.applications.length && <p className="text-slate-400">No applicants yet.</p>}</div></main>;
}
