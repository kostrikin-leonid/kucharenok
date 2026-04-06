"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { generateWeekDraftAction } from "@/actions/plan";
import { Button } from "@/components/ui/button";
import { uk } from "@/lib/i18n/uk";
import { cn } from "@/lib/utils";

export function DashboardDraftButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      className={cn(className)}
      onClick={() => {
        start(async () => {
          try {
            await generateWeekDraftAction();
            toast.success(uk.dashboard.draftWeekSuccess);
            router.refresh();
          } catch (e) {
            toast.error(
              e instanceof Error ? e.message : uk.dashboard.draftWeekFailed,
            );
          }
        });
      }}
    >
      {pending ? uk.dashboard.draftWeekWorking : uk.dashboard.draftWeek}
    </Button>
  );
}
