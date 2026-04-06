"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { regenerateShoppingListAction } from "@/actions/shopping";
import { Button } from "@/components/ui/button";
import { uk } from "@/lib/i18n/uk";
import { cn } from "@/lib/utils";

export function RegenerateShoppingButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="pillOutline"
      disabled={pending}
      className={cn(
        "inline-flex w-full max-w-none items-center justify-center gap-2 font-semibold md:w-auto md:min-w-[280px]",
      )}
      onClick={() => {
        start(async () => {
          try {
            const r = await regenerateShoppingListAction(planId);
            toast.success(uk.shopping.regenerateSuccess(r.itemCount));
            router.refresh();
          } catch (e) {
            toast.error(
              e instanceof Error ? e.message : uk.shopping.regenerateFailed,
            );
          }
        });
      }}
    >
      <RefreshCw
        className={cn("size-4 shrink-0", pending && "animate-spin")}
        aria-hidden
      />
      {pending ? uk.shopping.regenerateWorking : uk.shopping.regenerate}
    </Button>
  );
}
