# Zeszyt — spec

Working name. Unofficial, read-only PWA for students of one IDU instance (`s31.idu.edu.pl`). Not affiliated with DAG s.c. Source of truth for IDU's HTML: `docs/IDU_HANDOFF.md`.

## Goals

- Students log in with their normal IDU credentials and see their own data in a calm, mobile-first UI.
- Data persists on the device across app closes, reboots, and offline use.
- No copyright or privacy liability beyond what a browser has.

## Non-goals (v1)

- Writing anything to IDU (replies, deletes, semester switching).
- Push notifications or background polling.
- Schools other than s31 (instance stays configurable via `IDU_BASE_URL`).
- Surviving reinstall / "clear site data".

## Copyright and privacy rules

1. Nothing copied from IDU: no CSS, JS, images, icons, logo, or name. Own branding plus a visible "nieoficjalny klient, niezwiązany z DAG s.c." disclaimer.
2. Only the logged-in user's own data is fetched, with their credentials. Never shown to anyone else.
3. The server stores nothing: no passwords, no content, no logs of content. Only the sealing key lives on the server.
4. IDU session cookies are AES-256-GCM sealed into an `httpOnly; Secure; SameSite=Strict` cookie on our origin.
5. Passwords are never stored. When IDU rejects the session, the user logs in again.
6. Reads that mark things read on IDU (`/internal_messages/:id/watek`, `/subject_announcements/:id/confirm`, news bodies) only happen when the user opens the item.
7. Honest `User-Agent` with a contact address (`IDU_USER_AGENT`). School / DAG s.c. contacted before public launch.
8. Raw captured HTML (contains classmates' data) is git-ignored. Only anonymized fixtures are committed.

## Architecture

```
apps/web     Vite + React PWA. IndexedDB cache. Polish UI.
apps/server  Hono on Node. Login, allowlisted IDU fetches, HTML → JSON parsing. Serves apps/web build on same origin.
packages/shared  Types shared by both.
```

- Server only fetches an allowlist of IDU paths; it is not a generic proxy.
- Server rate-limits per session and per IP.
- Deployed as one Docker container on a home server, exposed via a zrok public share. If the zrok.io interstitial breaks PWA install, switch to a reserved share on an own domain.

## API

| Method | Path | Returns |
| --- | --- | --- |
| POST | `/api/login` | `{ login, password }` → sets session cookie, returns `Me` |
| POST | `/api/logout` | Signs out of IDU, clears cookie |
| GET | `/api/me` | `Me` (from session cookie, no IDU request) |
| GET | `/api/home` | `{ me, timetable, recentMarks, recentPresences, events, news }` from one IDU hall request |
| GET | `/api/grades` | `Grades` grouped by subject, with comments from IDU's grade popups |
| GET | `/api/attendance` | `Attendance` totals + per subject |
| GET | `/api/news` | `NewsList` |
| GET | `/api/news/:id` | `NewsArticle`, HTML sanitized server-side (marks read on IDU) |
| GET | `/api/homework` | v1, later |
| GET | `/api/messages` | v1, later (list + previews only) |
| GET | `/api/messages/:id` | v1, later (marks read on IDU) |

Errors: `401 { error: "session_expired" }` when IDU redirects to sign-in; `502 { error: "idu_unavailable" }`; `422 { error: "parse_failed" }` when HTML no longer matches.

## v1 scope

Timetable (home screen = today), grades, attendance, homework, messages (read-only), news. Current semester only. Light and dark mode.

## Navigation

- Start page: today's lessons, newest grades, upcoming events, recent attendance, news (all from `/api/home`).
- Menu button opens: Plan lekcji, Oceny, Obecności, Wydarzenia, Aktualności. Each page has a back button to Start (article → Aktualności).
- Hash routes (`#oceny`, `#aktualnosci/123`) so the system back button works.

## Sync

- Each page renders from IndexedDB first, then fetches its own data when opened ("Odśwież" refetches).
- Start, Plan and Wydarzenia share the `/api/home` cache.
- News articles are fetched only when opened and never refetched automatically once saved.
- Grades: keys unseen on entry show a "nowa" badge for that visit; leaving Oceny marks all as seen. The first visit is the baseline.
- Attendance below 80% per subject is highlighted.

## Testing

- `npm run capture` (reads `IDU_LOGIN` / `IDU_PASSWORD` from env) saves raw HTML to `fixtures/raw/` (git-ignored).
- Anonymizer turns raw captures into `fixtures/anon/` (committed). Parser tests run against anon fixtures.

## Build order

1. Monorepo, server login + session sealing, timetable parser, web login + today view. ← current
2. Capture + anonymizer, parser tests on real HTML.
3. Grades, attendance, homework.
4. Messages and news (lists, then open-to-read bodies).
5. Docker + zrok deployment, disclaimer/privacy page, contact school.
