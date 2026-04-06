"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  copyPreviousWeekAction,
  generateWeekDraftAction,
} from "@/actions/plan";
import { Button } from "@/components/ui/button";
import { uk } from "@/lib/i18n/uk";

export function PlanToolbar({ weekStart }: { weekStart: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const d = new Date(weekStart);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          start(async () => {
            try {
              await copyPreviousWeekAction(d);
              toast.success(uk.plan.copyPrevSuccess);
              router.refresh();
            } catch (e) {
              toast.error(
                e instanceof Error ? e.message : uk.plan.actionFailed,
              );
            }
          });
        }}
      >
        {uk.plan.copyPrevWeek}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          start(async () => {
            try {
              await generateWeekDraftAction(d);
              toast.success(uk.plan.draftGenerated);
              router.refresh();
            } catch (e) {
              toast.error(
                e instanceof Error ? e.message : uk.plan.actionFailed,
              );
            }
          });
        }}
      >
        {uk.plan.generateDraft}
      </Button>
    </div>
  );
}
