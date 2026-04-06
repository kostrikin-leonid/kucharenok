"use server";

import { hash } from "bcryptjs";
import { signIn } from "@/auth";
import { DEFAULT_CATEGORY_DEFINITIONS } from "@/lib/default-categories";
import { prisma } from "@/lib/db";
import { uk } from "@/lib/i18n/uk";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120),
  householdName: z.string().min(1).max(120),
});

export async function registerAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string } | void> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
    householdName: formData.get("householdName"),
  });
  if (!parsed.success) {
    return { error: uk.auth.registerErrorFields };
  }
  const { email, password, name, householdName } = parsed.data;
  const normalized = email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({
    where: { email: normalized },
  });
  if (exists) {
    return { error: uk.auth.registerEmailTaken };
  }
  const passwordHash = await hash(password, 12);
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalized,
        passwordHash,
        name,
      },
    });
    const household = await tx.household.create({
      data: {
        name: householdName,
        defaultServings: 4,
      },
    });
    await tx.householdMember.create({
      data: {
        userId: user.id,
        householdId: household.id,
        role: "owner",
        status: "active",
      },
    });
    for (let i = 0; i < DEFAULT_CATEGORY_DEFINITIONS.length; i++) {
      const c = DEFAULT_CATEGORY_DEFINITIONS[i];
      await tx.category.create({
        data: {
          householdId: household.id,
          name: c.name,
          slug: c.slug,
          sortOrder: i,
        },
      });
    }
  });

  await signIn("credentials", {
    email: normalized,
    password,
    redirectTo: "/dashboard",
  });
}
