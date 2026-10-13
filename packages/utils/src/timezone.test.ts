import { expect } from "@std/expect";
import { describe, test } from "@std/testing/bdd";

import { addDaysInTimeZone, startOfDayInTimeZone } from "./timezone";

describe("startOfDayInTimeZone", () => {
  test("UTC is plain UTC midnight", () => {
    const d = new Date("2026-10-01T07:03:00Z");
    expect(startOfDayInTimeZone(d, "UTC").toISOString()).toBe(
      "2026-10-01T00:00:00.000Z",
    );
  });

  test("Asia/Tokyo: 07:03 JST on Oct 1 starts at 15:00Z the day before", () => {
    const d = new Date("2026-09-30T22:03:00Z"); // 2026-10-01 07:03 JST
    expect(startOfDayInTimeZone(d, "Asia/Tokyo").toISOString()).toBe(
      "2026-09-30T15:00:00.000Z",
    );
  });

  test("negative offset: 22:00Z on Sep 30 is still Sep 30 in Los Angeles", () => {
    const d = new Date("2026-09-30T22:00:00Z"); // 15:00 PDT
    expect(startOfDayInTimeZone(d, "America/Los_Angeles").toISOString()).toBe(
      "2026-09-30T07:00:00.000Z",
    );
  });

  test("DST fall-back day in Berlin is 25h long", () => {
    const start = startOfDayInTimeZone(
      new Date("2026-10-25T12:00:00Z"),
      "Europe/Berlin",
    );
    const next = startOfDayInTimeZone(
      new Date("2026-10-26T12:00:00Z"),
      "Europe/Berlin",
    );
    expect(start.toISOString()).toBe("2026-10-24T22:00:00.000Z"); // 00:00 CEST
    expect((next.getTime() - start.getTime()) / 3_600_000).toBe(25);
  });

  test("an instant exactly at local midnight maps to itself", () => {
    const d = new Date("2026-09-30T15:00:00Z"); // 00:00 JST Oct 1
    expect(startOfDayInTimeZone(d, "Asia/Tokyo").getTime()).toBe(d.getTime());
  });
});

describe("addDaysInTimeZone", () => {
  test("steps across the Berlin fall-back day as 25 hours", () => {
    const start = new Date("2026-10-24T22:00:00Z"); // 00:00 CEST, Oct 25
    const next = addDaysInTimeZone(start, 1, "Europe/Berlin");
    expect(next.toISOString()).toBe("2026-10-25T23:00:00.000Z"); // 00:00 CET, Oct 26
    expect((next.getTime() - start.getTime()) / 3_600_000).toBe(25);
  });
  test("negative steps walk back over ordinary days", () => {
    const start = new Date("2026-09-30T15:00:00Z"); // 00:00 JST, Oct 1
    expect(addDaysInTimeZone(start, -2, "Asia/Tokyo").toISOString()).toBe(
      "2026-09-28T15:00:00.000Z",
    );
  });
});
