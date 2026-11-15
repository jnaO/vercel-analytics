export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

const DEFAULT_RANGE: Range = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseRange(param: string | string[] | null | undefined): Range {
  return RANGES.find((r) => String(r) === param) ?? DEFAULT_RANGE;
}

/** UTC-midnight dates, oldest first, ending on the UTC day of `now`. */
export function daysInRange(n: number, now: Date): Date[] {
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return Array.from(
    { length: n },
    (_, i) => new Date(today - (n - 1 - i) * DAY_MS),
  );
}
