import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  redirect(session?.user?.role === "RECRUITER" ? "/recruiter" : session?.user?.role === "CANDIDATE" ? "/jobs" : "/login");
}
