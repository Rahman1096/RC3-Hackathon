import { notFound } from "next/navigation";
import { updateJobAction } from "@/app/actions/jobs";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { JobForm } from "../../job-form";
import Link from "next/link";

export default async function EditJobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const user = await requireRole("RECRUITER"); const { id } = await params;
  const { saved } = await searchParams;
  const job = await prisma.job.findFirst({ where: { id, recruiterId: user.id } }); if (!job) notFound();
  return <main className="mx-auto max-w-4xl px-6 py-10"><div className="flex flex-wrap items-center justify-between gap-3"><Link href="/recruiter" className="text-sm text-cyan-300 hover:text-cyan-200">← Back to dashboard</Link><Link href={`/recruiter/jobs/${job.id}/applicants`} className="text-sm text-cyan-300 hover:text-cyan-200">Review applicants →</Link></div><p className="mt-6 text-sm font-semibold text-cyan-300">EDIT VACANCY</p><h1 className="mt-1 text-3xl font-bold">{job.title}</h1>{saved === "1" && <p role="status" aria-live="polite" className="mt-5 rounded border border-emerald-700 bg-emerald-950 p-3 text-sm text-emerald-100">Job saved successfully. Changes are reflected in applicant assessments.</p>}<JobForm action={updateJobAction.bind(null, job.id)} job={{ ...job, requiredSkills: JSON.parse(job.requiredSkills).join(", "), preferredSkills: JSON.parse(job.preferredSkills).join(", ") }} /></main>;
}
