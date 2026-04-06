/** Query string for /plan week navigation (preserves optional filters). */
export function planWeekPath(
  weekOffset: number,
  opts?: { showPreparations?: boolean },
): string {
  const p = new URLSearchParams();
  if (weekOffset !== 0) p.set("w", String(weekOffset));
  if (opts?.showPreparations) p.set("prep", "1");
  const q = p.toString();
  return q ? `/plan?${q}` : "/plan";
}
