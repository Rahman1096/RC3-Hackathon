import { notFound } from "next/navigation";
import { updateJobAction } from "@/app/actions/jobs";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { JobForm } from "../../job-form";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("RECRUITER"); const { id } = await params;
  const job = await prisma.job.findFirst({ where: { id, recruiterId: user.id } }); if (!job) notFound();
  return <main className="mx-auto max-w-4xl px-6 py-10"><p className="text-sm font-semibold text-cyan-300">EDIT VACANCY</p><h1 className="mt-1 text-3xl font-bold">{job.title}</h1><JobForm action={updateJobAction.bind(null, job.id)} job={{ ...job, requiredSkills: JSON.parse(job.requiredSkills).join(", "), preferredSkills: JSON.parse(job.preferredSkills).join(", ") }} /></main>;
}
