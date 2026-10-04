import type { AttendanceCounts } from "@zeszyt/shared";
import { api } from "../api.ts";
import { Card, Empty, PageHeader, SyncBar } from "../components/Chrome.tsx";
import { formatPercent } from "../lib/format.ts";
import { useSection } from "../lib/useSection.ts";

const LOW_ATTENDANCE = 80;

function percentOf(c: AttendanceCounts): number | null {
  return c.percent ?? (c.total ? (c.present / c.total) * 100 : null);
}

export function AttendancePage({ onMenu }: { onMenu: () => void }) {
  const att = useSection("attendance", api.attendance);
  const data = att.entry?.data;
  const subjects = [...(data?.subjects ?? [])].sort((a, b) => (percentOf(a) ?? 101) - (percentOf(b) ?? 101));

  return (
    <>
      <PageHeader title="Obecności" backTo="#" onMenu={onMenu} />
      <SyncBar sync={att.sync} fetchedAt={att.entry?.fetchedAt ?? null} onRefresh={att.refresh} />
      {!data ? (
        <Empty>{att.loaded ? "Wczytuję obecności…" : ""}</Empty>
      ) : (
        <div className="stack">
          <section className="card attendance-hero">
            <div className="hero-number num">{formatPercent(percentOf(data.totals))}</div>
            <p className="muted">frekwencja w tym semestrze</p>
            <Bar value={percentOf(data.totals)} />
            <dl className="stats">
              <div>
                <dt>Obecności</dt>
                <dd className="num">
                  {data.totals.present}
                  <span className="muted">/{data.totals.total}</span>
                </dd>
              </div>
              <div>
                <dt>Nieobecności</dt>
                <dd className="num">{data.totals.absent}</dd>
                {data.totals.justified > 0 && <dd className="stat-sub">w tym uspraw. {data.totals.justified}</dd>}
              </div>
              <div>
                <dt>Spóźnienia</dt>
                <dd className="num">{data.totals.late}</dd>
              </div>
            </dl>
          </section>

          <Card title="Według przedmiotu">
            <ul className="rows">
              {subjects.map((s) => {
                const pct = percentOf(s);
                const low = pct !== null && pct < LOW_ATTENDANCE;
                return (
                  <li key={s.subjectId ?? s.subject} className={`row row-stacked${low ? " row-low" : ""}`}>
                    <div className="row-line">
                      <span className="row-title">{s.subject}</span>
                      <span className="row-value num">{formatPercent(pct)}</span>
                    </div>
                    <Bar value={pct} low={low} />
                    <span className="row-sub num">
                      {s.present}/{s.total} obecności
                      {s.absent > 0 && ` · ${s.absent} nieob.${s.justified ? ` (${s.justified} uspraw.)` : ""}`}
                      {s.late > 0 && ` · ${s.late} spóźn.`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
          <p className="fineprint">Przedmioty poniżej {LOW_ATTENDANCE}% są wyróżnione.</p>
        </div>
      )}
    </>
  );
}

function Bar({ value, low = false }: { value: number | null; low?: boolean }) {
  return (
    <div className={`bar${low ? " bar-low" : ""}`} role="presentation">
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
    </div>
  );
}
