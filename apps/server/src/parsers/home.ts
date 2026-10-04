import * as cheerio from "cheerio";
import type { PresenceKind, RecentMark, RecentPresence, UpcomingEvent } from "@zeszyt/shared";
import { parseNewsItems } from "./news.ts";
import { clean, idFromHref, parsePlDate } from "./text.ts";

export function presenceKind(label: string): PresenceKind {
  const s = label.toLowerCase();
  if (s.includes("uspraw")) return "justified";
  if (s.includes("nieobec")) return "absent";
  if (s.includes("spóźn")) return "late";
  if (s.includes("obecn")) return "present";
  return "other";
}

/** The dashboard modules shown next to the timetable on IDU's hall page. */
export function parseHomeSummary(html: string) {
  const $ = cheerio.load(html);
  $("br").replaceWith(" ");

  const subjectOf = (el: cheerio.Cheerio<any>) => {
    const link = el.find(".subject a").first();
    return { subject: clean(link.text() || el.find(".subject").text()), subjectId: idFromHref(link.attr("href"), "subjects") };
  };

  const recentMarks: RecentMark[] = $(".profile-event.mark")
    .toArray()
    .map((node) => {
      const el = $(node);
      return {
        ...subjectOf(el),
        label: clean(el.find(".name").text()),
        description: clean(el.find(".description").text()).replace(/^\((.*)\)$/, "$1") || null,
        date: parsePlDate(el.find(".date").text()),
      };
    });

  const recentPresences: RecentPresence[] = $(".profile-event.presence")
    .toArray()
    .map((node) => {
      const el = $(node);
      const label = clean(el.find(".name").text());
      return { ...subjectOf(el), label, kind: presenceKind(label), date: parsePlDate(el.find(".date").text()) };
    });

  const events: UpcomingEvent[] = $(".profile-event.callendar-event-on-dash")
    .toArray()
    .map((node) => {
      const el = $(node);
      const name = clean(el.find(".name").text());
      const isExam = el.find('a[href*="/subjects/"]').length > 0;
      const subjectMatch = isExam ? name.match(/^(.*)\s+\(([^()]+)\)$/) : null;
      const date = parsePlDate(el.find(".date").text());
      return {
        title: subjectMatch ? subjectMatch[1]!.trim() : name,
        subject: subjectMatch ? subjectMatch[2]!.trim() : null,
        kind: isExam ? "exam" : "event",
        date,
        hasTime: date?.includes("T") ?? false,
      };
    });

  return { recentMarks, recentPresences, events, news: parseNewsItems($) };
}
