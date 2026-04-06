"use server";

import {
  parseRecipeFromImage,
  parseRecipeFromText,
  type ParseRecipeOutcome,
} from "@/lib/ai/recipe-parser";
import { uk } from "@/lib/i18n/uk";

export async function parseRecipeTextAction(
  text: string,
): Promise<ParseRecipeOutcome> {
  return parseRecipeFromText(text);
}

export async function parseRecipeImageAction(
  formData: FormData,
): Promise<ParseRecipeOutcome> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error(uk.aiImport.errors.noFile);
  }
  return parseRecipeFromImage(file);
}
