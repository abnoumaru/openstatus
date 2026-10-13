import { expect } from "@std/expect";
import { describe, test } from "@std/testing/bdd";

import {
  dayWindowOf,
  fillStatusDataFor45Days,
  isDateWithinEvent,
} from "./events";

describe("fillStatusDataFor45Days in a zone with DST", () => {
  test("each day ends where the next begins, so DST days keep their real length", () => {
    const rows = fillStatusDataFor45Days([], "1", 45, "Europe/Berlin");
    for (let i = 0; i < rows.length - 1; i++) {
      expect(rows[i].dayEnd).toBe(rows[i + 1].day);
    }
    const lengthsH = rows.map(
      (r) =>
        (dayWindowOf(r).end.getTime() - dayWindowOf(r).start.getTime()) /
        3_600_000,
    );
    // every window is a real local day: 23, 24 or 25 hours
    expect(lengthsH.every((h) => h === 23 || h === 24 || h === 25)).toBe(true);
  });

  test("UTC rows are plain 24h windows starting at midnight", () => {
    const rows = fillStatusDataFor45Days([], "1", 3, "UTC");
    for (const r of rows) {
      expect(r.day.endsWith("T00:00:00.000Z")).toBe(true);
      expect(
        dayWindowOf(r).end.getTime() - dayWindowOf(r).start.getTime(),
      ).toBe(86_400_000);
    }
  });
});

describe("isDateWithinEvent with a real window", () => {
  const event = {
    id: 1,
    name: "late",
    type: "incident" as const,
    status: "error" as const,
    from: new Date("2026-10-25T22:30:00Z"), // 23:30 CET on the 25h fall-back day
    to: new Date("2026-10-25T22:45:00Z"),
  };
  const window = dayWindowOf({
    day: "2026-10-24T22:00:00.000Z",
    dayEnd: "2026-10-25T23:00:00.000Z",
  });

  test("an event in the 25th hour belongs to that day", () => {
    expect(isDateWithinEvent(window, event)).toBe(true);
  });
  test("…but a fixed 24h window would have dropped it", () => {
    expect(isDateWithinEvent(new Date("2026-10-24T22:00:00Z"), event)).toBe(
      false,
    );
  });
});
