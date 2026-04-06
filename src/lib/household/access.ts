import { auth } from "@/auth";
import type { HouseholdRole } from "@/generated/prisma";

export type AppSessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  householdId?: string | null;
  role?: HouseholdRole | null;
};

export async function requireSessionUser(): Promise<AppSessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user as AppSessionUser;
}

export async function requireHouseholdContext(): Promise<{
  userId: string;
  householdId: string;
  role: HouseholdRole;
}> {
  const user = await requireSessionUser();
  if (!user.householdId || !user.role) {
    throw new Error("No active household");
  }
  return {
    userId: user.id,
    householdId: user.householdId,
    role: user.role,
  };
}

export function isManager(role: HouseholdRole): boolean {
  return role === "owner" || role === "admin";
}

export async function requireManager(): Promise<{
  userId: string;
  householdId: string;
  role: HouseholdRole;
}> {
  const ctx = await requireHouseholdContext();
  if (!isManager(ctx.role)) {
    throw new Error("Forbidden");
  }
  return ctx;
}
