import Link from "next/link";
import { loginAction } from "@/app/actions/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="mx-auto max-w-md px-6 py-16"><h1 className="text-3xl font-bold">Welcome back</h1><p className="mt-2 text-slate-400">Sign in to your recruitment workspace.</p>{error && <p className="mt-5 rounded bg-red-950 p-3 text-sm text-red-200">{error}</p>}<form action={loginAction} className="mt-8 grid gap-4"><label>Email<input required name="email" type="email" className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-3" /></label><label>Password<input required name="password" type="password" minLength={8} className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-3" /></label><button className="rounded bg-cyan-400 p-3 font-bold text-slate-950">Sign in</button></form><p className="mt-5 text-sm text-slate-400">New here? <Link className="text-cyan-300" href="/register">Create an account</Link></p></main>;
}
