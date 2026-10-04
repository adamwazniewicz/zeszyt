import { describe, expect, it } from "vitest";
import { parseAttendance } from "../src/parsers/attendance.ts";
import { parseGrades } from "../src/parsers/grades.ts";
import { parseHomeSummary } from "../src/parsers/home.ts";
import { parseNewsArticle, parseNewsList, sanitizeArticle } from "../src/parsers/news.ts";
import { parsePlDate } from "../src/parsers/text.ts";

const base = new URL("https://s99.idu.edu.pl");

describe("parsePlDate", () => {
  it("handles IDU's date formats", () => {
    expect(parsePlDate("03 paź 2026, 16:51")).toBe("2026-10-03T16:51");
    expect(parsePlDate(" 27 wrz 2026 ")).toBe("2026-09-27");
    expect(parsePlDate("data dodania 21.09.2026")).toBe("2026-09-21");
    expect(parsePlDate("jutro")).toBeNull();
  });
});

describe("parseGrades", () => {
  const html = `<table class='marks-table'><thead><tr><th>Przedmiot</th><th>Oceny</th></tr></thead><tbody>
    <tr><td><a href="/subjects/10">fizyka</a></td><td class='averages-container'></td></tr>
    <tr><td><a href="/subjects/11">chemia</a></td><td class='averages-container'>
      <div><strong>Kartkówki</strong>:
        <div class='left-padded-12'>
          <span class='group-1 single-mark' data-type='' data-weight='2.0'>
            <span class='value'><a href="#description_for_grade_77" class="fancybox">4/6</a></span>
            <span class='desc'>(Wiązania <span class='date'>21 wrz 2026</span>)</span>
          </span>
          <span class='group-2 single-mark' data-type='cumulative' data-weight='1.0'>
            <span class='value'>ZAL</span>
            <span class='desc'>(Projekt <span class='date'>01 paź 2026</span>)</span>
          </span>
        </div>
      </div></td></tr>
  </tbody></table>
  <div id="description_for_grade_77"><p>Dobra robota</p>data dodania 21.09.2026</div>`;

  it("groups marks by subject with details", () => {
    const { subjects } = parseGrades(html);
    expect(subjects.map((s) => [s.subject, s.marks.length])).toEqual([["fizyka", 0], ["chemia", 2]]);
    expect(subjects[1]?.marks).toEqual([
      { key: "g77", value: "4/6", category: "Kartkówki", description: "Wiązania", comment: "Dobra robota", date: "2026-09-21", weight: 2, cumulative: false },
      { key: "11|Kartkówki|ZAL|2026-10-01|Projekt", value: "ZAL", category: "Kartkówki", description: "Projekt", comment: null, date: "2026-10-01", weight: 1, cumulative: true },
    ]);
  });
});

describe("parseAttendance", () => {
  const html = `<table><thead><tr><th>Przedmiot</th><th>O</th><th>N</th><th>S</th><th></th></tr></thead><tbody>
    <tr><td>razem</td><td><span>9 / 10 (90,00%)</span></td><td><span>1 / 10 (10,00%)</span> (w tym usprawiedliwione: 1)</td><td><span>2</span></td><td></td></tr>
    <tr class="js-presences-details"><td><a href="/subjects/5/student_presences/stats">biologia</a></td><td><span>4 / 4 (100,00%)</span></td><td><span>0 / 4 (0,00%)</span></td><td><span>0</span></td><td></td></tr>
  </tbody></table>`;

  it("reads totals and per-subject rows", () => {
    expect(parseAttendance(html)).toEqual({
      totals: { present: 9, total: 10, percent: 90, absent: 1, justified: 1, late: 2 },
      subjects: [{ subject: "biologia", subjectId: "5", present: 4, total: 4, percent: 100, absent: 0, justified: 0, late: 0 }],
    });
  });
});

describe("news", () => {
  const list = `
    <div class="profile-event news read sticky priority_2">
      <span class="name">Aktualizacja: 03 paź 2026, 10:23 <a href="/informations/5">Próbna matura</a></span>
      <span class="date">02 paź 2026, 09:00</span><span>komentarze: 3</span>
    </div>
    <div class="profile-event news priority_0">
      <span class="name"><a href="/informations/6">Stołówka</a></span>
      <span class="date">15 wrz 2026, 16:00</span><span>komentarze: 0</span>
    </div>`;

  it("parses list items", () => {
    expect(parseNewsList(list)).toEqual([
      { id: "5", title: "Próbna matura", date: "2026-10-02T09:00", updated: "2026-10-03T10:23", pinned: true, priority: 2, comments: 3, read: true },
      { id: "6", title: "Stołówka", date: "2026-09-15T16:00", updated: null, pinned: false, priority: 0, comments: 0, read: false },
    ]);
  });

  it("extracts only the article body", () => {
    const html = `<div id="content"><div class="module"><h1>Tytuł</h1><div><p style="color:red">Treść</p></div></div>
      <div class="module"><h3>Komentarze</h3><form></form></div></div>`;
    expect(parseNewsArticle(html, "5", base)).toEqual({ id: "5", title: "Tytuł", html: "<p>Treść</p>" });
  });

  it("sanitizes untrusted HTML", () => {
    const dirty = `<p onclick="x()" style="font-size:72pt">Hej<script>alert(1)</script></p>
      <img src="https://i.imgur.com/a.png"><img src="/system/a.png"><img src="https://s99.idu.edu.pl/x.png"><img src="http://plain.example/a.png">
      <a href="/informations/1">wewnętrzny</a><a href="javascript:alert(1)">zły</a><p>&nbsp;</p>`;
    const clean = sanitizeArticle(dirty, base);
    expect(clean).not.toMatch(/onclick|style|script|javascript|system|s99\.idu\.pl\/x\.png|http:\/\/plain/);
    expect(clean).toContain('<img src="https://i.imgur.com/a.png" />');
    expect(clean).toMatch(/<a [^>]*href="https:\/\/s99\.idu\.edu\.pl\/informations\/1"[^>]*>wewnętrzny/);
    expect(clean).toMatch(/<a [^>]*rel="noopener noreferrer"/);
  });
});

describe("parseHomeSummary", () => {
  const html = `
    <div class="profile-event mark"><span class="subject"><a href="/subjects/1">geografia</a></span>
      <span class="name">NZAL</span><span class="description">(Quiz)</span><span class="date">03 paź 2026, 16:51</span></div>
    <div class="profile-event presence"><span class="subject"><a href="/subjects/2">chemia</a></span>
      <span class="name">Nieobecność usprawiedliwiona</span><span class="date">02 paź 2026</span></div>
    <div class="profile-event callendar-event-on-dash"><span class="name">Zbiory (matematyka)</span>
      <span class="date">09 paź 2026</span><a href="https://s99.idu.edu.pl/subjects/3">zobacz</a></div>
    <div class="profile-event callendar-event-on-dash"><span class="name">Wykład</span>
      <span class="date">12 paź 2026, 14:30</span><a href="/callendar_events/8?layout=none">zobacz</a></div>`;

  it("reads recent marks, presences and events", () => {
    const home = parseHomeSummary(html);
    expect(home.recentMarks).toEqual([
      { subject: "geografia", subjectId: "1", label: "NZAL", description: "Quiz", date: "2026-10-03T16:51" },
    ]);
    expect(home.recentPresences[0]).toMatchObject({ kind: "justified", date: "2026-10-02" });
    expect(home.events).toEqual([
      { title: "Zbiory", subject: "matematyka", kind: "exam", date: "2026-10-09", hasTime: false },
      { title: "Wykład", subject: null, kind: "event", date: "2026-10-12T14:30", hasTime: true },
    ]);
  });
});
