import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User { role: "RECRUITER" | "CANDIDATE" }
  interface Session { user: { id: string; role: "RECRUITER" | "CANDIDATE" } & DefaultSession["user"] }
}
declare module "next-auth/jwt" { interface JWT { role?: "RECRUITER" | "CANDIDATE" } }
