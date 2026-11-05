import { createJobAction } from "@/app/actions/jobs";
import { requireRole } from "@/lib/access";
import { JobForm } from "../job-form";
import Link from "next/link";

export default async function NewJobPage() {
  await requireRole("RECRUITER");
  return <main className="mx-auto max-w-4xl px-6 py-10"><Link href="/recruiter" className="text-sm text-cyan-300 hover:text-cyan-200">← Back to dashboard</Link><p className="mt-6 text-sm font-semibold text-cyan-300">NEW VACANCY</p><h1 className="mt-1 text-3xl font-bold">Create job</h1><JobForm action={createJobAction} /></main>;
}
