import type { Home, Me, Timetable } from "@zeszyt/shared";
import { api } from "../api.ts";
import { Card, CardLink, Empty, PageHeader, SyncBar } from "../components/Chrome.tsx";
import { formatDay, formatDayTime, localIsoDate } from "../lib/format.ts";
import { useSection } from "../lib/useSection.ts";
import { dayRows } from "../TimetableView.tsx";

export function StartPage({ me, onMenu, onHome }: { me: Me; onMenu: () => void; onHome: (home: Home) => void }) {
  const home = useSection("home", api.home, { onData: onHome });
  const data = home.entry?.data;

  return (
    <>
      <PageHeader title={`Cześć, ${me.displayName.split(" ")[0] || "uczniu"}`} subtitle={me.schoolName} onMenu={onMenu} />
      <SyncBar sync={home.sync} fetchedAt={home.entry?.fetchedAt ?? null} onRefresh={home.refresh} />
      {!data ? (
        <Empty>{home.sync.kind === "syncing" || !home.loaded ? "Wczytuję…" : "Brak zapisanych danych."}</Empty>
      ) : (
        <div className="stack">
          <TodayCard timetable={data.timetable} />

          <CardLink title="Nowe oceny" href="#oceny" />

          <Card title="Najbliższe wydarzenia" href="#wydarzenia">
            {data.events.length === 0 ? (
              <Empty>Nic w kalendarzu.</Empty>
            ) : (
              <ul className="rows">
                {data.events.slice(0, 3).map((e, i) => (
                  <li key={i} className="row">
                    <div className="row-main">
                      <span className="row-title">{e.title}</span>
                      <span className="row-sub">
                        {formatDayTime(e.date)}
                        {e.subject && ` · ${e.subject}`}
                      </span>
                    </div>
                    {e.kind === "exam" && <span className="badge tone-caution">Sprawdzian</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <CardLink title="Obecności" href="#obecnosci" />
          <CardLink title="Aktualności" href="#aktualnosci" />
        </div>
      )}
    </>
  );
}

function TodayCard({ timetable }: { timetable: Timetable }) {
  const today = localIsoDate();
  let index = timetable.days.findIndex((d) => d.date === today);
  if (index < 0) index = timetable.days.findIndex((d) => (d.date ?? "") > today);
  const day = timetable.days[index];
  const lessons = dayRows(timetable, index).flatMap(({ slot, lessons: inSlot }) =>
    inSlot.map((lesson) => ({ slot, lesson })),
  );
  const title = !day ? "Plan lekcji" : day.date === today ? "Dziś" : `${day.name}, ${formatDay(day.date)}`;

  return (
    <Card title={title} href="#plan">
      {lessons.length === 0 ? (
        <Empty>Brak lekcji.</Empty>
      ) : (
        <ul className="rows">
          {lessons.map(({ slot, lesson }, i) => (
            <li key={i} className={`row${lesson.canceled ? " row-canceled" : ""}`}>
              <span className="row-time">{slot.start}</span>
              <div className="row-main">
                <span className="row-title">{lesson.subject}</span>
                <span className="row-sub">{lesson.room ? `sala ${lesson.room}` : slot.name}</span>
              </div>
              {lesson.canceled && <span className="badge tone-warn">Odwołana</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
