import Link from "next/link";
import { registerAction } from "@/app/actions/auth";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="mx-auto max-w-md px-6 py-12"><h1 className="text-3xl font-bold">Create account</h1>{error && <p className="mt-4 rounded bg-red-950 p-3 text-sm text-red-200">{error}</p>}<form action={registerAction} className="mt-7 grid gap-4"><label>Name<input required name="name" minLength={2} className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-3" /></label><label>Email<input required name="email" type="email" className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-3" /></label><label>Password<input required name="password" type="password" minLength={8} className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-3" /></label><label>Account type<select name="role" className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-3"><option value="CANDIDATE">Candidate</option><option value="RECRUITER">Recruiter</option></select></label><button className="rounded bg-cyan-400 p-3 font-bold text-slate-950">Create account</button></form><p className="mt-5 text-sm text-slate-400">Already registered? <Link className="text-cyan-300" href="/login">Sign in</Link></p></main>;
}
