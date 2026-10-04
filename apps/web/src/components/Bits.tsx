import type { PresenceKind } from "@zeszyt/shared";

const PRESENCE: Record<PresenceKind, { label: string; tone: string }> = {
  present: { label: "Obecny", tone: "good" },
  absent: { label: "Nieobecny", tone: "warn" },
  justified: { label: "Usprawiedliwiony", tone: "neutral" },
  late: { label: "Spóźnienie", tone: "caution" },
  other: { label: "Inne", tone: "neutral" },
};

export function PresenceBadge({ kind, label }: { kind: PresenceKind; label?: string }) {
  const p = PRESENCE[kind];
  return <span className={`badge tone-${p.tone}`}>{kind === "other" && label ? label : p.label}</span>;
}

/** Visual hint only; IDU marks mix numeric, pass/fail, points and free text. */
export function markTone(value: string): "good" | "warn" | "neutral" {
  const v = value.trim().toLowerCase();
  if (/^(nzal|not yet|nb\b|brak)/.test(v)) return "warn";
  if (/^(zal|pass)\b/.test(v)) return "good";
  const pct = v.match(/^(\d+(?:[.,]\d+)?)\s*%/);
  if (pct) return Number(pct[1]!.replace(",", ".")) >= 50 ? "good" : "warn";
  const frac = v.match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
  if (frac) {
    const ratio = Number(frac[1]!.replace(",", ".")) / Number(frac[2]!.replace(",", "."));
    return ratio >= 0.5 ? "good" : "warn";
  }
  const num = v.match(/^([1-6])[+-]?$/);
  if (num) return Number(num[1]) >= 3 ? "good" : num[1] === "1" ? "warn" : "neutral";
  return "neutral";
}
