import type { Home } from "@zeszyt/shared";
import { api } from "../api.ts";
import { Empty, PageHeader, SyncBar } from "../components/Chrome.tsx";
import { useSection } from "../lib/useSection.ts";
import { TimetableView } from "../TimetableView.tsx";

export function PlanPage({ onMenu, onHome }: { onMenu: () => void; onHome: (home: Home) => void }) {
  const home = useSection("home", api.home, { onData: onHome });
  return (
    <>
      <PageHeader title="Plan lekcji" backTo="#" onMenu={onMenu} />
      <SyncBar sync={home.sync} fetchedAt={home.entry?.fetchedAt ?? null} onRefresh={home.refresh} />
      {home.entry ? <TimetableView timetable={home.entry.data.timetable} /> : <Empty>Wczytuję…</Empty>}
    </>
  );
}
