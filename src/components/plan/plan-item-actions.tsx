"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  removePlanItemAction,
  replacePlanItemRecipeAction,
  updatePlanItemServingsAction,
} from "@/actions/plan";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uk } from "@/lib/i18n/uk";
import { cn } from "@/lib/utils";

type Rec = { id: string; title: string };

export function PlanItemActions({
  itemId,
  servings,
  recipes,
  currentRecipeId,
}: {
  itemId: string;
  servings: number;
  recipes: Rec[];
  currentRecipeId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [replaceId, setReplaceId] = useState(
    recipes.some((r) => r.id === currentRecipeId)
      ? currentRecipeId
      : (recipes[0]?.id ?? ""),
  );

  const [sv, setSv] = useState(String(servings));
  const [pending, start] = useTransition();

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Input
        className="h-8 w-16 text-xs"
        value={sv}
        onChange={(e) => setSv(e.target.value)}
        onBlur={() => {
          const n = parseFloat(sv);
          if (Number.isNaN(n) || n <= 0) return;
          start(async () => {
            await updatePlanItemServingsAction(itemId, n);
            router.refresh();
          });
        }}
      />
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) {
            setReplaceId(
              recipes.some((r) => r.id === currentRecipeId)
                ? currentRecipeId
                : (recipes[0]?.id ?? ""),
            );
          }
        }}
      >
        <DialogTrigger
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {uk.plan.replace}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{uk.plan.replaceTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>{uk.plan.recipeLabel}</Label>
            <Select
              value={replaceId}
              onValueChange={(v) => setReplaceId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder={uk.common.choose}>
                  {(v) => {
                    const r = recipes.find((x) => x.id === v);
                    return r?.title?.trim() || uk.common.unnamed;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {recipes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title?.trim() || uk.common.unnamed}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  await replacePlanItemRecipeAction(itemId, replaceId);
                  toast.success(uk.plan.replaced);
                  setOpen(false);
                  router.refresh();
                });
              }}
            >
              {uk.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive"
        disabled={pending}
        onClick={() => {
          start(async () => {
            await removePlanItemAction(itemId);
            toast.success(uk.plan.removed);
            router.refresh();
          });
        }}
      >
        {uk.plan.remove}
      </Button>
    </div>
  );
}
