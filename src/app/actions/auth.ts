"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/auth";

export async function registerAction(formData: FormData) {
  const parsed = z.object({ name: z.string().trim().min(2).max(80), email: z.string().email(), password: z.string().min(8).max(128), role: z.enum(["RECRUITER", "CANDIDATE"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/register?error=Please+enter+valid+details");
  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) redirect("/register?error=An+account+already+exists+for+this+email");
  const user = await prisma.user.create({ data: { name: parsed.data.name, email, passwordHash: await hash(parsed.data.password, 12), role: parsed.data.role, candidateProfile: parsed.data.role === "CANDIDATE" ? { create: {} } : undefined, recruiterProfile: parsed.data.role === "RECRUITER" ? { create: {} } : undefined } });
  await signIn("credentials", { email: user.email, password: parsed.data.password, redirectTo: user.role === "RECRUITER" ? "/recruiter" : "/jobs" });
}

export async function loginAction(formData: FormData) {
  try { await signIn("credentials", { email: String(formData.get("email") || ""), password: String(formData.get("password") || ""), redirectTo: "/" }); }
  catch (error) { if (error instanceof AuthError) redirect("/login?error=Invalid+email+or+password"); throw error; }
}

export async function logoutAction() { await signOut({ redirectTo: "/login" }); }
