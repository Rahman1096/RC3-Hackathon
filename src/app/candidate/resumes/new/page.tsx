import { uploadResumeAction } from "@/app/actions/resumes";
import { requireRole } from "@/lib/access";

export default async function UploadResumePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole("CANDIDATE"); const { error } = await searchParams;
  return <main className="mx-auto max-w-xl px-6 py-12"><p className="text-sm font-semibold text-cyan-300">PRIVATE RESUME</p><h1 className="mt-1 text-3xl font-bold">Upload PDF resume</h1><p className="mt-3 text-sm text-slate-400">PDF only, up to 5MB. Files are stored outside the public web folder.</p>{error && <p className="mt-5 rounded bg-red-950 p-3 text-sm text-red-100">{error}</p>}<form action={uploadResumeAction} className="mt-7 rounded-xl border border-slate-800 bg-slate-900 p-6"><input required name="resume" type="file" accept="application/pdf,.pdf" className="block w-full text-sm" /><button className="mt-5 rounded bg-cyan-400 px-4 py-3 font-bold text-slate-950">Extract and review</button></form></main>;
}
