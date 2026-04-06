/**
 * Єдина точка конфігурації ШІ для імпорту рецептів.
 * Змінні середовища: OPENAI_API_KEY, OPENAI_MODEL
 */
export function getOpenAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const model = (process.env.OPENAI_MODEL ?? "gpt-4o-mini").trim();
  return {
    apiKey,
    model,
    enabled: apiKey.length > 0,
  };
}
