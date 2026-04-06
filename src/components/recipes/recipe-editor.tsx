"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { createRecipeAction, updateRecipeAction } from "@/actions/recipes";
import { recipeBaseSchema } from "@/lib/recipes/recipe-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { uk } from "@/lib/i18n/uk";
import { cn } from "@/lib/utils";
import type { z } from "zod";

import { RecipeImageFields } from "./recipe-image-fields";

const recipeBodyFieldClass =
  "min-h-[88px] w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-[15px] leading-relaxed text-[#1e293b] shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-[#94a3b8] focus-visible:border-[var(--interactive)] focus-visible:ring-2 focus-visible:ring-[var(--interactive)]/20 md:text-sm";

type Row = {
  ingredientId: string;
  preparationRecipeId: string;
  customName: string;
  quantity: string;
  unit: string;
  note: string;
  toTaste: boolean;
};

type Opt = { id: string; name: string };

type PrepOpt = { id: string; title: string };

function ingredientRowSelectValue(row: Row): string {
  if (row.preparationRecipeId) return `p:${row.preparationRecipeId}`;
  if (row.ingredientId) return `i:${row.ingredientId}`;
  return "__manual__";
}

function emptyRow(): Row {
  return {
    ingredientId: "",
    preparationRecipeId: "",
    customName: "",
    quantity: "",
    unit: "г",
    note: "",
    toTaste: false,
  };
}

export function RecipeEditor({
  mode,
  recipeId,
  categories,
  tags,
  catalog,
  preparations,
  initial,
}: {
  mode: "create" | "edit";
  recipeId?: string;
  categories: Opt[];
  tags: Opt[];
  catalog: Opt[];
  preparations: PrepOpt[];
  initial?: Partial<z.infer<typeof recipeBaseSchema>> & {
    ingredientRows?: Row[];
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [imagePublicId, setImagePublicId] = useState(
    initial?.imagePublicId ?? "",
  );
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? []);
  const [baseServings, setBaseServings] = useState(
    String(initial?.baseServings ?? 4),
  );
  const [prep, setPrep] = useState(
    initial?.prepTimeMinutes != null
      ? String(initial.prepTimeMinutes)
      : "",
  );
  const [cook, setCook] = useState(
    initial?.cookTimeMinutes != null ? String(initial.cookTimeMinutes) : "",
  );
  const [total, setTotal] = useState(
    initial?.totalTimeMinutes != null
      ? String(initial.totalTimeMinutes)
      : "",
  );
  const [kcal, setKcal] = useState(
    initial?.kcalPerServing != null ? String(initial.kcalPerServing) : "",
  );
  const [protein, setProtein] = useState(
    initial?.proteinPerServing != null
      ? String(initial.proteinPerServing)
      : "",
  );
  const [fat, setFat] = useState(
    initial?.fatPerServing != null ? String(initial.fatPerServing) : "",
  );
  const [carbs, setCarbs] = useState(
    initial?.carbsPerServing != null ? String(initial.carbsPerServing) : "",
  );
  const [stepsText, setStepsText] = useState(
    (initial?.instructionSteps ?? []).join("\n"),
  );
  const [rows, setRows] = useState<Row[]>(
    initial?.ingredientRows ??
      Array.from({ length: 4 }, () => emptyRow()),
  );
  const [isPrep, setIsPrep] = useState(initial?.isPreparation ?? false);
  const [nutritionSource] = useState<"manual" | "ai_estimated">(
    initial?.nutritionSource === "ai_estimated" ? "ai_estimated" : "manual",
  );
  const [nutritionConfidence] = useState<"low" | "medium" | "high">(() => {
    const c = initial?.nutritionConfidence;
    if (c === "low" || c === "medium" || c === "high") return c;
    return "medium";
  });
  const [sourceType] = useState<"manual" | "ai_text" | "ai_image">(
    initial?.sourceType ?? "manual",
  );

  const prepChoices = useMemo(
    () =>
      preparations.filter((p) => (mode === "edit" ? p.id !== recipeId : true)),
    [preparations, mode, recipeId],
  );

  function toggleTag(id: string) {
    setTagIds((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  }

  function submit() {
    const instructionSteps = stepsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const ingredients = rows
      .filter((r) => {
        const q = r.quantity.trim();
        const hasNum = q !== "" && !Number.isNaN(parseFloat(q));
        return (
          Boolean(r.preparationRecipeId) ||
          Boolean(r.ingredientId) ||
          Boolean(r.customName.trim()) ||
          r.toTaste ||
          hasNum
        );
      })
      .map((r) => ({
        ingredientId: r.preparationRecipeId ? null : r.ingredientId || null,
        preparationRecipeId: r.preparationRecipeId || null,
        customName: r.preparationRecipeId ? null : r.customName.trim() || null,
        quantity: r.toTaste
          ? null
          : r.quantity
            ? parseFloat(r.quantity)
            : null,
        unit: r.unit.trim() || null,
        note: r.note.trim() || null,
        isToTaste: r.toTaste,
      }));

    const trimmedUrl = imageUrl.trim();
    const payload: z.infer<typeof recipeBaseSchema> = {
      title: title.trim(),
      summary: summary.trim() || null,
      imageUrl: trimmedUrl || null,
      imagePublicId: imagePublicId.trim() || null,
      categoryId: categoryId || null,
      tagIds,
      baseServings: parseFloat(baseServings) || 4,
      prepTimeMinutes: prep ? parseInt(prep, 10) : null,
      cookTimeMinutes: cook ? parseInt(cook, 10) : null,
      totalTimeMinutes: total ? parseInt(total, 10) : null,
      difficulty: null,
      instructionSteps,
      kcalPerServing: kcal ? parseFloat(kcal) : null,
      proteinPerServing: protein ? parseFloat(protein) : null,
      fatPerServing: fat ? parseFloat(fat) : null,
      carbsPerServing: carbs ? parseFloat(carbs) : null,
      nutritionSource,
      nutritionConfidence,
      sourceType,
      isArchived: false,
      isFavorite: mode === "create" ? false : Boolean(initial?.isFavorite),
      hiddenFromSuggestions:
        mode === "create" ? false : Boolean(initial?.hiddenFromSuggestions),
      isPreparation: isPrep,
      ingredients,
    };

    start(async () => {
      try {
        if (mode === "create") {
          const r = await createRecipeAction(payload);
          toast.success(uk.common.saved);
          router.push(`/recipes/${r.slug}`);
          router.refresh();
        } else if (recipeId) {
          const { slug: newSlug } = await updateRecipeAction(recipeId, payload);
          toast.success(uk.common.updated);
          router.push(`/recipes/${newSlug}`);
          router.refresh();
        }
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : uk.common.saveFailed,
        );
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>{uk.recipeEditor.title}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>{uk.recipeEditor.summary}</Label>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className={cn(recipeBodyFieldClass, "min-h-[88px]")}
          />
        </div>
        <RecipeImageFields
          imageUrl={imageUrl}
          onImageUrlChange={(v) => {
            setImageUrl(v);
            setImagePublicId("");
          }}
          onUploaded={(url, publicId) => {
            setImageUrl(url);
            setImagePublicId(publicId);
          }}
        />
        <div className="space-y-2">
          <Label>{uk.recipeEditor.category}</Label>
          <Select
            value={categoryId || "__none__"}
            onValueChange={(v) =>
              setCategoryId(v === "__none__" || v == null ? "" : v)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={uk.common.choose}>
                {(v) => {
                  if (v === "__none__" || v == null || v === "")
                    return uk.common.choose;
                  const c = categories.find((x) => x.id === v);
                  return c?.name?.trim() || uk.common.unnamed;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{uk.common.choose}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name?.trim() || uk.common.unnamed}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{uk.recipeEditor.baseServings}</Label>
          <Input
            type="number"
            min={0.5}
            step={0.5}
            value={baseServings}
            onChange={(e) => setBaseServings(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{uk.recipeEditor.prepMin}</Label>
          <Input value={prep} onChange={(e) => setPrep(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{uk.recipeEditor.cookMin}</Label>
          <Input value={cook} onChange={(e) => setCook(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{uk.recipeEditor.totalMin}</Label>
          <Input value={total} onChange={(e) => setTotal(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{uk.recipeEditor.tags}</Label>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <label key={t.id} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={tagIds.includes(t.id)}
                onChange={() => toggleTag(t.id)}
              />
              {t.name?.trim() || uk.common.unnamed}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-[#f1f5f9] bg-[#fafafa] p-4">
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPrep}
            onChange={(e) => setIsPrep(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium text-[#001f3f]">
              {uk.recipeEditor.isPreparationLabel}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {uk.recipeEditor.isPreparationHint}
            </span>
          </span>
        </label>
      </div>

      <div className="space-y-2">
        <Label>{uk.recipeEditor.ingredients}</Label>
        <div className="space-y-3 rounded-2xl border border-[#f9fafb] bg-white p-4 shadow-[var(--shadow-card)]">
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid gap-2 border-b border-[#f3f4f6] pb-3 last:border-0 sm:grid-cols-12"
            >
              <div className="sm:col-span-4">
                <Select
                  value={ingredientRowSelectValue(row)}
                  onValueChange={(v) => {
                    const nv = [...rows];
                    if (v === "__manual__" || v == null) {
                      nv[i].ingredientId = "";
                      nv[i].preparationRecipeId = "";
                    } else if (typeof v === "string" && v.startsWith("p:")) {
                      nv[i].preparationRecipeId = v.slice(2);
                      nv[i].ingredientId = "";
                      nv[i].customName = "";
                    } else if (typeof v === "string" && v.startsWith("i:")) {
                      nv[i].ingredientId = v.slice(2);
                      nv[i].preparationRecipeId = "";
                    }
                    setRows(nv);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={uk.common.choose}>
                      {(v) => {
                        if (v === "__manual__" || v == null || v === "")
                          return uk.recipeEditor.ingredientManual;
                        if (typeof v === "string" && v.startsWith("p:")) {
                          const id = v.slice(2);
                          const p = prepChoices.find((x) => x.id === id);
                          return p?.title?.trim() || uk.common.unnamed;
                        }
                        if (typeof v === "string" && v.startsWith("i:")) {
                          const id = v.slice(2);
                          const c = catalog.find((x) => x.id === id);
                          return c?.name?.trim() || uk.common.unnamed;
                        }
                        return uk.common.unnamed;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual__">
                      {uk.recipeEditor.ingredientManual}
                    </SelectItem>
                    <SelectGroup>
                      <SelectLabel>{uk.recipeEditor.ingredientGroupCatalog}</SelectLabel>
                      {catalog.map((c) => (
                        <SelectItem key={c.id} value={`i:${c.id}`}>
                          {c.name?.trim() || uk.common.unnamed}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    {prepChoices.length > 0 ? (
                      <SelectGroup>
                        <SelectLabel>
                          {uk.recipeEditor.ingredientGroupPreparations}
                        </SelectLabel>
                        {prepChoices.map((p) => (
                          <SelectItem key={p.id} value={`p:${p.id}`}>
                            {p.title?.trim() || uk.common.unnamed}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-3">
                {row.preparationRecipeId ? (
                  <p className="flex h-8 items-center text-xs text-muted-foreground sm:h-8">
                    —
                  </p>
                ) : (
                  <Input
                    placeholder={uk.recipeEditor.customName}
                    value={row.customName}
                    onChange={(e) => {
                      const nv = [...rows];
                      nv[i].customName = e.target.value;
                      setRows(nv);
                    }}
                  />
                )}
              </div>
              <div className="sm:col-span-2">
                <Input
                  placeholder={uk.recipeEditor.qty}
                  value={row.quantity}
                  onChange={(e) => {
                    const nv = [...rows];
                    nv[i].quantity = e.target.value;
                    setRows(nv);
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  placeholder={uk.recipeEditor.unit}
                  value={row.unit}
                  onChange={(e) => {
                    const nv = [...rows];
                    nv[i].unit = e.target.value;
                    setRows(nv);
                  }}
                />
              </div>
              <label className="flex items-center gap-1 text-xs sm:col-span-1">
                <input
                  type="checkbox"
                  checked={row.toTaste}
                  onChange={(e) => {
                    const nv = [...rows];
                    nv[i].toTaste = e.target.checked;
                    setRows(nv);
                  }}
                />
                {uk.recipeEditor.toTaste}
              </label>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRows([...rows, emptyRow()])}
          >
            {uk.recipeEditor.addRow}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{uk.recipeEditor.steps}</Label>
        <Textarea
          rows={10}
          value={stepsText}
          onChange={(e) => setStepsText(e.target.value)}
          className={cn(recipeBodyFieldClass, "min-h-[220px]")}
        />
      </div>

      {nutritionSource === "ai_estimated" ? (
        <p className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-xs text-[#475569]">
          {uk.recipes.nutritionAiNote}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{uk.recipeEditor.kcalPerServing}</Label>
          <Input value={kcal} onChange={(e) => setKcal(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{uk.recipeEditor.proteinG}</Label>
          <Input value={protein} onChange={(e) => setProtein(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{uk.recipeEditor.fatG}</Label>
          <Input value={fat} onChange={(e) => setFat(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{uk.recipeEditor.carbsG}</Label>
          <Input value={carbs} onChange={(e) => setCarbs(e.target.value)} />
        </div>
      </div>

      <Button disabled={pending} onClick={submit}>
        {pending
          ? uk.recipeEditor.saving
          : mode === "create"
            ? uk.recipeEditor.createRecipe
            : uk.common.save}
      </Button>
    </div>
  );
}
