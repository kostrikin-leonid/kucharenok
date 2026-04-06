"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/household/access";
import { serverErrorUk } from "@/lib/i18n/server-errors";
import { z } from "zod";

export async function createInviteAction(email: string) {
  const ctx = await requireManager();
  const normalized = email.toLowerCase().trim();
  const token = nanoid(32);
  await prisma.householdMember.create({
    data: {
      householdId: ctx.householdId,
      userId: null,
      role: "member",
      status: "invited",
      inviteToken: token,
      invitedEmail: normalized,
    },
  });
  revalidatePath("/family");
  return { token, url: `/join/${token}` };
}

const joinSchema = z.object({
  token: z.string().min(10),
});

export async function acceptInviteAction(token: string, userId: string) {
  const parsed = joinSchema.parse({ token });
  const invite = await prisma.householdMember.findFirst({
    where: { inviteToken: parsed.token, status: "invited" },
  });
  if (!invite) throw new Error(serverErrorUk.invalidInvite);
  await prisma.householdMember.update({
    where: { id: invite.id },
    data: {
      userId,
      status: "active",
      inviteToken: null,
    },
  });
  revalidatePath("/family");
  revalidatePath("/dashboard");
}

const addByEmailSchema = z.object({
  email: z.string().email(),
});

export async function addMemberByEmailAction(
  data: z.infer<typeof addByEmailSchema>,
) {
  const ctx = await requireManager();
  const parsed = addByEmailSchema.parse(data);
  const email = parsed.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: serverErrorUk.registerFirst };
  }
  const existing = await prisma.householdMember.findFirst({
    where: { householdId: ctx.householdId, userId: user.id },
  });
  if (existing) {
    return { error: serverErrorUk.alreadyInHousehold };
  }
  await prisma.householdMember.create({
    data: {
      householdId: ctx.householdId,
      userId: user.id,
      role: "member",
      status: "active",
    },
  });
  revalidatePath("/family");
  return { ok: true };
}

export async function setMemberRoleAction(
  memberId: string,
  role: "admin" | "member",
) {
  const ctx = await requireManager();
  const member = await prisma.householdMember.findFirst({
    where: { id: memberId, householdId: ctx.householdId },
  });
  if (!member || member.userId === ctx.userId) {
    throw new Error(serverErrorUk.cannotChangeMember);
  }
  if (member.role === "owner")
    throw new Error(serverErrorUk.cannotDemoteOwner);
  await prisma.householdMember.update({
    where: { id: memberId },
    data: { role },
  });
  revalidatePath("/family");
}
