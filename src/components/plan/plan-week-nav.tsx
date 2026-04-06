"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { buttonVariants } from "@/components/ui/button-variants";
import { planWeekPath } from "@/lib/plan/href";
import {
  PLAN_WEEK_OFFSET_MAX,
  PLAN_WEEK_OFFSET_MIN,
} from "@/lib/week";
import { uk } from "@/lib/i18n/uk";
import { cn } from "@/lib/utils";

export function PlanWeekNav({
  offset,
  weekRangeLabel,
  basePath = "/plan",
}: {
  offset: number;
  weekRangeLabel: string;
  /** When not `/plan`, week query is only `?w=` (e.g. shopping). */
  basePath?: string;
}) {
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);

  const prev = offset > PLAN_WEEK_OFFSET_MIN ? offset - 1 : null;
  const next = offset < PLAN_WEEK_OFFSET_MAX ? offset + 1 : null;

  const hrefFor = (o: number) => {
    if (basePath === "/plan") {
      return planWeekPath(o);
    }
    const p = new URLSearchParams();
    if (o !== 0) p.set("w", String(o));
    const q = p.toString();
    return q ? `${basePath}?${q}` : basePath;
  };

  const go = (o: number) => {
    router.push(hrefFor(o));
  };

  return (
    <div
      className="flex items-center gap-1"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start == null) return;
        const end = e.changedTouches[0]?.clientX;
        if (end == null) return;
        const d = end - start;
        if (d > 56 && prev !== null) go(prev);
        else if (d < -56 && next !== null) go(next);
      }}
    >
      {prev !== null ? (
        <Link
          href={hrefFor(prev)}
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "size-12 touch-manipulation shrink-0 md:size-11",
          )}
          aria-label={uk.plan.prevWeek}
        >
          <ChevronLeft className="size-5" />
        </Link>
      ) : (
        <span className="size-12 shrink-0 md:size-11" aria-hidden />
      )}
      <p className="min-w-0 flex-1 px-2 text-center text-base font-bold leading-tight text-[#001f3f] md:text-lg">
        {weekRangeLabel}
      </p>
      {next !== null ? (
        <Link
          href={hrefFor(next)}
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "size-12 touch-manipulation shrink-0 md:size-11",
          )}
          aria-label={uk.plan.nextWeek}
        >
          <ChevronRight className="size-5" />
        </Link>
      ) : (
        <span className="size-12 shrink-0 md:size-11" aria-hidden />
      )}
    </div>
  );
}
