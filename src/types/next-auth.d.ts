import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      householdId?: string | null;
      role?: "owner" | "admin" | "member" | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    householdId?: string | null;
    role?: "owner" | "admin" | "member" | null;
  }
}
