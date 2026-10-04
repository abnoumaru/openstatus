"use client";

import {
  StatusBlocksI18nProvider,
  type StatusBlocksLabels,
} from "@openstatus/ui/components/blocks/status-i18n";
import { timeZoneAbbreviation, timeZoneOffsetMs } from "@openstatus/utils";
import { useExtracted, useLocale } from "next-intl";
import { useMemo } from "react";

import {
  formatDate,
  formatDateRange,
  formatDateRangeParts,
  formatDateTime,
} from "../../lib/formatter";
import { useStatusPage } from "../status-page/floating-button";

// "JST"-style abbreviation where one is well known, otherwise "GMT+9" built
// from the offset — never Intl's zone *names*, whose spelling differs between
// the server's and the browser's ICU and would break hydration.
function zoneLabel(timeZone: string) {
  if (timeZone === "UTC") return "UTC";
  const abbreviation = timeZoneAbbreviation(timeZone);
  if (abbreviation) return abbreviation;
  const minutes = timeZoneOffsetMs(new Date(), timeZone) / 60_000;
  const sign = minutes < 0 ? "-" : "+";
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  return `GMT${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

// `Oct 03, 2026 14:41` in the page zone — same shape as the UTC default so
// the banner looks identical whichever zone it is in.
function formatStamp(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("month")} ${get("day")}, ${get("year")} ${get("hour")}:${get("minute")}`;
}

/**
 * StatusBlocksProvider
 *
 * Bridges next-intl translations + locale-aware date formatters into the
 * `@openstatus/ui` blocks. Mounted once at the locale layout — every block
 * rendered below it (banner, bar, component, events, feed, blank) reads
 * translated labels via `useStatusBlocksLabels()`.
 *
 * Extractor note: the t("…") keys below must remain literal strings so the
 * next-intl extractor can pick them up from `apps/status-page/src/...`.
 */
export function StatusBlocksProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useExtracted();
  const locale = useLocale();
  const { timezone } = useStatusPage();

  const value = useMemo<StatusBlocksLabels>(() => {
    // Status-page timestamps render in the page zone; the suffix tells viewers which.
    const withZone = (value: string) => `${value} (${zoneLabel(timezone)})`;
    return {
      systemStatus: {
        success: {
          long: t("All Systems Operational"),
          short: t("Operational"),
        },
        degraded: { long: t("Degraded Performance"), short: t("Degraded") },
        error: { long: t("Downtime Performance"), short: t("Downtime") },
        info: { long: t("Maintenance"), short: t("Maintenance") },
        empty: { long: t("No Data"), short: t("No Data") },
      },
      incidentStatus: {
        resolved: t("Resolved"),
        monitoring: t("Monitoring"),
        identified: t("Identified"),
        investigating: t("Investigating"),
      },
      requestStatus: {
        success: t("Normal"),
        degraded: t("Degraded"),
        error: t("Error"),
        info: t("Maintenance"),
        empty: t("No Data"),
      },
      componentImpact: {
        operational: t("Operational"),
        degraded_performance: t("Degraded performance"),
        partial_outage: t("Partial outage"),
        major_outage: t("Major outage"),
      },

      today: t("today"),
      ongoing: t("ongoing"),
      reportResolved: t("Report resolved"),
      noRecentNotifications: t("No recent notifications"),
      noRecentNotificationsDescription: t(
        "There have been no reports within the last 7 days.",
      ),
      noReports: t("No reports found"),
      noReportsDescription: t("No reports found for this status page."),
      noPublicMonitors: t("No public monitors"),
      noPublicMonitorsDescription: t(
        "No public monitors have been added to this page.",
      ),

      themeNames: {
        light: t("Light"),
        dark: t("Dark"),
        system: t("System"),
      },
      ariaToggleTheme: t("Toggle theme"),

      subscribe: t("Get updates"),
      subscribeRssDescription: t("Get the RSS feed"),
      subscribeAtomDescription: t("Get the Atom feed"),
      subscribeJsonDescription: t("Get the JSON updates"),
      subscribeSlackDescription: t(
        "For status updates in Slack, paste the text below into any channel.",
      ),
      subscribeSshDescription: t("Get status via SSH"),
      linkCopiedToClipboard: t("Link copied to clipboard"),
      ariaCopyLink: t("Copy Link"),

      poweredBy: t("powered by"),
      getInTouch: t("Get in touch"),

      ariaStatusTracker: t("Status tracker"),
      ariaDayStatus: (n: number) => t("Day {n} status", { n: String(n) }),
      clickAgainToUnpin: t("Click again to unpin"),

      calendarTitle: t("Calendar"),

      durationIn: (duration: string) => t("(in {duration})", { duration }),
      durationEarlier: (timeFromLast: string) =>
        t("({timeFromLast} earlier)", { timeFromLast }),
      durationFor: (duration: string) => t("(for {duration})", { duration }),
      durationAcross: (duration: string) =>
        t("across {duration}", { duration }),

      formatDate: (d: Date) =>
        withZone(formatDate(d, { locale, timeZone: timezone })),
      formatDateShort: (d: Date) =>
        formatDate(d, { month: "short", locale, timeZone: timezone }),
      formatDateTime: (d: Date) =>
        withZone(formatDateTime(d, locale, timezone)),
      formatTimestamp: (d: Date) => withZone(formatStamp(d, timezone)),
      formatDateRange: (from?: Date, to?: Date) => {
        const range = formatDateRange(from, to, locale, timezone);
        return from || to ? withZone(range) : range;
      },
      formatDateRangeParts: (from: Date, to: Date) => {
        const { from: start, to: end } = formatDateRangeParts(
          from,
          to,
          locale,
          timezone,
        );
        return { from: start, to: withZone(end) };
      },
    };
  }, [t, locale, timezone]);

  return (
    <StatusBlocksI18nProvider value={value}>
      {children}
    </StatusBlocksI18nProvider>
  );
}
