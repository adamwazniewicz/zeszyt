export function clean(text: string | undefined | null): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

export function idFromHref(href: string | undefined, segment: string): string | null {
  if (!href) return null;
  return href.match(new RegExp(`/${segment}/(\\d+)`))?.[1] ?? null;
}

const PL_MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

/** "03 paź 2026, 16:51" → "2026-10-03T16:51"; "27 wrz 2026" → "2026-09-27". Also accepts "21.09.2026". */
export function parsePlDate(text: string | undefined | null): string | null {
  const s = clean(text).toLowerCase();
  const named = s.match(/(\d{1,2})\s+([a-ząćęłńóśźż]{3})[a-ząćęłńóśźż]*\s+(\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?/);
  const numeric = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?/);
  let day: string, month: number, year: string, hh: string | undefined, mm: string | undefined;
  if (named) {
    month = PL_MONTHS.indexOf(named[2]!) + 1;
    if (!month) return null;
    [day, year, hh, mm] = [named[1]!, named[3]!, named[4], named[5]];
  } else if (numeric) {
    month = Number(numeric[2]);
    [day, year, hh, mm] = [numeric[1]!, numeric[3]!, numeric[4], numeric[5]];
  } else {
    return null;
  }
  const date = `${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`;
  return hh && mm ? `${date}T${hh.padStart(2, "0")}:${mm}` : date;
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
