import { useEffect, useState } from "react";
import type { Lesson, Timetable, TimetableSlot } from "@zeszyt/shared";
import { localIsoDate } from "./lib/format.ts";

const SHORT_DAY: Record<string, string> = {
  poniedziałek: "Pn",
  wtorek: "Wt",
  środa: "Śr",
  czwartek: "Cz",
  piątek: "Pt",
  sobota: "So",
  niedziela: "Nd",
};

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function toMinutes(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
}

function useMinuteTick(): number {
  const [minute, setMinute] = useState(nowMinutes);
  useEffect(() => {
    const id = setInterval(() => setMinute(nowMinutes()), 30_000);
    return () => clearInterval(id);
  }, []);
  return minute;
}

const FREE_PERIOD: Lesson = {
  subject: "Okienko",
  subjectId: null,
  teachers: null,
  room: null,
  roomId: null,
  canceled: false,
  late: false,
  absent: false,
  note: null,
};

/** Slots with lessons on one day; empty slots between the first and last lesson become "Okienko". */
export function dayRows(timetable: Timetable, dayIndex: number): { slot: TimetableSlot; lessons: Lesson[] }[] {
  const rows = timetable.slots.map((slot) => ({ slot, lessons: slot.days[dayIndex] ?? [] }));
  const first = rows.findIndex((r) => r.lessons.length > 0);
  const last = rows.findLastIndex((r) => r.lessons.length > 0);
  if (first < 0) return [];
  return rows
    .slice(first, last + 1)
    .map((r) => (r.lessons.length > 0 ? r : { slot: r.slot, lessons: [FREE_PERIOD] }));
}

export function TimetableView({ timetable }: { timetable: Timetable }) {
  const today = localIsoDate();
  const todayIndex = timetable.days.findIndex((d) => d.date === today);
  const [selected, setSelected] = useState(Math.max(todayIndex, 0));
  const minute = useMinuteTick();

  const day = timetable.days[selected];
  const isToday = day?.date === today;
  const rows = dayRows(timetable, selected);

  return (
    <section className="timetable">
      <nav className="day-tabs" aria-label="Dzień tygodnia">
        {timetable.days.map((d, i) => (
          <button
            key={d.name}
            className="day-tab"
            aria-pressed={i === selected}
            onClick={() => setSelected(i)}
          >
            <span className="day-tab-name">{SHORT_DAY[d.name.toLowerCase()] ?? d.name.slice(0, 2)}</span>
            <span className="day-tab-date">{d.date ? Number(d.date.slice(8, 10)) : ""}</span>
            {d.date === today && <span className="day-tab-dot" aria-label="dziś" />}
          </button>
        ))}
      </nav>

      <h2 className="day-heading">
        {day?.name}
        {day?.date && (
          <span className="muted">
            {" "}
            {new Date(`${day.date}T12:00:00`).toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}
          </span>
        )}
      </h2>

      {day && day.events.length > 0 && (
        <ul className="day-events">
          {day.events.map((ev, i) => (
            <li key={ev.eventId ?? i}>{ev.title}</li>
          ))}
        </ul>
      )}

      {rows.length === 0 ? (
        <p className="empty">Brak lekcji.</p>
      ) : (
        <ol className="lessons">
          {rows.map(({ slot, lessons }) => (
            <SlotRow key={slot.name} slot={slot} lessons={lessons} live={isToday} minute={minute} />
          ))}
        </ol>
      )}
    </section>
  );
}

function SlotRow({
  slot,
  lessons,
  live,
  minute,
}: {
  slot: TimetableSlot;
  lessons: Lesson[];
  live: boolean;
  minute: number;
}) {
  const start = toMinutes(slot.start);
  const end = toMinutes(slot.end);
  const state =
    !live || start === null || end === null
      ? "upcoming"
      : minute >= end
        ? "past"
        : minute >= start
          ? "now"
          : "upcoming";

  return (
    <li className={`slot slot-${state}`}>
      <div className="slot-time">
        <span>{slot.start}</span>
        <span className="muted">{slot.end}</span>
      </div>
      <div className="slot-lessons">
        {lessons.map((lesson, i) => (
          <LessonCard key={`${lesson.subjectId}-${i}`} lesson={lesson} slotName={slot.name} now={state === "now"} />
        ))}
      </div>
    </li>
  );
}

function LessonCard({ lesson, slotName, now }: { lesson: Lesson; slotName: string; now: boolean }) {
  return (
    <article className={`lesson${lesson.canceled ? " lesson-canceled" : ""}${now ? " lesson-now" : ""}`}>
      <div className="lesson-head">
        <h3>{lesson.subject}</h3>
        {now && <span className="badge badge-now">Teraz</span>}
        {lesson.canceled && <span className="badge badge-warn">Odwołana</span>}
        {lesson.late && <span className="badge">Spóźnienie</span>}
        {lesson.absent && <span className="badge badge-warn">Nieobecność</span>}
      </div>
      <p className="lesson-meta">
        <span>{slotName}</span>
        {lesson.room && <span>sala {lesson.room}</span>}
        {lesson.teachers && <span>{lesson.teachers}</span>}
      </p>
      {lesson.note && !(lesson.canceled && /odwołan/i.test(lesson.note)) && (
        <p className="lesson-note">{lesson.note}</p>
      )}
    </article>
  );
}
