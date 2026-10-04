import { useEffect, useRef, useState } from "react";
import type { Mark, SubjectGrades } from "@zeszyt/shared";
import { api } from "../api.ts";
import { markTone } from "../components/Bits.tsx";
import { Card, Empty, PageHeader, SyncBar } from "../components/Chrome.tsx";
import { formatDay } from "../lib/format.ts";
import { useSection } from "../lib/useSection.ts";
import { load, save } from "../store.ts";

/** Marks unseen on entry stay "new" for the whole visit; everything counts as seen once the page is left. */
function useSeenMarks(keys: string[]) {
  const [seen, setSeen] = useState<Set<string> | null | undefined>(undefined);
  const latest = useRef<{ keys: string[]; seen: Set<string> | null | undefined }>({ keys, seen });
  latest.current = { keys, seen };

  useEffect(() => {
    void load("seenGrades").then((entry) => setSeen(entry ? new Set(entry.data) : null));
    return () => {
      const { keys: current, seen: before } = latest.current;
      if (before === undefined || current.length === 0) return;
      void save("seenGrades", [...new Set([...(before ?? []), ...current])]);
    };
  }, []);

  return (key: string) => seen instanceof Set && !seen.has(key);
}

const latestDate = (s: SubjectGrades) => s.marks.reduce((max, m) => (m.date && m.date > max ? m.date : max), "");

export function GradesPage({ onMenu }: { onMenu: () => void }) {
  const grades = useSection("grades", api.grades);
  const subjects = grades.entry?.data.subjects ?? [];
  const isNew = useSeenMarks(subjects.flatMap((s) => s.marks.map((m) => m.key)));

  const graded = subjects.filter((s) => s.marks.length > 0).sort((a, b) => latestDate(b).localeCompare(latestDate(a)));
  const ungraded = subjects.filter((s) => s.marks.length === 0);
  const newCount = graded.flatMap((s) => s.marks).filter((m) => isNew(m.key)).length;
  const [selected, setSelected] = useState<string | null>(null);
  const toggle = (key: string) => setSelected((current) => (current === key ? null : key));

  return (
    <>
      <PageHeader
        title="Oceny"
        subtitle={newCount ? `${newCount} ${newCount === 1 ? "nowa ocena" : newCount < 5 ? "nowe oceny" : "nowych ocen"}` : undefined}
        backTo="#"
        onMenu={onMenu}
      />
      <SyncBar sync={grades.sync} fetchedAt={grades.entry?.fetchedAt ?? null} onRefresh={grades.refresh} />
      {!grades.entry ? (
        <Empty>{grades.loaded ? "Wczytuję oceny…" : ""}</Empty>
      ) : (
        <div className="stack">
          {graded.length === 0 && <Empty>Brak ocen w tym semestrze.</Empty>}
          {graded.map((s) => (
            <SubjectCard
              key={s.subjectId ?? s.subject}
              subject={s}
              isNew={isNew}
              selected={selected}
              onToggle={toggle}
            />
          ))}
          {ungraded.length > 0 && (
            <p className="fineprint">Bez ocen: {ungraded.map((s) => s.subject).join(", ")}</p>
          )}
        </div>
      )}
    </>
  );
}

function SubjectCard({
  subject,
  isNew,
  selected,
  onToggle,
}: {
  subject: SubjectGrades;
  isNew: (key: string) => boolean;
  selected: string | null;
  onToggle: (key: string) => void;
}) {
  const marks = [...subject.marks].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const active = marks.find((m) => m.key === selected);

  return (
    <Card title={subject.subject}>
      <div className="chips">
        {marks.map((m) => (
          <button
            key={m.key}
            className={`chip chip-button tone-${markTone(m.value)}`}
            aria-pressed={m.key === selected}
            aria-label={`${m.value}${isNew(m.key) ? ", nowa" : ""}`}
            onClick={() => onToggle(m.key)}
          >
            {m.value}
            {isNew(m.key) && <span className="chip-new">nowa</span>}
          </button>
        ))}
      </div>
      {active && <MarkDetail mark={active} />}
    </Card>
  );
}

function MarkDetail({ mark }: { mark: Mark }) {
  return (
    <dl className="mark-detail">
      {mark.category && (
        <>
          <dt>Kategoria</dt>
          <dd>{mark.category}</dd>
        </>
      )}
      {mark.description && (
        <>
          <dt>Opis</dt>
          <dd>{mark.description}</dd>
        </>
      )}
      {mark.comment && (
        <>
          <dt>Komentarz</dt>
          <dd>{mark.comment}</dd>
        </>
      )}
      <dt>Data</dt>
      <dd>{formatDay(mark.date) || "–"}</dd>
      {mark.weight !== null && (
        <>
          <dt>Waga</dt>
          <dd className="num">{mark.weight.toLocaleString("pl-PL")}</dd>
        </>
      )}
      {mark.cumulative && (
        <>
          <dt>Typ</dt>
          <dd>kumulatywna</dd>
        </>
      )}
    </dl>
  );
}
