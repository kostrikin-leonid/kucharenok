"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteRecipeAction } from "@/actions/recipes";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { uk } from "@/lib/i18n/uk";
import { cn } from "@/lib/utils";

export function DeleteRecipeButton({
  recipeId,
  planSlotsCount,
}: {
  recipeId: string;
  planSlotsCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "text-destructive",
        )}
      >
        {uk.common.delete}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{uk.recipes.deleteDialogTitle}</DialogTitle>
          <DialogDescription className="space-y-2 text-left">
            <span className="block">{uk.recipes.deleteDialogHint}</span>
            {planSlotsCount > 0 ? (
              <span className="block font-medium text-foreground">
                {uk.recipes.deleteUsedInPlan(planSlotsCount)}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            {uk.common.cancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              start(async () => {
                try {
                  await deleteRecipeAction(recipeId);
                  toast.success(uk.recipes.deleted);
                  setOpen(false);
                  router.push("/recipes");
                  router.refresh();
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : uk.recipes.deleteFailed,
                  );
                }
              });
            }}
          >
            {pending ? uk.common.loading : uk.recipes.deletePermanently}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
