import type { GameDateSummary } from "@/contracts/game";

const DAY_IN_MILLISECONDS = 86_400_000;

export function resolveScheduleDate(
  requestedDate: string | null,
  gameDates: GameDateSummary[],
): string | undefined {
  const defaultDate = gameDates[0]?.date;
  if (!requestedDate || gameDates.length === 0) return defaultDate;

  const chronological = gameDates
    .map((entry) => entry.date)
    .toSorted((left, right) => left.localeCompare(right));
  const firstDate = chronological[0];
  const lastDate = chronological.at(-1);

  if (!firstDate || !lastDate) return defaultDate;
  if (requestedDate >= firstDate && requestedDate <= lastDate) {
    return requestedDate;
  }

  return requestedDate < firstDate ? firstDate : lastDate;
}

export function scheduleWeek(date: string): string[] {
  const parsed = parseUtcDate(date);
  const mondayOffset = (parsed.getUTCDay() + 6) % 7;
  const monday = addUtcDays(parsed, -mondayOffset);

  return Array.from({ length: 7 }, (_, index) =>
    formatUtcDate(addUtcDays(monday, index)),
  );
}

export function scheduleMonth(date: string): Array<string | null> {
  const parsed = parseUtcDate(date);
  const year = parsed.getUTCFullYear();
  const month = parsed.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const cells: Array<string | null> = Array.from(
    { length: mondayOffset },
    () => null,
  );

  for (let day = 1; day <= lastDay; day += 1) {
    cells.push(formatUtcDate(new Date(Date.UTC(year, month, day))));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function shiftScheduleMonth(date: string, months: number): string {
  const parsed = parseUtcDate(date);
  return formatUtcDate(
    new Date(
      Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + months, 1),
    ),
  );
}

export function scheduleMonthKey(date: string): string {
  return date.slice(0, 7);
}

export function formatScheduleMonth(date: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseUtcDate(date));
}

export function shiftScheduleDate(date: string, days: number): string {
  return formatUtcDate(addUtcDays(parseUtcDate(date), days));
}

export function clampScheduleDate(
  date: string,
  firstDate: string,
  lastDate: string,
): string {
  if (date < firstDate) return firstDate;
  if (date > lastDate) return lastDate;
  return date;
}

export function formatScheduleDay(date: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    timeZone: "UTC",
  }).format(parseUtcDate(date));
}

export function formatScheduleMonthDay(date: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parseUtcDate(date));
}

function parseUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_IN_MILLISECONDS);
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
