"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  parseRecipeImageAction,
  parseRecipeTextAction,
} from "@/actions/ai-import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ParsedRecipeDraft } from "@/lib/ai/recipe-parser";
import { uk } from "@/lib/i18n/uk";

export function AiImportClient({
  aiConfigured,
}: {
  aiConfigured: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<ParsedRecipeDraft | null>(null);
  const [pending, start] = useTransition();

  function openInForm() {
    if (!draft) return;
    sessionStorage.setItem("rc_draft", JSON.stringify(draft));
    router.push("/recipes/new");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {aiConfigured ? (
        <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          {uk.aiImport.modelActive}
        </p>
      ) : (
        <p className="rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {uk.aiImport.heuristicNote}
        </p>
      )}

      <Tabs defaultValue="text">
        <TabsList>
          <TabsTrigger value="text">{uk.aiImport.tabText}</TabsTrigger>
          <TabsTrigger value="image">{uk.aiImport.tabImage}</TabsTrigger>
        </TabsList>
        <TabsContent value="text" className="space-y-4">
          <Label>{uk.aiImport.textLabel}</Label>
          <Textarea
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={uk.aiImport.placeholder}
          />
          <Button
            disabled={pending || !text.trim()}
            onClick={() => {
              start(async () => {
                try {
                  if (!text.trim()) {
                    toast.error(uk.aiImport.errors.noInput);
                    return;
                  }
                  const { draft: d, usedOpenAi } =
                    await parseRecipeTextAction(text);
                  setDraft(d);
                  if (usedOpenAi) {
                    toast.success(uk.aiImport.usedAiToast);
                  } else {
                    toast.message(uk.aiImport.heuristicNote);
                  }
                } catch {
                  toast.error(uk.aiImport.errors.parseFailed);
                }
              });
            }}
          >
            {pending ? uk.aiImport.parsing : uk.aiImport.parse}
          </Button>
        </TabsContent>
        <TabsContent value="image" className="space-y-4">
          <p className="text-sm text-muted-foreground">{uk.aiImport.imagePick}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                try {
                  const { draft: d, usedOpenAi } =
                    await parseRecipeImageAction(fd);
                  setDraft(d);
                  if (usedOpenAi) {
                    toast.success(uk.aiImport.usedAiToast);
                  } else {
                    toast.message(uk.aiImport.draftReady);
                  }
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : uk.aiImport.errors.parseFailed,
                  );
                }
              });
            }}
          >
            <Input
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
              required
            />
            <Button type="submit" className="mt-3" disabled={pending}>
              {pending ? uk.aiImport.parsing : uk.aiImport.parse}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {draft ? (
        <div className="space-y-3 rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm">
          <h2 className="font-medium">{uk.aiImport.previewTitle}</h2>
          <p className="text-sm">
            <strong>{draft.title}</strong>
          </p>
          {draft.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-800 dark:text-amber-200/90">
              {w}
            </p>
          ))}
          {draft.tagNamesSuggestionUk && draft.tagNamesSuggestionUk.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {uk.aiImport.tagIdeas}:{" "}
              </span>
              {draft.tagNamesSuggestionUk.join(", ")}
            </p>
          ) : null}
          <div className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs">
            <p className="font-semibold text-[#001f3f]">
              {uk.aiImport.previewNutritionApprox}
            </p>
            {draft.kcalPerServing != null && draft.kcalPerServing > 0 ? (
              <p className="mt-1 text-[#475569]">
                ~{Math.round(draft.kcalPerServing)} {uk.dashboard.kcal} · Б{" "}
                {draft.proteinPerServing ?? "—"} · Ж {draft.fatPerServing ?? "—"}{" "}
                · В {draft.carbsPerServing ?? "—"}
              </p>
            ) : (
              <p className="mt-1 text-amber-800 dark:text-amber-200/90">
                {uk.aiImport.previewNutritionMissing}
              </p>
            )}
          </div>
          <ul className="text-xs text-muted-foreground">
            {draft.ingredients.slice(0, 8).map((ing, i) => (
              <li key={i}>
                {ing.name}{" "}
                {ing.quantity != null
                  ? `${ing.quantity} ${ing.unit ?? ""}`
                  : ""}
              </li>
            ))}
          </ul>
          <Button onClick={openInForm}>{uk.aiImport.openEditor}</Button>
        </div>
      ) : null}
    </div>
  );
}
