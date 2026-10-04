const DAY_MS = 86_400_000;

function toDate(iso: string): Date {
  return new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
}

export function localIsoDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "dziś", "jutro", "wczoraj", or "pt, 9 paź". */
export function formatDay(iso: string | null): string {
  if (!iso) return "";
  const day = iso.slice(0, 10);
  const diff = Math.round((toDate(day).getTime() - toDate(localIsoDate()).getTime()) / DAY_MS);
  if (diff === 0) return "dziś";
  if (diff === 1) return "jutro";
  if (diff === -1) return "wczoraj";
  return toDate(day).toLocaleDateString("pl-PL", { weekday: "short", day: "numeric", month: "short" });
}

/** "Dziś", "Jutro", or "Piątek, 9 października". */
export function formatDayLong(iso: string): string {
  const short = formatDay(iso);
  if (["dziś", "jutro", "wczoraj"].includes(short)) return short.charAt(0).toUpperCase() + short.slice(1);
  const text = toDate(iso.slice(0, 10)).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDayTime(iso: string | null): string {
  if (!iso) return "";
  const day = formatDay(iso);
  return iso.includes("T") ? `${day}, ${iso.slice(11, 16)}` : day;
}

export function formatAgo(ts: number): string {
  const minutes = Math.round((Date.now() - ts) / 60_000);
  if (minutes < 1) return "przed chwilą";
  if (minutes < 60) return `${minutes} min temu`;
  return new Date(ts).toLocaleString("pl-PL", { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

export function formatPercent(value: number | null): string {
  return value === null ? "–" : `${value.toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%`;
}
