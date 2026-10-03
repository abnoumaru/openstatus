import { expect } from "@std/expect";
import { describe, test } from "@std/testing/bdd";

import {
  addDaysInTimeZone,
  canonicalTimeZone,
  dateInTimeZone,
  endOfDayInTimeZone,
  isSameDayInTimeZone,
  startOfDayInTimeZone,
  timeZoneAbbreviation,
} from "./timezone";

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

describe("endOfDayInTimeZone / isSameDayInTimeZone", () => {
  test("UTC end of day is 23:59:59.999Z", () => {
    expect(
      endOfDayInTimeZone(new Date("2024-01-16T10:00:00Z"), "UTC").toISOString(),
    ).toBe("2024-01-16T23:59:59.999Z");
  });
  test("JST: 10:00Z and 15:00Z are the same local day; 14:59Z and 15:00Z are not", () => {
    expect(
      isSameDayInTimeZone(
        new Date("2024-01-15T10:00:00Z"),
        new Date("2024-01-15T14:59:00Z"),
        "Asia/Tokyo",
      ),
    ).toBe(true);
    expect(
      isSameDayInTimeZone(
        new Date("2024-01-15T14:59:00Z"),
        new Date("2024-01-15T15:00:00Z"),
        "Asia/Tokyo",
      ),
    ).toBe(false);
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

describe("dateInTimeZone", () => {
  test("returns the wall-clock calendar date", () => {
    expect(
      dateInTimeZone(new Date("2026-09-30T22:03:00Z"), "Asia/Tokyo"),
    ).toEqual({ year: 2026, month: 10, day: 1 });
    expect(dateInTimeZone(new Date("2026-09-30T22:03:00Z"), "UTC")).toEqual({
      year: 2026,
      month: 9,
      day: 30,
    });
  });
});

describe("canonicalTimeZone", () => {
  test("normalises case and keeps known zones", () => {
    expect(canonicalTimeZone("asia/tokyo")).toBe("Asia/Tokyo");
    expect(canonicalTimeZone("UTC")).toBe("UTC");
  });
  test("rejects unknown names", () => {
    expect(canonicalTimeZone("Mars/Olympus")).toBeUndefined();
    expect(canonicalTimeZone("")).toBeUndefined();
  });
});

describe("timeZoneAbbreviation", () => {
  test("zones in the table get their abbreviation", () => {
    expect(
      timeZoneAbbreviation("Asia/Tokyo", new Date("2026-10-03T00:00:00Z")),
    ).toBe("JST");
    expect(
      timeZoneAbbreviation("Europe/Berlin", new Date("2026-07-01T00:00:00Z")),
    ).toBe("CEST");
    expect(
      timeZoneAbbreviation("Europe/Berlin", new Date("2026-01-15T00:00:00Z")),
    ).toBe("CET");
    // southern hemisphere: daylight time in January
    expect(
      timeZoneAbbreviation(
        "Australia/Sydney",
        new Date("2026-01-15T00:00:00Z"),
      ),
    ).toBe("AEDT");
    expect(
      timeZoneAbbreviation(
        "Australia/Sydney",
        new Date("2026-07-01T00:00:00Z"),
      ),
    ).toBe("AEST");
  });
  test("zones outside the table yield undefined so callers can fall back", () => {
    expect(timeZoneAbbreviation("America/Los_Angeles")).toBeUndefined();
    expect(timeZoneAbbreviation("Asia/Kolkata")).toBeUndefined();
  });
});
