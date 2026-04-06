"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { updateHouseholdSettingsAction } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uk } from "@/lib/i18n/uk";

export function HouseholdForm({
  initial,
}: {
  initial: {
    name: string;
    defaultServings: number | null;
    dailyKcalGoal: number | null;
    dailyProteinGoal: number | null;
    dailyFatGoal: number | null;
    dailyCarbGoal: number | null;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <form
      className="max-w-md space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          await updateHouseholdSettingsAction({
            name: String(fd.get("name")),
            defaultServings: fd.get("defaultServings")
              ? parseInt(String(fd.get("defaultServings")), 10)
              : null,
            dailyKcalGoal: fd.get("dailyKcalGoal")
              ? parseInt(String(fd.get("dailyKcalGoal")), 10)
              : null,
            dailyProteinGoal: fd.get("dailyProteinGoal")
              ? parseFloat(String(fd.get("dailyProteinGoal")))
              : null,
            dailyFatGoal: fd.get("dailyFatGoal")
              ? parseFloat(String(fd.get("dailyFatGoal")))
              : null,
            dailyCarbGoal: fd.get("dailyCarbGoal")
              ? parseFloat(String(fd.get("dailyCarbGoal")))
              : null,
          });
          toast.success(uk.settings.saved);
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="name">{uk.settings.householdName}</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={initial.name}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="defaultServings">{uk.settings.defaultServings}</Label>
        <Input
          id="defaultServings"
          name="defaultServings"
          type="number"
          min={1}
          defaultValue={initial.defaultServings ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label>{uk.settings.dailyGoalsApprox}</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            name="dailyKcalGoal"
            placeholder={uk.settings.placeholderKcal}
            type="number"
            defaultValue={initial.dailyKcalGoal ?? ""}
          />
          <Input
            name="dailyProteinGoal"
            placeholder={uk.settings.placeholderProtein}
            type="number"
            step="0.1"
            defaultValue={initial.dailyProteinGoal ?? ""}
          />
          <Input
            name="dailyFatGoal"
            placeholder={uk.settings.placeholderFat}
            type="number"
            step="0.1"
            defaultValue={initial.dailyFatGoal ?? ""}
          />
          <Input
            name="dailyCarbGoal"
            placeholder={uk.settings.placeholderCarbs}
            type="number"
            step="0.1"
            defaultValue={initial.dailyCarbGoal ?? ""}
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? uk.settings.saving : uk.settings.saveButton}
      </Button>
    </form>
  );
}
