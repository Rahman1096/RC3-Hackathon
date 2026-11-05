import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Credentials({
    credentials: { email: {}, password: {} },
    authorize: async (credentials) => {
      const parsed = z.object({ email: z.string().email(), password: z.string().min(8).max(128) }).safeParse(credentials);
      if (!parsed.success) return null;
      const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
      if (!user || !(await compare(parsed.data.password, user.passwordHash))) return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  })],
  session: { strategy: "jwt" },
  callbacks: {
    jwt: ({ token, user }) => { if (user) token.role = user.role; return token; },
    session: ({ session, token }) => { if (session.user) { session.user.id = token.sub!; session.user.role = token.role as "RECRUITER" | "CANDIDATE"; } return session; },
  },
  pages: { signIn: "/login" },
});
