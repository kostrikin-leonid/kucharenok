import Link from "next/link";
import { CalendarRange, ShoppingCart } from "lucide-react";

import { auth } from "@/auth";
import { PlanWeekNav } from "@/components/plan/plan-week-nav";
import { RegenerateShoppingButton } from "@/components/shopping/regenerate-button";
import { ShoppingView } from "@/components/shopping/shopping-view";
import { buttonVariants } from "@/components/ui/button-variants";
import type { HouseholdRole } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { isManager } from "@/lib/household/access";
import { uk } from "@/lib/i18n/uk";
import { cn } from "@/lib/utils";
import {
  parsePlanWeekOffset,
  weekMondayFromOffset,
} from "@/lib/week";
import { loadOrCreateWeeklyPlan } from "@/server/weekly-plan";

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const sp = await searchParams;
  const weekOffset = parsePlanWeekOffset(sp.w);
  const weekAnchor = weekMondayFromOffset(weekOffset);

  const session = await auth();
  const householdId = session?.user?.householdId;
  if (!householdId || !session.user?.id) {
    return (
      <p className="text-sm text-muted-foreground">
        {uk.shopping.noHousehold}
      </p>
    );
  }
  const role = session.user.role as HouseholdRole;
  const canManage = isManager(role);

  const plan = await loadOrCreateWeeklyPlan(
    householdId,
    session.user.id,
    weekAnchor,
  );

  const list = await prisma.shoppingList.findUnique({
    where: { weeklyPlanId: plan.id },
    include: {
      items: {
        include: { ingredient: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const planHasItems = plan.items.length > 0;
  const isSaved = plan.status === "active";
  const listEmpty = !list || list.items.length === 0;

  const itemsRevision =
    list?.items
      .map(
        (i) =>
          `${i.id}:${i.isChecked ? "1" : "0"}:${i.quantity ?? ""}:${i.updatedAt.getTime()}`,
      )
      .join("|") ?? "";

  const weekLine = `${plan.weekStartDate.toLocaleDateString("uk-UA", { day: "numeric", month: "short" })} — ${plan.weekEndDate.toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}`;

  return (
    <div className="space-y-6">
      <div className="hidden md:block">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#001f3f]">
              {uk.shopping.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {uk.shopping.pageSubtitle}
            </p>
          </div>
          {canManage && planHasItems && isSaved ? (
            <RegenerateShoppingButton planId={plan.id} />
          ) : null}
        </div>
      </div>

      <div className="md:hidden">
        <h1 className="text-2xl font-bold text-[#001f3f]">{uk.shopping.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {uk.shopping.pageSubtitle}
        </p>
        {canManage && planHasItems && isSaved ? (
          <div className="mt-3">
            <RegenerateShoppingButton planId={plan.id} />
          </div>
        ) : null}
      </div>

      <PlanWeekNav
        offset={weekOffset}
        weekRangeLabel={weekLine}
        basePath="/shopping"
      />

      {!planHasItems ? (
        <div className="surface-card flex flex-col items-center gap-4 border-dashed px-6 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#eff6ff] text-[#3b82f6]">
            <CalendarRange className="size-6" aria-hidden />
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-[#64748b]">
            {uk.shopping.emptyWaitingForMenu}
          </p>
          <Link
            href={`/plan?w=${weekOffset}`}
            className={cn(buttonVariants())}
          >
            {uk.plan.title}
          </Link>
        </div>
      ) : !isSaved ? (
        <div className="surface-card flex flex-col items-center gap-4 border-dashed px-6 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#fff7ed] text-[#ea580c]">
            <ShoppingCart className="size-6" aria-hidden />
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-[#64748b]">
            {uk.shopping.saveWeekForList}
          </p>
          <Link
            href={`/plan?w=${weekOffset}`}
            className={cn(buttonVariants())}
          >
            {uk.plan.title}
          </Link>
        </div>
      ) : listEmpty ? (
        <div className="surface-card flex flex-col items-center gap-4 border-dashed px-6 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#f0f4f8] text-[#94a3b8]">
            <ShoppingCart className="size-6" aria-hidden />
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-[#64748b]">
            {canManage
              ? uk.shopping.emptyOwnerAfterPlan
              : uk.shopping.emptyMember}
          </p>
          {canManage ? <RegenerateShoppingButton planId={plan.id} /> : null}
        </div>
      ) : (
        <ShoppingView
          listId={list.id}
          items={list.items}
          itemsRevision={itemsRevision}
          role={role}
        />
      )}
    </div>
  );
}
