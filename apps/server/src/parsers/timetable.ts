import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import type { DayEvent, Lesson, Timetable, TimetableDay, TimetableSlot } from "@zeszyt/shared";
import { IduError } from "../idu/errors.ts";
import { addDays, clean, idFromHref } from "./text.ts";

const WEEKDAY = /^(poniedziałek|wtorek|środa|czwartek|piątek|sobota|niedziela|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;

export function parseTimetable(html: string): Timetable {
  const $ = cheerio.load(html);
  $("br").replaceWith(" ");
  const schedule = $(".schedule").first();
  const table = schedule.find("table").first();
  if (!table.length) throw new IduError("parse_failed", "No .schedule table");

  const weekStart =
    clean(schedule.text()).match(/\d{4}-\d{2}-\d{2}/)?.[0] ??
    clean(schedule.parent().text()).match(/\d{4}-\d{2}-\d{2}/)?.[0] ??
    null;

  const headRows = table.children("thead").children("tr").toArray();
  const dayRow = headRows.at(-1);
  if (!dayRow) throw new IduError("parse_failed", "No timetable header");

  const dayCells = $(dayRow).children("th,td").toArray();
  const dayOffset = dayCells.findIndex((cell) => WEEKDAY.test(clean($(cell).text())));
  if (dayOffset < 0) throw new IduError("parse_failed", "No weekday names in header");
  const dayNames = dayCells.slice(dayOffset).map((cell) => clean($(cell).text()));

  const eventsByDay: DayEvent[][] = dayNames.map(() => []);
  const eventRow = headRows.length > 1 ? headRows[0] : undefined;
  if (eventRow) {
    const cells = $(eventRow).children("th,td").toArray();
    const offset = cells.length - dayNames.length;
    cells.slice(Math.max(offset, 0)).forEach((cell, i) => {
      $(cell)
        .find(".callendar_event")
        .each((_, ev) => {
          const link = $(ev).is("a") ? $(ev) : $(ev).find("a").first();
          eventsByDay[i]?.push({
            title: clean($(ev).text()),
            eventId: idFromHref(link.attr("href"), "callendar_events"),
          });
        });
    });
  }

  const days: TimetableDay[] = dayNames.map((name, i) => ({
    name,
    date: weekStart ? addDays(weekStart, i) : null,
    events: eventsByDay[i] ?? [],
  }));

  const bodyRows = [
    ...table.children("tr").toArray(),
    ...table.children("tbody").children("tr").toArray(),
  ];

  const slots: TimetableSlot[] = bodyRows.flatMap((row) => {
    const cells = $(row).children("td,th").toArray();
    const [slotCell, ...dayCellsInRow] = cells;
    if (!slotCell) return [];
    const [start, end] = parseTimeRange($(slotCell).attr("title"));
    return [
      {
        name: clean($(slotCell).text()),
        start,
        end,
        days: dayNames.map((_, i) => {
          const cell = dayCellsInRow[i];
          return cell ? parseLessons($, cell) : [];
        }),
      },
    ];
  });

  return { weekStart, days, slots };
}

function parseTimeRange(title: string | undefined): [string | null, string | null] {
  const match = title?.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  return match ? [match[1]!.padStart(5, "0"), match[2]!.padStart(5, "0")] : [null, null];
}

function parseLessons($: cheerio.CheerioAPI, cell: AnyNode): Lesson[] {
  return $(cell)
    .find(".lesson-cell")
    .toArray()
    .map((el: Element) => {
      const lesson = $(el);
      const td = lesson.closest("td");
      const hasClass = (name: string) => lesson.hasClass(name) || td.hasClass(name);

      const subjectEl = lesson.find(".subject").first();
      const subjectLink = subjectEl.find('a[href^="/subjects/"]').first();
      const teachers = clean(subjectEl.attr("title")).replace(/^prowadzący:\s*/i, "") || null;

      const roomLink = lesson.find('.location a[href^="/rooms/"]').first();
      const roomText = clean(roomLink.text() || lesson.find(".location").text());
      const room = roomText && roomText !== "." ? roomText : null;

      const note =
        clean(
          lesson
            .children("div")
            .not(".subject,.location")
            .toArray()
            .map((d) => $(d).text())
            .join(" "),
        ) || null;

      return {
        subject: clean(subjectLink.text() || subjectEl.text()),
        subjectId: idFromHref(subjectLink.attr("href"), "subjects"),
        teachers,
        room,
        roomId: room ? idFromHref(roomLink.attr("href"), "rooms") : null,
        canceled: hasClass("canceled"),
        late: hasClass("lateness-in-plan"),
        absent: hasClass("absence-in-plan"),
        note,
      };
    });
}
