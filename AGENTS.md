# Agent instructions (Zeszyt)

Read **`docs/LLM_HANDOFF.md`** before changing anything. That file is the full handoff: product decisions, architecture, live deploy, gotchas, and remaining work.

Hard rules (do not weaken them):

- Unofficial, **read-only** client. Do not POST to IDU except login. Do not copy IDU CSS/JS/images/logo.
- Server stores **nothing**: no passwords, no content, no user database. Session = sealed cookie on the device.
- Never commit `.env` or `fixtures/raw/` (classmates’ personal data).
- Do not expand `ALLOWED_GET_PATHS` into an open proxy. Allowlist only.
- Do not put secrets, IDU passwords, or `SESSION_SECRET` values in git, chat logs you write to disk, or this repo.
- UI is Polish. Verify web UI in a browser when behaviour or layout changes.
- After parser changes, run `npm test` and `npm run typecheck`. Prefer tests on synthetic HTML; use `fixtures/raw/` only locally.

Canonical docs: `SPEC.md` (intent), `docs/IDU_HANDOFF.md` (IDU HTML map), `DEPLOY.md` (server), `README.md` (teacher-facing). If they disagree, **LLM_HANDOFF.md wins for “what we actually shipped”**.
