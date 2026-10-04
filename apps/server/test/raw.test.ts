import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAttendance } from "../src/parsers/attendance.ts";
import { parseGrades } from "../src/parsers/grades.ts";
import { parseHomeSummary } from "../src/parsers/home.ts";
import { parseMe } from "../src/parsers/me.ts";
import { parseNewsArticle, parseNewsList } from "../src/parsers/news.ts";
import { parseTimetable } from "../src/parsers/timetable.ts";

/** Runs only on machines with git-ignored captures from `npm run capture`. */
const rawDir = new URL("../../../fixtures/raw/", import.meta.url);
const raw = (name: string) => readFileSync(new URL(`${name}.html`, rawDir), "utf8");
const hasRaw = existsSync(new URL("hall.html", rawDir));

describe.skipIf(!hasRaw)("real captures", () => {
  it("parses identity from the hall", () => {
    const me = parseMe(raw("hall"));
    expect(me.studentId).toMatch(/^\d+$/);
    expect(me.userId).toMatch(/^\d+$/);
    expect(me.displayName).not.toBe("");
    expect(me.schoolName).not.toBe("");
  });

  it("parses the hall timetable", () => {
    const tt = parseTimetable(raw("hall"));
    if (process.env.ZS_DEBUG) {
      console.log(JSON.stringify({ weekStart: tt.weekStart, days: tt.days }, null, 1));
      for (const s of tt.slots) {
        const cells = s.days.map(
          (d) =>
            d.map((l) => `${l.subject}@${l.room ?? "-"}${l.canceled ? "[X]" : ""}${l.note ? `(${l.note})` : ""}`).join("+") || "·",
        );
        console.log(s.name, s.start, s.end, "|", cells.join(" | "));
      }
    }
    expect(tt.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(tt.days.length).toBeGreaterThanOrEqual(5);
    expect(tt.slots.length).toBeGreaterThan(0);
    expect(tt.slots.some((s) => s.start && s.end)).toBe(true);
    expect(tt.slots.flatMap((s) => s.days.flat()).length).toBeGreaterThan(0);
  });

  it("parses the hall summary modules", () => {
    const home = parseHomeSummary(raw("hall"));
    debug(home);
    expect(home.recentMarks.length).toBeGreaterThan(0);
    expect(home.recentPresences.every((p) => p.kind !== "other")).toBe(true);
    expect(home.events.every((e) => e.date)).toBe(true);
    expect(home.news.length).toBeGreaterThan(0);
  });

  it("parses grades", () => {
    const grades = parseGrades(raw("grades"));
    debug(grades.subjects.filter((s) => s.marks.length));
    const marks = grades.subjects.flatMap((s) => s.marks);
    expect(grades.subjects.length).toBeGreaterThan(5);
    expect(marks.length).toBeGreaterThan(0);
    expect(marks.every((m) => m.value && m.date)).toBe(true);
    expect(new Set(marks.map((m) => m.key)).size).toBe(marks.length);
  });

  it("parses attendance", () => {
    const att = parseAttendance(raw("presences"));
    debug(att);
    expect(att.totals.total).toBeGreaterThan(0);
    expect(att.totals.present + att.totals.absent).toBe(att.totals.total);
    expect(att.subjects.length).toBeGreaterThan(3);
  });

  it("parses the news list and an article", () => {
    const items = parseNewsList(raw("news"));
    expect(items.length).toBeGreaterThan(0);
    const article = parseNewsArticle(raw("news-article"), "1", new URL("https://s31.idu.edu.pl"));
    debug({ items: items.slice(0, 3), article });
    expect(article.title).not.toBe("");
    expect(article.html).not.toMatch(/style=|<script|Komentarze|<form/);
  });
});

function debug(value: unknown) {
  if (process.env.ZS_DEBUG) console.log(JSON.stringify(value, null, 1));
}
