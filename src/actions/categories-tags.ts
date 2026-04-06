"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/household/access";
import { serverErrorUk } from "@/lib/i18n/server-errors";
import { uniqueCategorySlug, uniqueTagSlug } from "@/lib/slug";

function revalidateCatalog() {
  revalidatePath("/settings");
  revalidatePath("/recipes");
}

export async function createCategoryAction(name: string) {
  const ctx = await requireManager();
  const trimmed = name.trim();
  if (!trimmed) throw new Error(serverErrorUk.nameRequired);
  const slug = await uniqueCategorySlug(ctx.householdId, trimmed);
  const agg = await prisma.category.aggregate({
    where: { householdId: ctx.householdId },
    _max: { sortOrder: true },
  });
  await prisma.category.create({
    data: {
      householdId: ctx.householdId,
      name: trimmed,
      slug,
      sortOrder: (agg._max.sortOrder ?? -1) + 1,
    },
  });
  revalidateCatalog();
}

export async function updateCategoryAction(id: string, name: string) {
  const ctx = await requireManager();
  const trimmed = name.trim();
  if (!trimmed) throw new Error(serverErrorUk.nameRequired);
  const cat = await prisma.category.findFirst({
    where: { id, householdId: ctx.householdId },
  });
  if (!cat) throw new Error(serverErrorUk.notFound);
  const slug = await uniqueCategorySlug(ctx.householdId, trimmed, cat.id);
  await prisma.category.update({
    where: { id },
    data: { name: trimmed, slug },
  });
  revalidateCatalog();
}

export async function deleteCategoryAction(id: string) {
  const ctx = await requireManager();
  const n = await prisma.category.deleteMany({
    where: { id, householdId: ctx.householdId },
  });
  if (n.count === 0) throw new Error(serverErrorUk.notFound);
  revalidateCatalog();
}

export async function createTagAction(name: string) {
  const ctx = await requireManager();
  const trimmed = name.trim();
  if (!trimmed) throw new Error(serverErrorUk.nameRequired);
  const slug = await uniqueTagSlug(ctx.householdId, trimmed);
  await prisma.tag.create({
    data: {
      householdId: ctx.householdId,
      name: trimmed,
      slug,
    },
  });
  revalidateCatalog();
}

export async function updateTagAction(id: string, name: string) {
  const ctx = await requireManager();
  const trimmed = name.trim();
  if (!trimmed) throw new Error(serverErrorUk.nameRequired);
  const tag = await prisma.tag.findFirst({
    where: { id, householdId: ctx.householdId },
  });
  if (!tag) throw new Error(serverErrorUk.notFound);
  const slug = await uniqueTagSlug(ctx.householdId, trimmed, tag.id);
  await prisma.tag.update({
    where: { id },
    data: { name: trimmed, slug },
  });
  revalidateCatalog();
}

export async function deleteTagAction(id: string) {
  const ctx = await requireManager();
  const n = await prisma.tag.deleteMany({
    where: { id, householdId: ctx.householdId },
  });
  if (n.count === 0) throw new Error(serverErrorUk.notFound);
  revalidateCatalog();
}
