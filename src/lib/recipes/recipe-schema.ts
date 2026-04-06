import { z } from "zod";

export const ingSchema = z.object({
  ingredientId: z.string().optional().nullable(),
  preparationRecipeId: z.string().optional().nullable(),
  customName: z.string().optional().nullable(),
  quantity: z.coerce.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  isToTaste: z.boolean().optional(),
});

export const recipeBaseSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  imagePublicId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  tagIds: z.array(z.string()).default([]),
  baseServings: z.coerce.number().positive(),
  prepTimeMinutes: z.coerce.number().int().optional().nullable(),
  cookTimeMinutes: z.coerce.number().int().optional().nullable(),
  totalTimeMinutes: z.coerce.number().int().optional().nullable(),
  difficulty: z.string().optional().nullable(),
  instructionSteps: z.array(z.string()).default([]),
  kcalPerServing: z.coerce.number().optional().nullable(),
  proteinPerServing: z.coerce.number().optional().nullable(),
  fatPerServing: z.coerce.number().optional().nullable(),
  carbsPerServing: z.coerce.number().optional().nullable(),
  nutritionSource: z.enum(["manual", "ai_estimated"]).optional().nullable(),
  nutritionConfidence: z.enum(["low", "medium", "high"]).optional().nullable(),
  sourceType: z.enum(["manual", "ai_text", "ai_image"]).default("manual"),
  isArchived: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  hiddenFromSuggestions: z.boolean().optional(),
  isPreparation: z.boolean().optional(),
  ingredients: z.array(ingSchema),
});
