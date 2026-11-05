import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireRole(role: "RECRUITER" | "CANDIDATE") {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== role) redirect(session.user.role === "RECRUITER" ? "/recruiter" : "/jobs");
  return session.user;
}
