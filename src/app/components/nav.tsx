import Link from "next/link";
import { auth } from "@/auth";
import { logoutAction } from "@/app/actions/auth";

export async function Nav() {
  const session = await auth();
  const isRecruiter = session?.user?.role === "RECRUITER";
  return <nav className="flex items-center justify-between border-b border-slate-800 px-6 py-4"><Link href={isRecruiter ? "/recruiter" : "/jobs"} className="font-bold text-cyan-300">Talent Intelligence</Link><div className="flex items-center gap-4 text-sm">{session?.user ? <><span className="text-slate-300">{session.user.name} · {isRecruiter ? "Recruiter" : "Candidate"}</span><Link href={isRecruiter ? "/recruiter" : "/jobs"}>Dashboard</Link><form action={logoutAction}><button className="rounded bg-slate-800 px-3 py-1.5">Logout</button></form></> : <><Link href="/login">Login</Link><Link className="rounded bg-cyan-500 px-3 py-1.5 font-semibold text-slate-950" href="/register">Register</Link></>}</div></nav>;
}
