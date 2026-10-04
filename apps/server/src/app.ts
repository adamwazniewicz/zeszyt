import { Hono } from "hono";
import type { Context } from "hono";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { config } from "./config.ts";
import { IduClient } from "./idu/client.ts";
import { CookieJar } from "./idu/cookieJar.ts";
import { IduError } from "./idu/errors.ts";
import { parseAttendance } from "./parsers/attendance.ts";
import { parseGrades } from "./parsers/grades.ts";
import { parseHomeSummary } from "./parsers/home.ts";
import { parseMe } from "./parsers/me.ts";
import { parseNewsArticle, parseNewsList } from "./parsers/news.ts";
import { parseTimetable } from "./parsers/timetable.ts";
import { rateLimit } from "./rateLimit.ts";
import { clearSession, readSession, writeSession, type Session } from "./session/session.ts";

const STATUS_BY_CODE = {
  session_expired: 401,
  invalid_credentials: 401,
  bad_request: 400,
  rate_limited: 429,
  parse_failed: 422,
  idu_unavailable: 502,
} as const;

export interface AppOptions {
  fetch?: typeof fetch;
}

export function createApp(options: AppOptions = {}) {
  const clientFor = (jar: CookieJar) =>
    new IduClient(jar, {
      baseUrl: config.iduBaseUrl,
      userAgent: config.userAgent,
      fetch: options.fetch,
    });

  /** Runs `fn` with the caller's IDU session and re-seals the cookie if IDU rotated it. */
  async function withSession<T>(
    c: Context,
    fn: (idu: IduClient, session: Session) => Promise<T>,
  ): Promise<T> {
    const session = readSession(c);
    if (!session) throw new IduError("session_expired");
    const jar = new CookieJar(session.jar);
    try {
      return await fn(clientFor(jar), session);
    } finally {
      if (jar.changed) writeSession(c, { ...session, jar: jar.toJSON() });
    }
  }

  const app = new Hono();

  app.use("*", secureHeaders());
  app.get("/healthz", (c) => c.text("ok"));
  app.use(
    "/api/*",
    csrf({
      origin: (origin, c) =>
        config.publicOrigin ? origin === config.publicOrigin : origin === new URL(c.req.url).origin,
    }),
  );
  app.use("/api/*", rateLimit({ windowMs: 60_000, max: 60 }));

  app.onError((err, c) => {
    if (err instanceof IduError) {
      if (err.code === "session_expired") clearSession(c);
      return c.json({ error: err.code }, STATUS_BY_CODE[err.code]);
    }
    if (err instanceof HTTPException) return err.getResponse();
    console.error(err);
    return c.json({ error: "idu_unavailable" }, 502);
  });

  app.post("/api/login", rateLimit({ windowMs: 60_000, max: 5 }), async (c) => {
    // JSON-only: cross-site forms can't send it without a CORS preflight, which this server never grants.
    if (!c.req.header("content-type")?.startsWith("application/json")) throw new IduError("bad_request");
    const body = await c.req.json().catch(() => null);
    const login = typeof body?.login === "string" ? body.login.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!login || !password || login.length > 100 || password.length > 200) {
      throw new IduError("bad_request");
    }
    const jar = new CookieJar();
    const idu = clientFor(jar);
    const landing = await idu.login(login, password);
    const home = landing.url.pathname === "/" ? landing : await idu.get("/");
    const me = parseMe(home.html);
    writeSession(c, { jar: jar.toJSON(), me });
    return c.json(me);
  });

  app.post("/api/logout", async (c) => {
    const session = readSession(c);
    if (session) await clientFor(new CookieJar(session.jar)).logout();
    clearSession(c);
    return c.body(null, 204);
  });

  app.get("/api/me", (c) => withSession(c, async (_idu, session) => c.json(session.me)));

  app.get("/api/home", (c) =>
    withSession(c, async (idu) => {
      const home = await idu.get("/");
      return c.json({
        me: parseMe(home.html),
        timetable: parseTimetable(home.html),
        ...parseHomeSummary(home.html),
      });
    }),
  );

  app.get("/api/grades", (c) =>
    withSession(c, async (idu, { me }) =>
      c.json(parseGrades((await idu.get(`/students/${me.studentId}/grades`)).html)),
    ),
  );

  app.get("/api/attendance", (c) =>
    withSession(c, async (idu, { me }) =>
      c.json(parseAttendance((await idu.get(`/students/${me.studentId}/presences`)).html)),
    ),
  );

  app.get("/api/news", (c) =>
    withSession(c, async (idu) => c.json({ items: parseNewsList((await idu.get("/informations")).html) })),
  );

  app.get("/api/news/:id{[0-9]+}", (c) =>
    withSession(c, async (idu) => {
      const id = c.req.param("id");
      const page = await idu.get(`/informations/${id}`);
      return c.json(parseNewsArticle(page.html, id, config.iduBaseUrl));
    }),
  );

  return app;
}
