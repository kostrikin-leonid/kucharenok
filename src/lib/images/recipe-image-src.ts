/** Допустимі URL для <img src> у клієнтських компонентах. */
export function recipeImageSrc(
  url: string | null | undefined,
): string | null {
  const u = url?.trim();
  if (!u) return null;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/") || /^https?:\/\//i.test(u)) return u;
  return null;
}
