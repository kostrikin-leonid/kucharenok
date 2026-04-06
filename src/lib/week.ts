/** Monday-based week in local timezone. */
export function startOfWeekMonday(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeekSunday(start: Date): Date {
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  return d;
}

export function toDateOnly(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Календарна дата за UTC (узгодження з `toISOString()` / Prisma `@db.Date`). */
export function toDateOnlyUtc(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Дата страви в тижневому плані (Prisma `@db.Date`).
 * Лічиль лише UTC Y/M/D, щоб збігалося з тим, що повертається з БД після збереження
 * (інакше `getTime()` не збігається з `toDateOnly(addDays(...))` у не-UTC TZ).
 */
export function weeklyPlanItemDate(
  weekStartDate: Date,
  dayOffset: number,
): Date {
  return new Date(
    Date.UTC(
      weekStartDate.getUTCFullYear(),
      weekStartDate.getUTCMonth(),
      weekStartDate.getUTCDate() + dayOffset,
      0,
      0,
      0,
      0,
    ),
  );
}

/** Один календарний день для значень `@db.Date` (порівняння UTC-компонентів). */
export function isSameUtcDateOnly(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/** Понеділок поточного тижня + offset×7 днів (0 = цей тиждень, 1 = наступний …). */
export const PLAN_WEEK_OFFSET_MIN = 0;
export const PLAN_WEEK_OFFSET_MAX = 4;

export function parsePlanWeekOffset(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "0", 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(
    Math.max(n, PLAN_WEEK_OFFSET_MIN),
    PLAN_WEEK_OFFSET_MAX,
  );
}

export function weekMondayFromOffset(
  offset: number,
  anchor: Date = new Date(),
): Date {
  const base = toDateOnly(startOfWeekMonday(anchor));
  return toDateOnly(addDays(base, offset * 7));
}

export function weekOffsetForMonday(
  weekStart: Date,
  anchor: Date = new Date(),
): number | null {
  const base = toDateOnly(startOfWeekMonday(anchor)).getTime();
  const mon = toDateOnly(weekStart).getTime();
  const diffDays = Math.round((mon - base) / (1000 * 60 * 60 * 24));
  if (diffDays % 7 !== 0) return null;
  const o = diffDays / 7;
  if (o < PLAN_WEEK_OFFSET_MIN || o > PLAN_WEEK_OFFSET_MAX) return null;
  return o;
}
