// Intl is the only zone database available in every runtime we ship to
// (Node, Deno, edge), so day boundaries are derived from formatToParts rather
// than a tz library — services has no date-fns dependency to lean on.

export const MS_PER_DAY = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function wallClockParts(date: Date, timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  const p = { year: 0, month: 1, day: 1, hour: 0, minute: 0, second: 0 };
  for (const { type, value } of f.formatToParts(date)) {
    if (type in p) p[type as keyof typeof p] = Number(value);
  }
  return p;
}

/** Offset of `timeZone` at `date` in ms: wall clock minus UTC. */
export function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const p = wallClockParts(date, timeZone);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wall - Math.floor(date.getTime() / 1000) * 1000;
}

/** The instant at which the local day containing `date` begins in `timeZone`. */
export function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  const p = wallClockParts(date, timeZone);
  const midnightAsUTC = Date.UTC(p.year, p.month - 1, p.day);
  // The offset at `date` may differ from the offset at midnight on a DST day,
  // so take a first guess and re-read the offset there.
  const guess = midnightAsUTC - timeZoneOffsetMs(date, timeZone);
  return new Date(midnightAsUTC - timeZoneOffsetMs(new Date(guess), timeZone));
}

/**
 * The start of the local day `days` days after the one starting at `dayStart`.
 * Snaps from local noon of the target day, so a 23h/25h DST day on the way
 * cannot push the result into a neighbouring day.
 */
export function addDaysInTimeZone(
  dayStart: Date,
  days: number,
  timeZone: string,
): Date {
  const noon = dayStart.getTime() + days * MS_PER_DAY + 12 * 3_600_000;
  return startOfDayInTimeZone(new Date(noon), timeZone);
}

/** Wall-clock calendar date of `date` in `timeZone`. */
export function dateInTimeZone(date: Date, timeZone: string) {
  const { year, month, day } = wallClockParts(date, timeZone);
  return { year, month, day };
}

/**
 * The IANA name Intl resolves `timeZone` to ("asia/tokyo" → "Asia/Tokyo"),
 * or undefined when it is not a zone at all. ClickHouse is case-sensitive, so
 * anything stored or sent to Tinybird must go through here first.
 */
export function canonicalTimeZone(timeZone: string): string | undefined {
  if (!timeZone) return undefined;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone }).resolvedOptions()
      .timeZone;
  } catch {
    return undefined;
  }
}

/** Last ms of the local day containing `date` in `timeZone`. */
export function endOfDayInTimeZone(date: Date, timeZone: string): Date {
  const start = startOfDayInTimeZone(date, timeZone);
  return new Date(addDaysInTimeZone(start, 1, timeZone).getTime() - 1);
}

export function isSameDayInTimeZone(
  a: Date,
  b: Date,
  timeZone: string,
): boolean {
  return (
    startOfDayInTimeZone(a, timeZone).getTime() ===
    startOfDayInTimeZone(b, timeZone).getTime()
  );
}
