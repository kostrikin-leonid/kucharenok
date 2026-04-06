import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const valid = await compare(
          String(credentials.password),
          user.passwordHash,
        );
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      const uid = (user?.id ?? token.sub) as string | undefined;
      if (uid) {
        token.sub = uid;
        const m = await prisma.householdMember.findFirst({
          where: { userId: uid, status: "active" },
          orderBy: { createdAt: "asc" },
        });
        token.householdId = m?.householdId ?? null;
        token.role = m?.role ?? null;
      }
      if (trigger === "update" && token.sub) {
        const m = await prisma.householdMember.findFirst({
          where: { userId: token.sub, status: "active" },
          orderBy: { createdAt: "asc" },
        });
        token.householdId = m?.householdId ?? null;
        token.role = m?.role ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.householdId = token.householdId ?? null;
        session.user.role = token.role ?? null;
      }
      return session;
    },
  },
});
