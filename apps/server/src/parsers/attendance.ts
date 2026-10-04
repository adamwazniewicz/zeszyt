import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { Attendance, AttendanceCounts } from "@zeszyt/shared";
import { IduError } from "../idu/errors.ts";
import { clean, idFromHref } from "./text.ts";

function counts($: cheerio.CheerioAPI, cells: AnyNode[]): AttendanceCounts {
  const [presentCell, absentCell, lateCell] = cells.map((c) => clean($(c).text()));
  const present = presentCell?.match(/(\d+)\s*\/\s*(\d+)(?:\s*\(([\d,.]+)%\))?/);
  const absent = absentCell?.match(/(\d+)/);
  const justified = absentCell?.match(/usprawiedliwione:\s*(\d+)/);
  const late = lateCell?.match(/(\d+)/);
  return {
    present: Number(present?.[1] ?? 0),
    total: Number(present?.[2] ?? 0),
    percent: present?.[3] ? Number(present[3].replace(",", ".")) : null,
    absent: Number(absent?.[1] ?? 0),
    justified: Number(justified?.[1] ?? 0),
    late: Number(late?.[1] ?? 0),
  };
}

export function parseAttendance(html: string): Attendance {
  const $ = cheerio.load(html);
  const table = $("table")
    .filter((_, t) => clean($(t).find("thead th").first().text()) === "Przedmiot")
    .first();
  const rows = table.find("tbody > tr").toArray();
  const totalsRow = rows.find((r) => clean($(r).children("td").first().text()).toLowerCase() === "razem");
  if (!totalsRow) throw new IduError("parse_failed", "No attendance totals row");

  return {
    totals: counts($, $(totalsRow).children("td").toArray().slice(1)),
    subjects: rows
      .filter((r) => $(r).hasClass("js-presences-details"))
      .map((r) => {
        const [nameCell, ...rest] = $(r).children("td").toArray();
        const link = $(nameCell!).find("a").first();
        return {
          subject: clean(link.text() || $(nameCell!).text()),
          subjectId: idFromHref(link.attr("href"), "subjects"),
          ...counts($, rest),
        };
      }),
  };
}
