import * as cheerio from "cheerio";
import type { Grades, Mark, SubjectGrades } from "@zeszyt/shared";
import { IduError } from "../idu/errors.ts";
import { clean, idFromHref, parsePlDate } from "./text.ts";

export function parseGrades(html: string): Grades {
  const $ = cheerio.load(html);
  $("br").replaceWith(" ");
  const table = $("table.marks-table").first();
  if (!table.length) throw new IduError("parse_failed", "No marks table");

  const subjects: SubjectGrades[] = table
    .find("tbody > tr")
    .toArray()
    .flatMap((row) => {
      const [nameCell, marksCell] = $(row).children("td").toArray();
      if (!nameCell) return [];
      const link = $(nameCell).find('a[href*="/subjects/"]').first();
      const subject = clean(link.text() || $(nameCell).text());
      const subjectId = idFromHref(link.attr("href"), "subjects");

      if (!marksCell) return [{ subject, subjectId, marks: [] }];
      const marks: Mark[] = $(marksCell)
        .find(".single-mark")
        .toArray()
        .map((node) => {
          const el = $(node);
          const valueEl = el.find(".value").first();
          const gradeId = valueEl.find('a[href^="#description_for_grade_"]').attr("href")?.match(/(\d+)$/)?.[1];
          const value = clean(valueEl.text());
          const category = clean(el.closest(".left-padded-12").parent().children("strong").first().text()) || null;

          const descEl = el.find(".desc").first().clone();
          const date = parsePlDate(descEl.find(".date").text());
          descEl.find(".date").remove();
          const description = clean(descEl.text()).replace(/^\(\s*/, "").replace(/\s*\)$/, "") || null;

          const comment = gradeId ? clean($(`#description_for_grade_${gradeId} p`).first().text()) : "";
          const weight = Number.parseFloat(el.attr("data-weight") ?? "");

          return {
            key: gradeId ? `g${gradeId}` : [subjectId, category, value, date, description].join("|"),
            value,
            category,
            description,
            comment: comment && comment.toLowerCase() !== value.toLowerCase() ? comment : null,
            date,
            weight: Number.isFinite(weight) ? weight : null,
            cumulative: el.attr("data-type") === "cumulative",
          };
        });

      return [{ subject, subjectId, marks }];
    });

  return { subjects };
}
