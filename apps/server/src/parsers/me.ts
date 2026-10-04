import * as cheerio from "cheerio";
import type { Me } from "@zeszyt/shared";
import { IduError } from "../idu/errors.ts";
import { clean } from "./text.ts";

export function parseMe(html: string): Me {
  const $ = cheerio.load(html);
  $("br").replaceWith(" ");

  const profileHref = $('#account a[href*="/students/"]').first().attr("href") ?? "";
  const studentId = profileHref.match(/\/students\/(\d+)/)?.[1];
  if (!studentId) throw new IduError("parse_failed", "No student profile link");

  let userId: string | null = null;
  $("script").each((_, el) => {
    const match = $(el).text().match(/idu\.current_user\s*=\s*\{[^}]*?"id"\s*:\s*(\d+)/);
    if (match?.[1]) {
      userId = match[1];
      return false;
    }
  });

  const greeting = clean($("#login").text()) || clean($("#account").text());
  const displayName =
    greeting.match(/Witaj,?\s*([^!\n]+?)(?:\s*!|\s+Twój profil|\s+Wyloguj|$)/)?.[1]?.trim() ?? "";

  return {
    studentId,
    userId,
    displayName,
    schoolName: clean($("#school-name").text()),
  };
}
