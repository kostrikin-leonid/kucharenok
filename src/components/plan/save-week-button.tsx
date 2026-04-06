"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { saveWeeklyPlanAction } from "@/actions/plan";
import { Button } from "@/components/ui/button";
import { uk } from "@/lib/i18n/uk";
import { cn } from "@/lib/utils";

export function SaveWeekButton({ weekStartIso }: { weekStartIso: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      size="lg"
      className={cn(
        "min-h-12 w-full touch-manipulation font-semibold shadow-[var(--shadow-card)] sm:w-auto sm:min-w-[260px]",
      )}
      disabled={pending}
      onClick={() => {
        start(async () => {
          try {
            await saveWeeklyPlanAction(weekStartIso);
            toast.success(uk.plan.saveWeekSuccess);
            router.refresh();
          } catch (e) {
            toast.error(
              e instanceof Error ? e.message : uk.plan.actionFailed,
            );
          }
        });
      }}
    >
      {pending ? uk.plan.saveWeekWorking : uk.plan.saveWeek}
    </Button>
  );
}
