# LLM handoff — Zeszyt

Written 2026-10-05 for a **new agent** with no chat history. This is the operational truth of what shipped. `SPEC.md` matches the shipped Start page and bottom bar; it is still **stale** on build-order, homework/messages (not built), and the anonymizer. Prefer this file when they conflict.

**Do not write secrets here.** Local `.env` and the server `.env` hold `SESSION_SECRET`, `ZROK2_ENABLE_TOKEN`, and optional `IDU_LOGIN` / `IDU_PASSWORD`. An IDU password appeared in an early chat; never persist it. Use env vars only, then the owner should rotate that password.

---

## 1. What this is

**Zeszyt** is an unofficial, read-only PWA for students of **one** IDU instance (`https://s31.idu.edu.pl`, configurable via `IDU_BASE_URL`). Vendor: DAG s.c. IDU is Rails + Devise HTML. There is **no public JSON student API**. This app logs in as one student, scrapes allowlisted HTML, returns JSON, and renders a calm Polish UI.

Not affiliated with IDU / DAG s.c. Own name, icon, CSS. Disclaimer in the login footer and app footer.

Public source (no secrets): `https://github.com/adamwazniewicz/zeszyt` — push of the first commit may still be pending (GitHub rejected password auth; needs PAT or SSH). Local git: one root commit `5aa016e`.

Owner: Adam (Mac `better-idu`, Ubuntu CasaOS host `optiplex3050`). Informatics teacher may review the GitHub repo.

---

## 2. Product decisions (grilled, shipped)

| Topic | Decision |
| --- | --- |
| Audience | Public-ish student client, but still unofficial; school/DAG should be told before a real public launch (**not done yet**) |
| Writes | Strictly read-only; link out is not even implemented — just no write APIs |
| Password | Never stored. Re-prompt when IDU session dies |
| Server storage | Nothing. Only `SESSION_SECRET` on the box |
| Session | IDU cookies AES-256-GCM sealed into `httpOnly; Secure; SameSite=Strict` cookie `zs` on `/api` |
| Persistence | IndexedDB survives close/reboot/offline. Reinstall / clear site data = resync |
| Notifications | None |
| Semester | Current only (no `POST /set_semester_scope`) |
| Language | Polish UI |
| Look | Calm, mobile-first, light+dark (`prefers-color-scheme`) |
| Nav | Floating bottom bar, same rounded track as the Plan day selector. Start, Plan, Aktualności, Więcej. Selected item is a filled pill; Więcej is that pill while its sheet is open or while Oceny / Obecności / Wydarzenia is open. The sheet also has Wyloguj. No header menu. Article still goes back to `#aktualnosci`. Hash routes |
| Start page | **One live card** for today only (not the full day, not the next school day): before the first lesson or on a short break, one `mm:ss` countdown “do lekcji” plus the upcoming lesson, teacher, and room; during a lesson, that lesson plus “zostało”; Okienko counts like a lesson and also shows the next real lesson; a cancelled current lesson keeps its name, the Odwołana badge, its own countdown, and the next lesson still on. After the last bell: “Koniec lekcji na dziś!” until midnight. A day with no lessons: “Dziś nie ma lekcji.” Several groups in one slot are all listed. Greeting stays `Cześć, {imię}`. Event previews stay. Oceny and Obecności are only under Więcej; Aktualności is only the bottom-bar tab. Full week is `#plan`. |
| Grades | Per subject, chips, tap for details. **One** detail open at a time. “nowa” until you leave the Oceny tab |
| Attendance | Totals + per subject. Highlight **&lt; 80%** |
| Events | From hall modules (`exam` + `callendar-event-on-dash`), not FullCalendar JSON |
| News bodies | Fetch **on tap only** (marks read on IDU). Cached; never auto-refetch (`onlyIfMissing`) |
| News HTML | Sanitize on server: keep structure + https images **not** on IDU origin |
| Okienko | Empty slot **between** a day’s first and last lesson shown as a fake lesson titled “Okienko”. Leading/trailing empty slots hidden. Shared helper `dayRows` in `apps/web/src/lib/dayRows.ts` (Plan + Start) |
| Stack | npm workspaces: Vite+React PWA, Hono+Node, `@zeszyt/shared` types |
| Deploy | Docker on CasaOS Ubuntu, **zrok2** public share. Do **not** use CasaOS “Custom Install” importer (it literalizes `${VAR}` and drops networks/volumes) |
| HTTPS | `https://zeszyt.shares.zrok.io` |
| Interstitial | zrok.io warning page. API fetches send header `skip_zrok_interstitial: 1`. First document load in a browser still shows the page until click-through |
| PWA install | Chrome/Samsung on Android can WebAPK. **Brave Android cannot** (Brave limitation). Manifest needs 192+512 PNG (`any`) plus separate maskable 512. `vite-plugin-pwa` `useCredentials: true` so the manifest gets the zrok cookie |

v1 **not built yet:** homework UI, messages UI (inbox paths are allowlisted in the IDU client already). Anonymizer for `fixtures/anon/` was planned, never written.

---

## 3. Repo map

```
AGENTS.md                 ← short rules for every agent
docs/LLM_HANDOFF.md       ← this file
SPEC.md                   ← original intent (partly stale)
README.md                 ← teacher-facing: copyright + no server-side data
DEPLOY.md                 ← rsync/docker/zrok; paths in file still say ~/zeszyt — live path is /DATA/AppData/zeszyt
docs/IDU_HANDOFF.md       ← IDU HTML map (example IDs are dummy, not Adam’s)
LICENSE                   ← MIT, Adam Ważniewicz

apps/server/              ← Hono, parsers, tests (vitest)
apps/web/                 ← Vite React PWA
packages/shared/          ← types
scripts/capture.ts        ← npm run capture → fixtures/raw/*.html (gitignored)
fixtures/raw/             ← real IDU HTML; NEVER commit or rsync to the server
apps/server/test/fixtures/hall.synthetic.html
```

### Server (`apps/server/src`)

| File | Role |
| --- | --- |
| `index.ts` | Node listen; static `WEB_DIST`; SPA fallback |
| `app.ts` | Routes, CSRF, rate limits, `onError` (HTTPException must stay HTTPException, not 502) |
| `config.ts` | Env. `PUBLIC_ORIGIN` must be a **full URL** or empty — `zeszyt` as a value crashes Node |
| `idu/client.ts` | Cookie jar fetch, allowlist, login form POST |
| `idu/cookieJar.ts` | Single-host jar |
| `session/seal.ts` | AES-256-GCM |
| `session/session.ts` | Cookie `zs` |
| `parsers/*` | cheerio. Replace `<br>` with space before reading names |
| `parsers/news.ts` | `sanitize-html` |
| `rateLimit.ts` | In-memory, per IP (`TRUST_PROXY=1` behind zrok) |

**Allowlisted GET paths** (`idu/client.ts`): `/`, sign-in/out, `/students/:id`, `grades|presences|homeworks`, `/internal_messages`, `/internal_messages/:id/watek`, `/informations`, `/informations/:id`. Adding homework/messages **UI** still needs new `/api/*` routes + parsers; homeworks path is already allowed.

**API (implemented):** `POST /api/login` (JSON only), `POST /api/logout`, `GET /api/me`, `/api/home`, `/api/grades`, `/api/attendance`, `/api/news`, `/api/news/:id`, `GET /healthz`.

Login rate limit 5/min/IP; other `/api/*` 60/min/IP.

Login body: `user[login]`, `user[password]`, `user[remember_me]=1`, `not_a_robot=1`, CSRF token from GET `/users/sign_in`.

### Web (`apps/web/src`)

| File | Role |
| --- | --- |
| `api.ts` | fetch + `skip_zrok_interstitial` |
| `store.ts` | idb-keyval. Keys: `me`, `home`, `grades`, `attendance`, `news`, `seenGrades`, `article:{id}` |
| `lib/useSection.ts` | IndexedDB first, then fetch. `onlyIfMissing` for articles |
| `lib/router.ts` | `#`, `#plan`, `#oceny`, `#obecnosci`, `#wydarzenia`, `#aktualnosci`, `#aktualnosci/:id` |
| `lib/install.ts` | `beforeinstallprompt` (may be unused in UI; keep if you add an install button) |
| `pages/Start.tsx` | Today card + event previews |
| `TimetableView.tsx` | Week tabs, now/past, `dayRows` / Okienko |
| `pages/Grades.tsx` | Shared `selected` key across subjects |
| `styles.css` | Tokens, no Tailwind |

PWA: `vite-plugin-pwa`, icons in `apps/web/public/` (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `icon.svg`, `apple-touch-icon.png`). Dev proxy `/api` → `:8787`.

Production: `apps/server` serves `apps/web/dist` on **:8787** (Docker `WEB_DIST=/app/apps/web/dist`). Local `npm run dev` is Vite :5173 + server :8787.

---

## 4. Commands

Node **≥ 22.6**. npm workspaces (no pnpm in this repo).

```bash
npm install
npm test              # vitest in apps/server; ~25 tests
npm run typecheck
npm run build         # web then server
npm run dev           # both; UI at http://localhost:5173
npm start             # production server serving web dist
npm run capture       # needs IDU_LOGIN IDU_PASSWORD; writes fixtures/raw/
```

Parser debug against real captures: `ZS_DEBUG=1 npx vitest run test/raw.test.ts` in `apps/server` (skips if no raw files).

**Do not** run `tsx` capture in a way that commits HTML. Raw files stay gitignored.

---

## 5. Live deployment (as of 2026-10-04)

| Item | Value |
| --- | --- |
| Host | Ubuntu + CasaOS, user `adam`, machine `optiplex3050` (i5-7500, lots of free RAM) |
| Code on server | **`/DATA/AppData/zeszyt`** (not `~/zeszyt` — `DEPLOY.md` is outdated there) |
| Docker | `sudo docker compose …` from that dir. Image `zeszyt:latest`. Stack name `zeszyt` |
| App URL | `https://zeszyt.shares.zrok.io` |
| zrok share | named `public:zeszyt` → `http://zeszyt:8787`. Agent restates named shares on reboot |
| Env on server | `.env` with `SESSION_SECRET`, `IDU_USER_AGENT`, `ZROK2_ENABLE_TOKEN`, `PUBLIC_ORIGIN=https://zeszyt.shares.zrok.io` (must be full URL), `TRUST_PROXY=1` |
| Update | rsync from Mac (exclude `node_modules`, `dist`, `.git`, `fixtures`, `.env`) then `sudo docker compose build && sudo docker compose up -d` |
| Health | `zeszyt-zeszyt-1` must be `healthy` or `zrok-agent` will not start (`depends_on`) |

Mac rsync (use the IP if `optiplex3050` does not resolve; `.local` sometimes works):

```bash
rsync -av --delete \
  --exclude node_modules --exclude dist --exclude .git \
  --exclude fixtures --exclude .env \
  ./ adam@<server>:/DATA/AppData/zeszyt/
```

`--delete` is OK because `.env` is excluded.

zrok.io interstitial: browsers see it on first navigation; cookie ~7 days. `skip_zrok_interstitial` bypasses it for XHR/fetch. Document requests (HTML, manifest, SW) still need the cookie **or** the header (browsers cannot add the header on top-level navigation). Paid zrok or own domain removes the page.

---

## 6. IDU scrape notes that bit us

- Hall timetable: **`tbody` optional**; `callendar` vs `calendar` spelling.
- `.subject` / `.location` are **spans**, not always divs. Room `"."` = no room. Extra Classroom/video `<a href="">` inside location — ignore.
- Lesson notes are extra inner `div`s (e.g. test topic). Cancelled: class `canceled`, text “Odwołana”.
- School name uses `<br>` → `"4Kim."` unless br → space (`parseMe`).
- Polish dates: `03 paź 2026, 16:51` → `2026-10-03T16:51` (`parsePlDate`).
- Grades: `.single-mark`, popup `#description_for_grade_ID`. Key `g{id}` when present.
- Attendance: table whose first header is `Przedmiot`; totals row `razem`; per-subject `tr.js-presences-details`.
- News list: `.profile-event.news`; `sticky`, `priority_N`, `read`. Opening `/informations/:id` marks read.
- Cross-origin: refuse redirects off `IDU_BASE_URL` origin.
- Honest `User-Agent` (`IDU_USER_AGENT`), do not impersonate Chrome.

---

## 7. Known pitfalls

1. **CasaOS compose importer** — do not use. Values become the literal `${SESSION_SECRET:?…}` string (forgable sessions). Volumes/networks/order lost.
2. **`PUBLIC_ORIGIN=zeszyt`** — crash `Invalid URL`. Empty or `https://zeszyt.shares.zrok.io`.
3. **PWA on live zrok without cookie** — `/manifest.webmanifest` returns zrok HTML. Chrome then only offers a **shortcut**. Click through, then Install. Need 192+512 PNG; do not mark one file `any maskable`.
4. **Brave Android** — cannot mint WebAPK; shortcut only. Not fixable in this repo.
5. **Service worker** — phones pick up a new build on the **second** launch. When testing, unregister SW / clear caches.
6. **CSRF** — Hono csrf applies to form posts, not JSON. Login **requires** `Content-Type: application/json`. Same-origin JSON is the model. `PUBLIC_ORIGIN` used for csrf origin when set.
7. **`onError`** — must rethrow/return `HTTPException` (403 from csrf). Otherwise 502.
8. **Cookie `Secure`** — on in `NODE_ENV=production`. HTTP LAN login will fail; use the zrok HTTPS URL.
9. **Changing `SESSION_SECRET`** logs everyone out.
10. **Parser tests vs IDU layout** — any IDU HTML change → `parse_failed` 422. Recapture + fix parsers + fixtures.

---

## 8. Remaining work (sensible next tickets)

In priority order unless the owner says otherwise:

1. **Homework** — list + detail from `/students/:id/homeworks` (already allowlisted). Read-only.
2. **Messages** — inbox list from `/internal_messages`; thread body only on open (`/watek` marks read). Reuse article `onlyIfMissing` pattern.
3. **Anonymizer** — `fixtures/raw` → `fixtures/anon` committed; stop relying on skippable `raw.test.ts` for CI.
4. **Contact school / DAG** before advertising widely. Honest UA with a real mailto already required in `.env`.
5. **Privacy page** in the app (README is not inside the PWA).
6. **Fix `DEPLOY.md` paths** to `/DATA/AppData/zeszyt` and document PAT/SSH for GitHub.
7. **zrok interstitial** — in-app “confirm access” flow, paid plan, or own domain, if first-load PWA install keeps failing.
8. **SPEC.md** — Start page and bottom bar are updated. Still stale: build order, homework/messages marked as v1 scope though not built, anonymizer.

Capacity (no load test): i5-7500 + 16 GB free RAM is plenty. Bottleneck is IDU + zrok. Fine for a school opening the app over a few minutes; not for hundreds of simultaneous refreshes.

---

## 9. How to continue in a new chat

1. Read this file + `AGENTS.md`.
2. `npm test && npm run typecheck`.
3. For UI: exercise the flow in the browser (`localhost:5173` or the zrok URL). Unregister the SW if the UI looks stale.
4. For parsers: add synthetic HTML tests first; optionally `npm run capture` locally.
5. Deploy only if asked: rsync (exclude fixtures/.env) then `sudo docker compose build && up -d` on the server.
6. Never commit secrets or `fixtures/raw`.
