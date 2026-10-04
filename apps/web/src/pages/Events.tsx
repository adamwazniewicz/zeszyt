import type { Home, UpcomingEvent } from "@zeszyt/shared";
import { api } from "../api.ts";
import { Card, Empty, PageHeader, SyncBar } from "../components/Chrome.tsx";
import { formatDayLong } from "../lib/format.ts";
import { useSection } from "../lib/useSection.ts";

export function EventsPage({ onMenu, onHome }: { onMenu: () => void; onHome: (home: Home) => void }) {
  const home = useSection("home", api.home, { onData: onHome });
  const events = home.entry?.data.events ?? [];

  const byDay = new Map<string, UpcomingEvent[]>();
  for (const e of events) {
    const day = e.date?.slice(0, 10) ?? "";
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }

  return (
    <>
      <PageHeader title="Wydarzenia" backTo="#" onMenu={onMenu} />
      <SyncBar sync={home.sync} fetchedAt={home.entry?.fetchedAt ?? null} onRefresh={home.refresh} />
      {!home.entry ? (
        <Empty>Wczytuję…</Empty>
      ) : events.length === 0 ? (
        <Empty>Nic w kalendarzu.</Empty>
      ) : (
        <div className="stack">
          {[...byDay].map(([day, items]) => (
            <Card key={day} title={day ? formatDayLong(day) : "Bez daty"}>
              <ul className="rows">
                {items.map((e, i) => (
                  <li key={i} className="row">
                    {e.hasTime && <span className="row-time">{e.date!.slice(11, 16)}</span>}
                    <div className="row-main">
                      <span className="row-title">{e.title}</span>
                      {e.subject && <span className="row-sub">{e.subject}</span>}
                    </div>
                    {e.kind === "exam" && <span className="badge tone-caution">Sprawdzian</span>}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          <p className="fineprint">IDU pokazuje tylko najbliższe wydarzenia.</p>
        </div>
      )}
    </>
  );
}