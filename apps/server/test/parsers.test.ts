import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMe } from "../src/parsers/me.ts";
import { parseTimetable } from "../src/parsers/timetable.ts";

const hall = readFileSync(new URL("./fixtures/hall.synthetic.html", import.meta.url), "utf8");

describe("parseMe", () => {
  it("reads both ids, name and school", () => {
    expect(parseMe(hall)).toEqual({
      studentId: "22222",
      userId: "11111",
      displayName: "Jan Testowy",
      schoolName: "Przykładowe Liceum nr 1",
    });
  });

  it("fails loudly without a profile link", () => {
    expect(() => parseMe("<html></html>")).toThrow();
  });
});

describe("parseTimetable", () => {
  const tt = parseTimetable(hall);

  it("finds week start and dated weekdays", () => {
    expect(tt.weekStart).toBe("2026-09-28");
    expect(tt.days.map((d) => [d.name, d.date])).toEqual([
      ["Poniedziałek", "2026-09-28"],
      ["Wtorek", "2026-09-29"],
      ["Środa", "2026-09-30"],
      ["Czwartek", "2026-10-01"],
      ["Piątek", "2026-10-02"],
    ]);
  });

  it("attaches day events from the first header row", () => {
    expect(tt.days[0]?.events).toEqual([{ title: "Wycieczka", eventId: "501" }]);
    expect(tt.days[1]?.events).toEqual([]);
  });

  it("parses slots without a tbody", () => {
    expect(tt.slots.map((s) => [s.name, s.start, s.end])).toEqual([
      ["1. lekcja", "08:00", "08:45"],
      ["2. lekcja", "08:55", "09:40"],
    ]);
  });

  it("parses lesson fields and flags", () => {
    const [first, second] = tt.slots;
    expect(first?.days[0]).toEqual([
      {
        subject: "Matematyka",
        subjectId: "100",
        teachers: "A. Nowak",
        room: "12",
        roomId: "7",
        canceled: false,
        late: false,
        absent: false,
        note: null,
      },
    ]);
    expect(first?.days[1]?.[0]).toMatchObject({ canceled: true, room: null, note: "Odwołana" });
    expect(first?.days[2]).toEqual([]);
    expect(first?.days[3]?.map((l) => l.subject)).toEqual(["Angielski gr. 1", "Angielski gr. 2"]);
    expect(second?.days[0]?.[0]).toMatchObject({ subject: "Polski", late: true });
    expect(second?.days[2]?.[0]).toMatchObject({ subject: "Historia", absent: true, room: null });
  });
});
