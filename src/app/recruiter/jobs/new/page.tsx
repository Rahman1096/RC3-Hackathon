import { createJobAction } from "@/app/actions/jobs";
import { requireRole } from "@/lib/access";
import { JobForm } from "../job-form";

export default async function NewJobPage() {
  await requireRole("RECRUITER");
  return <main className="mx-auto max-w-4xl px-6 py-10"><p className="text-sm font-semibold text-cyan-300">NEW VACANCY</p><h1 className="mt-1 text-3xl font-bold">Create job</h1><JobForm action={createJobAction} /></main>;
}
