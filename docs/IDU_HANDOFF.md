# IDU frontend handoff

Technical map of the IDU student portal so a new client (web, PWA, CLI, mobile) can log in as one student and read their data.

This is **not** an official API. IDU is a Rails + Devise HTML app run by DAG s.c. There is no documented public JSON student API. Almost every “endpoint” returns HTML. Student `.json` URLs return **HTTP 406**.


---

## 1. Host and identity

| Item | Value |
| --- | --- |
| Example school | `https://s31.idu.edu.pl` (instance number varies) |
| Pattern | `https://s{N}.idu.edu.pl` — `N` is the school instance |
| Vendor | DAG s.c. (`soc.dag.pl`) |
| Stack | Ruby on Rails, Devise, jQuery, FullCalendar, CSRF `authenticity_token` |
| Language | Polish UI (`/locale?locale=en` for English) |

**Two IDs after login (they are different):**

| ID | Where | Example (this school, one student) |
| --- | --- | --- |
| **User id** | Inline JS `idu.current_user = {"id":…,"roles":["student"]}` | `10001` |
| **Student id** | Profile link `/students/:id` (`#account a[href*="/students/"]`) | `20002` |

Use **student id** for grades, attendance, homework, profile. Use **user id** only as the Devise user.

Other ids seen on the hall page:

| Resource | Path | Example |
| --- | --- | --- |
| Class | `/klasses/:id` | `100` |
| Semester | `select#semester_id` | `10` |
| Subject | `/subjects/:id` | e.g. `30001` |
| Forum | `/forums/:id-slug` | e.g. `40001-1-a` |
| Room | `/rooms/:id` | e.g. `50` |
| Teacher | `/teachers/:id` | — |
| Parent | `/parents/:id` | — |

Discover ids from HTML after login. Do not hardcode them across schools.

---

## 2. Session

Keep a cookie jar (same as a browser).

| Cookie | Role |
| --- | --- |
| `_idu_session2` | Rails session |
| `remember_user_token` | Set if `user[remember_me]=1` |

Also send:

```
User-Agent: Mozilla/5.0 … Chrome/…
Accept-Language: pl,en;q=0.8
```

CSRF: every HTML form includes `authenticity_token`. POST with the token from the form you just GET.

Session expiry: inline JS `idu.redirectAfterTimeout = { delay: 3600000, url: "/" }` (1 hour of idle in the browser). `remember_user_token` lasts longer. If a GET redirects to `/users/sign_in`, the session is dead.

---

## 3. Login

### GET `/users/sign_in`

Form `#new_user`, `action="/users/sign_in"`, `method=post`.

Hidden:

- `utf8` = `✓`
- `authenticity_token`

Fields:

- `user[login]`
- `user[password]`
- `user[remember_me]` — hidden `0` + checkbox `1`
- `not_a_robot` — checkbox `1` (plain checkbox, not reCAPTCHA)
- `commit` = `Zaloguj`

### POST `/users/sign_in`

Body (application/x-www-form-urlencoded):

```
utf8=✓
authenticity_token=<from GET>
user[login]=…
user[password]=…
user[remember_me]=1
not_a_robot=1
commit=Zaloguj
```

Follow redirects. **Success:** URL is no longer `/users/sign_in` (usually `/`). **Failure:** still on sign-in, or page still contains `Zaloguj się`.

Related:

| Method | Path |
| --- | --- |
| GET | `/users/sign_out` |
| GET | `/users/password/new` |
| GET | `/users/unlock/new` |
| GET | `/locale?locale=en` |

---

## 4. Page chrome (every logged-in HTML page)

Useful global selectors:

| Selector | Meaning |
| --- | --- |
| `#content` | Main body |
| `#school-name` | School name |
| `#login` / `#account` | “Witaj, {name}” |
| `#account a[href*="/students/"]` | “Twój profil” → student id |
| `a[href="/internal_messages"]` | Unread message badge text |
| `form#set_semester_scope` | POST `/set_semester_scope` |
| `select#semester_id` | Current semester |
| `script` containing `idu.current_user` | User id + roles |

Typical scripts:

- `/assets/common.js`
- `/assets/dashboard_controller.js` (hall)
- `/assets/calendars_controller.js` (calendar)
- `/assets/internal_messages_controller.js` (inbox)

---

## 5. Read endpoints (student)

### 5.1 Hall — GET `/`

HTML dashboard. Best single page for **timetable**.

**Timetable** (`.schedule table`):

- Text near the table: week start `YYYY-MM-DD` (Monday).
- `thead`: first row = day events (`.callendar_event`, often `a.fancybox[href^="/callendar_events/"]` — note the spelling **callendar**).
- Last `thead tr`: day names (Poniedziałek … Piątek).
- Body rows may be in `<tbody>` **or** direct `<tr>` under `<table>` (no tbody). Always take `tr` that are not inside `thead`.
- First `td`: slot name (`0. lekcja`, `1. blok`, …) and `title="HH:MM - HH:MM"`.
- Lesson cells: `td.lesson .lesson-cell`.

Per `.lesson-cell`:

| Selector / attr | Field |
| --- | --- |
| `.subject` | Subject name; `title` ≈ `prowadzący: {teachers}` |
| `.subject a[href^="/subjects/"]` | Subject id |
| `.location a[href^="/rooms/"]` | Room; text `"."` means no room |
| extra class `canceled` | Cancelled; inner `div` often “Odwołana” |
| `lateness-in-plan` | Late |
| `absence-in-plan` | Absence marked on plan |

Other hall modules (`#content h3` + parent `.module`): class, subjects, announcements, recent grades, exams, news, events, attendance teaser, homework, forums.

Subject links on the hall:

| Path | Meaning |
| --- | --- |
| `/subjects/:id` | Subject home |
| `/subjects/:id/homeworks` | Homework |
| `/forums/:id-slug` | Subject forum |
| `/subjects/:id/lesson_instances` | Lesson topics |
| `/subjects/:id/students_grades?student_id=` | Grades |
| `/subjects/:id/students_presences?student_id=` | Attendance |

### 5.2 Identity and people

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/students/:id` | Profile, weekly plan (`.lesson-cell`), contact data |
| GET | `/profile/edit` | Edit profile |
| GET | `/klasses/:id` | Class, student list, weekly plan |
| GET | `/teachers/:id` | Teacher |
| GET | `/parents/:id` | Parent |
| GET | `/rooms/:id` | Room |
| GET | `/idu_users/search` | AJAX. `search[profile_by_name]=` (min 3 chars). Header `X-Requested-With: XMLHttpRequest`, `Accept: text/javascript`. Returns JS that fills `#users_search_result`. |

### 5.3 Grades

| Method | Path | Parse |
| --- | --- | --- |
| GET | `/students/:id/grades` | `table.marks-table tbody tr` |
| GET | `/subjects/:id/students_grades?student_id=` | `.profile-event.mark` |

Mark cell (`.single-mark`):

- `.value` — e.g. `4/6`, `NZAL`, `ZAL`, `13% (2/16p.)`
- `.desc` / `.date` — description and date
- `data-weight`, `data-type` (`cumulative` / empty), `data-cumulative-max-points`
- `.value[data-data-cumulative-points]`

Subject root URL is exactly `/subjects/{digits}` (not `/homeworks`, `/lesson_instances`, `/students_*`).

### 5.4 Attendance

| Method | Path | Parse |
| --- | --- | --- |
| GET | `/students/:id/presences` | First table: totals + per-subject (`.js-presences-details`). Then `table.presences_table` per week |
| GET | `/subjects/:id/students_presences?student_id=` | Subject view |
| GET | `/subjects/:id/student_presences/stats` | Stats |

Icons (filename in `img[src]`): `icon-presence`, `icon-absence`, `icon-absence-justified`, `icon-lateness`.

### 5.5 Homework, lessons, announcements, reviews

| Method | Path | Parse |
| --- | --- | --- |
| GET | `/students/:id/homeworks` | `table.object_list-table` |
| GET | `/subjects/:id/homeworks` | Same |
| GET | `/subjects/:id/homeworks/:id` | `#content .module` |
| GET | `/students/:id/subject_announcements` | `.profile-event.announcement` |
| GET | `/subject_announcements/:id/confirm` | Full text. **Marks as read.** |
| GET | `/students/:id/reviews` | `table.object_list-table` |
| GET | `/subjects/:id/lesson_instances` | `table.lesson-instances` / `table.subjects-table`; cancelled row class `canceled` |
| GET | `/subjects/:id/lesson_instances/:id` | One lesson |
| GET | `/subjects/:id/lesson_instances.xls` | Excel |

Homework list columns: Nazwa, Subject, “Pliki można wysyłać do”, Utworzono, Pokaż → `/subjects/:sid/homeworks/:hid`.

Announcement list: `.subject`, `.name a[href*="/subject_announcements/"]`, `.date`, class `read`.

### 5.6 Messages

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/internal_messages` | Inbox |
| GET | `/internal_messages/sent` | Sent |
| GET | `/internal_messages/drafts` | Drafts |
| GET | `/internal_messages/trash` | Trash |
| GET | `/internal_messages/new` | Compose |
| GET | `/internal_messages/:id/watek` | Thread. **May mark as read.** |
| POST | `/internal_messages/create_for_thread` | Reply (write) |
| POST | `/internal_messages/delete_threads` | `_method=delete` (write) |

Inbox search query:

- `search[with_phrase]`
- `search[message_title_like]`
- `search[by_user_related_name]`

Inbox rows: `table.message-table tr`

- `a[href*="/watek"]` — title; `title` attr is a short preview
- `.name a` — author (`/teachers/`, `/students/`, `/parents/`)
- last `td` — date
- checkbox `delete[]` = thread id

Thread (`#content #message`, can be several):

- `.message-author`, `.message-date`
- `#message-body h4` — title
- rest of `#message-body` — HTML body
- reply form `#new_message_form` → ignore for read-only clients

### 5.7 News (aktualności)

| Method | Path | Parse |
| --- | --- | --- |
| GET | `/informations` | `#content .profile-event` + `a[href*="/informations/"]` |
| GET | `/informations/:id` | `#content .module h1` + remaining HTML |

List extras: `.date`, class `sticky`, `priority_N`, optional “Aktualizacja: {datetime}” in `.name`, “komentarze: N”.

### 5.8 Documents

| Method | Path |
| --- | --- |
| GET | `/documents/attachments` |
| GET | `/documents/attachments/:id` |
| GET | `/documents/attachments/:id/download` |

Filter: `school_search[category_id_in][]`, `school_search[name_like]`. Table `object_list-table`: category, name, created, show + download.

### 5.9 Forum

| Method | Path |
| --- | --- |
| GET | `/forums` |
| GET | `/forums/:id-slug` |
| GET | `/forums/:id-slug/topics/:id-slug` |
| GET | `/forums/:id-slug/topics/:id-slug?page=` |
| GET | `/forum/search` |
| GET | `/forums/changes` | Referenced in JS (`idu.changes_forums_path`). Returned **500** when probed. |

Index: `table.forum-table`, `.title a`, `.thread-data`, icons `icon-new-post` / `icon-no-new-post`.

### 5.10 Calendar

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/calendar` | `#calendar` attrs: `data-events-url=/calendar_events.json`, `data-event-url=/calendar_events/id_to_change.json` |
| GET | `/calendar_events.json` | JSON (FullCalendar). May need `start`/`end` |
| GET | `/calendar_events/:id.json` | One event JSON |
| GET | `/callendar_events/:id` | HTML (typo **callendar**) |
| GET | `/callendar_events/:id?layout=none` | HTML fragment only |
| GET | `/public_calendar/:id` | Public calendar (school id, e.g. `31`) |

Event CSS classes: `callendar_event`, `user_event`, `review_session`, `grade_event`, `meeting_event`, `free_days`.

---

## 6. Write / session-changing (do not need for a reader)

| Method | Path | Body / notes |
| --- | --- | --- |
| POST | `/set_semester_scope` | `semester_id` |
| GET/POST | `/user_templates` | Message templates |
| POST | `/internal_messages/create_for_thread` | `message[thread_id]`, `message[body]`, `message[send_copy_to_email]` |
| POST | `/internal_messages/delete_threads` | `_method=delete`, `delete[]` |
| GET | `/subject_announcements/:id/confirm` | Read **and** mark announcement read |
| GET | `/internal_messages/:id/watek` | Read **and** may mark thread read |

---

## 7. What is *not* an API

- `Accept: application/json` on `/students/:id` or `/students/:id/grades` → **406**
- `/students/:id.json` → **406**
- `/calendar_events.json` without a logged-in session → empty or login HTML
- `/forums/changes` → 500 (do not depend on it)

---

## 8. Minimal read client (recommended)

For a new frontend that only shows plan, inbox, news, grades:

1. GET `/users/sign_in` → POST login → keep cookies.
2. GET `/` → parse identity + `.schedule` timetable.
3. GET `/students/{id}/grades` → `table.marks-table`.
4. GET `/internal_messages` → list; GET `/internal_messages/{id}/watek` for bodies (side effect: read).
5. GET `/informations` → list; GET `/informations/{id}` for bodies.

Reuse unchanged thread/article HTML between scans so you do not re-open every message.

Suggested User-Agent: identify the client honestly (e.g. `MyApp/1.0 (personal; +contact)`) rather than impersonating Chrome, if the school agrees to the client.

---

## 9. HTML quirks

- **Timetable `tbody` is optional.** Iterate all `tr` outside `thead`.
- **`callendar` vs `calendar`:** hall/event HTML uses `callendar_events`; FullCalendar JSON uses `calendar_events`.
- **Room `.`:** empty room.
- **Grades table** has a row per subject even with zero `.single-mark`.
- **News images** may be hotlinked (`https://i.imgur.com/…`); relative `/system/…` avatars need the session cookie.
- **Layouts:** `?layout=none` strips chrome (used on calendar event popups).
- **Rails UJS:** `data-remote="true"` forms (user search) return `text/javascript`, not JSON.

---

## 10. This repo

Python client that implements login + the four reads above:

| File | Role |
| --- | --- |
| `idu_client.py` | Session, login, GET HTML |
| `parsers.py` | CSS selectors → dicts |
| `scanner.py` | One scan + diff vs previous snapshot |
| `snapshots.py` | `data/snapshots/*.json` |
| `app.py` | Local UI at `:5050` |

Snapshot JSON shape (after a scan):

```json
{
  "scanned_at": "ISO-8601",
  "me": { "student_id": "", "display_name": "", "school_name": "" },
  "timetable": { "start": "YYYY-MM-DD", "days": [] },
  "grades": [{ "id": "", "name": "", "marks": [] }],
  "messages": [{ "id": "", "title": "", "author": "", "date": "", "preview": "", "thread": {} }],
  "news": [{ "id": "", "title": "", "date": "", "updated": "", "pinned": false, "html": "" }],
  "new": { "messages": [], "news": [], "grades": [], "timetable": false }
}
```

A new frontend can either scrape IDU with this map, or consume those snapshot files / the local Flask routes (`GET /api/snapshot`, `POST /api/scan`, `POST /api/login`).
