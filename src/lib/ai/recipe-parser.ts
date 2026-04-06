import { z } from "zod";

import {
  assertRecipeImageUpload,
  bufferToVisionJpeg,
} from "@/lib/images/recipe-image";
import { roughPerServingFromDraft } from "@/lib/nutrition/rough-estimate";

import { getOpenAiConfig } from "./config";

export const parsedRecipeSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  categorySlugSuggestion: z.string().optional(),
  tagSlugsSuggestion: z.array(z.string()).optional(),
  tagNamesSuggestionUk: z.array(z.string()).optional(),
  baseServings: z.number().positive().optional(),
  prepTimeMinutes: z.number().int().nonnegative().optional(),
  cookTimeMinutes: z.number().int().nonnegative().optional(),
  totalTimeMinutes: z.number().int().nonnegative().optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number().nullable().optional(),
        unit: z.string().nullable().optional(),
        note: z.string().optional(),
        isToTaste: z.boolean().optional(),
      }),
    )
    .default([]),
  instructionSteps: z.array(z.string()).default([]),
  kcalPerServing: z.number().nonnegative().optional(),
  proteinPerServing: z.number().nonnegative().optional(),
  fatPerServing: z.number().nonnegative().optional(),
  carbsPerServing: z.number().nonnegative().optional(),
  warnings: z.array(z.string()).default([]),
});

export type ParsedRecipeDraft = z.infer<typeof parsedRecipeSchema>;

export type ParseRecipeOutcome = {
  draft: ParsedRecipeDraft;
  usedOpenAi: boolean;
};

const ALLOWED_CATEGORY_SLUGS = new Set([
  "breakfast",
  "soups",
  "main-dishes",
  "side-dishes",
  "salads",
  "bakery",
  "desserts",
  "snacks",
  "drinks",
  "kids-menu",
  "preps",
  "other",
]);

const SYSTEM_JSON_UK = `Ти допомагаєш у домашній кулінарії. Користувач надіслав текст рецепту (українською, російською, змішано або з помилками копіювання).

Правила:
- Не додавай інгредієнти чи кроки, яких немає в джерелі. Не вигадуй кількості.
- Зберігай числа, одиниці виміру та порядок кроків; можна нормалізувати запис числа (кома → крапка), але не змінюй величину.
- Усі тексти для людини (назва, опис, інгредієнти, кроки, попередження, підписи до БЖУ) — природною сучасною українською.
- categorySlugSuggestion: рівно один slug зі списку: breakfast, soups, main-dishes, side-dishes, salads, bakery, desserts, snacks, drinks, kids-menu, preps, other. Якщо невпевнений — other.
- tagNamesSuggestionUk: до 8 коротких тегів українською (наприклад "швидко", "на вечерю") або порожній масив.
- tagSlugsSuggestion: опційно, латинські slug-и для сумісності, або [].
- Харчова цінність орієнтовна на порцію (kcalPerServing, proteinPerServing, fatPerServing, carbsPerServing). Якщо в тексті немає таблиці БЖУ — оціни за типовими значеннями продуктів і порцій; якщо зовсім неможливо — опусти поля (null).
- warnings: українською (наприклад неповний текст, незрозумілі одиниці).

Відповідь СТРОГО одним JSON-об'єктом з ключами:
title, summary, categorySlugSuggestion, tagSlugsSuggestion, tagNamesSuggestionUk, baseServings, prepTimeMinutes, cookTimeMinutes, totalTimeMinutes,
ingredients (масив {name, quantity, unit, note, isToTaste}),
instructionSteps (масив рядків),
kcalPerServing, proteinPerServing, fatPerServing, carbsPerServing, warnings.`;

const SYSTEM_VISION_UK = `${SYSTEM_JSON_UK}

Користувач надіслав ФОТО страви, рукописного або друкованого рецепту. Прочитай видимий текст на зображенні. Не описуй зовнішній вигляд страви й не генеруй рецепт «з голови» — лише те, що можна прочитати на фото. Якщо тексту замало, заповни що можеш і додай попередження українською.`;

export function normalizeParsedRecipe(
  raw: unknown,
): z.infer<typeof parsedRecipeSchema> {
  const base =
    typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  let categorySlug =
    base.categorySlugSuggestion != null
      ? String(base.categorySlugSuggestion)
      : undefined;
  if (categorySlug && !ALLOWED_CATEGORY_SLUGS.has(categorySlug)) {
    categorySlug = "other";
  }
  const merged = {
    title: String(base.title ?? "Рецепт без назви"),
    summary: base.summary != null ? String(base.summary) : undefined,
    categorySlugSuggestion: categorySlug,
    tagSlugsSuggestion: Array.isArray(base.tagSlugsSuggestion)
      ? base.tagSlugsSuggestion.map(String)
      : undefined,
    tagNamesSuggestionUk: Array.isArray(base.tagNamesSuggestionUk)
      ? base.tagNamesSuggestionUk.map(String)
      : undefined,
    baseServings:
      typeof base.baseServings === "number" ? base.baseServings : undefined,
    prepTimeMinutes:
      typeof base.prepTimeMinutes === "number"
        ? base.prepTimeMinutes
        : undefined,
    cookTimeMinutes:
      typeof base.cookTimeMinutes === "number"
        ? base.cookTimeMinutes
        : undefined,
    totalTimeMinutes:
      typeof base.totalTimeMinutes === "number"
        ? base.totalTimeMinutes
        : undefined,
    ingredients: Array.isArray(base.ingredients) ? base.ingredients : [],
    instructionSteps: Array.isArray(base.instructionSteps)
      ? base.instructionSteps.map(String)
      : [],
    kcalPerServing:
      typeof base.kcalPerServing === "number" ? base.kcalPerServing : undefined,
    proteinPerServing:
      typeof base.proteinPerServing === "number"
        ? base.proteinPerServing
        : undefined,
    fatPerServing:
      typeof base.fatPerServing === "number" ? base.fatPerServing : undefined,
    carbsPerServing:
      typeof base.carbsPerServing === "number" ? base.carbsPerServing : undefined,
    warnings: Array.isArray(base.warnings) ? base.warnings.map(String) : [],
  };
  return parsedRecipeSchema.parse(merged);
}

export function validateParsedRecipe(raw: unknown) {
  return parsedRecipeSchema.safeParse(
    typeof raw === "object" && raw !== null ? raw : {},
  );
}

/** Доповнює чернетку орієнтовним КБЖУ, якщо ШІ/розбір не дали kcalPerServing. */
export function ensureEstimatedNutrition(draft: ParsedRecipeDraft): void {
  if (draft.kcalPerServing != null && draft.kcalPerServing > 0) {
    return;
  }
  const rough = roughPerServingFromDraft(draft);
  if (rough && rough.kcal > 0) {
    draft.kcalPerServing = rough.kcal;
    draft.proteinPerServing = rough.protein;
    draft.fatPerServing = rough.fat;
    draft.carbsPerServing = rough.carbs;
    const msg =
      "Орієнтовне КБЖУ пораховано автоматично за кількостями інгредієнтів (г/мл) — перевірте перед збереженням.";
    if (!draft.warnings.includes(msg)) draft.warnings.push(msg);
    return;
  }
  const msg =
    "КБЖУ не вдалося оцінити автоматично (немає ваг у г/мл і немає даних від ШІ) — уточніть у формі.";
  if (!draft.warnings.some((w) => w.includes("КБЖУ"))) draft.warnings.push(msg);
}

function heuristicParseFromText(text: string): ParsedRecipeDraft {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const title = lines[0] ?? "Імпортований рецепт";
  const warnings: string[] = [
    "Розбір без ШІ (ключ API не налаштовано або сталася помилка). Уважно перевірте всі поля перед збереженням.",
  ];
  const ingredients: ParsedRecipeDraft["ingredients"] = [];
  const steps: string[] = [];
  let mode: "ing" | "steps" | "none" = "none";
  for (const line of lines.slice(1)) {
    if (
      /^(інгредієнти|ингредиенты|ingredients|склад)/i.test(line)
    ) {
      mode = "ing";
      continue;
    }
    if (
      /^(кроки|приготування|приготовление|steps|instructions|спосіб приготування)/i.test(
        line,
      )
    ) {
      mode = "steps";
      continue;
    }
    if (mode === "ing") {
      const m = line.match(/^([\d.,]+)\s*([a-zA-Zа-яА-ЯіІїЇєЄґҐёЁ.%/]+)?\s+(.+)$/u);
      if (m) {
        const qty = parseFloat(m[1].replace(",", "."));
        ingredients.push({
          name: m[3].trim(),
          quantity: Number.isFinite(qty) ? qty : null,
          unit: m[2]?.trim() || null,
        });
      } else {
        ingredients.push({ name: line, quantity: null, unit: null });
      }
    } else if (mode === "steps") {
      steps.push(line);
    }
  }
  const d = normalizeParsedRecipe({
    title,
    baseServings: 4,
    ingredients,
    instructionSteps: steps.length ? steps : [text.slice(0, 500)],
    warnings,
  });
  ensureEstimatedNutrition(d);
  return d;
}

async function callOpenAiJson(
  messages: {
    role: "system" | "user" | "assistant";
    content: unknown;
  }[],
): Promise<{ ok: true; json: unknown } | { ok: false; status: number }> {
  const cfg = getOpenAiConfig();
  if (!cfg.enabled) return { ok: false, status: 0 };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      response_format: { type: "json_object" },
      messages,
    }),
  });
  if (!res.ok) return { ok: false, status: res.status };
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return { ok: false, status: 0 };
  try {
    return { ok: true, json: JSON.parse(content) as unknown };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function parseRecipeFromText(
  text: string,
): Promise<ParseRecipeOutcome> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      draft: normalizeParsedRecipe({
        title: "Порожній ввід",
        warnings: ["Немає тексту для розбору."],
      }),
      usedOpenAi: false,
    };
  }
  const cfg = getOpenAiConfig();
  if (!cfg.enabled) {
    return { draft: heuristicParseFromText(trimmed), usedOpenAi: false };
  }
  const ai = await callOpenAiJson([
    { role: "system", content: SYSTEM_JSON_UK },
    { role: "user", content: trimmed.slice(0, 12000) },
  ]);
  if (!ai.ok) {
    const draft = heuristicParseFromText(trimmed);
    draft.warnings = [
      ...draft.warnings,
      "Не вдалося отримати відповідь ШІ — показано спрощений розбір. Спробуйте ще раз або введіть рецепт вручну.",
    ];
    return { draft, usedOpenAi: false };
  }
  try {
    const draft = normalizeParsedRecipe(ai.json);
    ensureEstimatedNutrition(draft);
    return { draft, usedOpenAi: true };
  } catch {
    const draft = heuristicParseFromText(trimmed);
    draft.warnings = [
      ...draft.warnings,
      "ШІ повернув некоректний формат — показано спрощений розбір.",
    ];
    return { draft, usedOpenAi: false };
  }
}

export async function parseRecipeFromImage(
  file: File,
): Promise<ParseRecipeOutcome> {
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    assertRecipeImageUpload(buf.length, file.type, file.name);
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const warnings =
      code === "FILE_TOO_LARGE"
        ? ["Файл завеликий (максимум 10 МБ)."]
        : ["Непідтримуваний формат зображення."];
    return {
      draft: normalizeParsedRecipe({
        title: "Рецепт з фото",
        baseServings: 4,
        ingredients: [],
        instructionSteps: [],
        warnings,
      }),
      usedOpenAi: false,
    };
  }

  const cfg = getOpenAiConfig();
  if (!cfg.enabled) {
    return {
      draft: normalizeParsedRecipe({
        title: "Рецепт з фото",
        baseServings: 4,
        ingredients: [],
        instructionSteps: [],
        warnings: [
          "Додайте OPENAI_API_KEY для розпізнавання тексту з фото або вставте текст рецепту вручну.",
        ],
      }),
      usedOpenAi: false,
    };
  }

  let jpeg: Buffer;
  try {
    jpeg = await bufferToVisionJpeg(buf, file.type || "", file.name);
  } catch {
    return {
      draft: normalizeParsedRecipe({
        title: "Рецепт з фото",
        baseServings: 4,
        ingredients: [],
        instructionSteps: [],
        warnings: [
          "Не вдалося обробити зображення. Спробуйте JPEG, PNG, WebP або HEIC.",
        ],
      }),
      usedOpenAi: false,
    };
  }

  const dataUrl = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  const ai = await callOpenAiJson([
    { role: "system", content: SYSTEM_VISION_UK },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Розпізнай рецепт із зображення та поверни JSON згідно з інструкціями системи. Не генеруй зображення — лише структурований текст.",
        },
        {
          type: "image_url",
          image_url: { url: dataUrl, detail: "high" },
        },
      ],
    },
  ]);

  if (!ai.ok) {
    const hint =
      ai.status === 400
        ? "Можливо, обрана модель не підтримує зображення. Оберіть vision-модель у OPENAI_MODEL або вставте текст рецепту."
        : "Сервіс ШІ тимчасово недоступний. Спробуйте пізніше або вставте текст.";
    return {
      draft: normalizeParsedRecipe({
        title: "Рецепт з фото",
        baseServings: 4,
        ingredients: [],
        instructionSteps: [],
        warnings: [hint],
      }),
      usedOpenAi: false,
    };
  }

  try {
    const draft = normalizeParsedRecipe(ai.json);
    ensureEstimatedNutrition(draft);
    return { draft, usedOpenAi: true };
  } catch {
    return {
      draft: normalizeParsedRecipe({
        title: "Рецепт з фото",
        baseServings: 4,
        ingredients: [],
        instructionSteps: [],
        warnings: [
          "ШІ не зміг коректно оформити дані з фото. Спробуйте інше фото або вставте текст.",
        ],
      }),
      usedOpenAi: false,
    };
  }
}
