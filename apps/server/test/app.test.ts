import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";

const hall = readFileSync(new URL("./fixtures/hall.synthetic.html", import.meta.url), "utf8");
const signIn = `<form id="new_user" action="/users/sign_in" method="post">
  <input type="hidden" name="authenticity_token" value="tok123"></form>`;

/** Minimal fake of IDU's Devise flow. */
function fakeIdu() {
  const calls: { method: string; path: string; cookie: string | null; body?: string }[] = [];
  const impl = async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    const cookie = headers.get("cookie");
    const method = init?.method ?? "GET";
    calls.push({ method, path: url.pathname, cookie, body: init?.body?.toString() });

    const loggedIn = cookie?.includes("_idu_session2=auth");
    if (url.pathname === "/users/sign_in" && method === "GET") {
      return new Response(signIn, { headers: { "set-cookie": "_idu_session2=anon; path=/" } });
    }
    if (url.pathname === "/users/sign_in" && method === "POST") {
      const ok = init?.body?.toString().includes("user%5Bpassword%5D=good");
      if (!ok) return new Response(signIn, { status: 200 });
      return new Response(null, {
        status: 302,
        headers: { location: "/", "set-cookie": "_idu_session2=auth; path=/; HttpOnly" },
      });
    }
    if (url.pathname === "/") {
      return loggedIn
        ? new Response(hall)
        : new Response(null, { status: 302, headers: { location: "/users/sign_in" } });
    }
    return new Response("not found", { status: 404 });
  };
  return { impl: impl as typeof fetch, calls };
}

const jsonPost = (body: unknown, cookie?: string) => ({
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: "http://localhost",
    ...(cookie ? { cookie } : {}),
  },
  body: JSON.stringify(body),
});

describe("api", () => {
  it("logs in, seals the session, and serves the timetable", async () => {
    const idu = fakeIdu();
    const app = createApp({ fetch: idu.impl });

    const login = await app.request("http://localhost/api/login", jsonPost({ login: "jan", password: "good" }));
    expect(login.status).toBe(200);
    expect(await login.json()).toMatchObject({ studentId: "22222", displayName: "Jan Testowy" });

    const setCookie = login.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/^zs=/);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).not.toContain("auth");
    const cookie = setCookie.split(";")[0]!;

    const post = idu.calls.find((c) => c.method === "POST");
    expect(post?.body).toContain("authenticity_token=tok123");
    expect(post?.cookie).toBe("_idu_session2=anon");

    const home = await app.request("http://localhost/api/home", { headers: { cookie } });
    expect(home.status).toBe(200);
    const body = await home.json();
    expect(body.me.studentId).toBe("22222");
    expect(body.timetable.weekStart).toBe("2026-09-28");
  });

  it("rejects bad credentials", async () => {
    const app = createApp({ fetch: fakeIdu().impl });
    const res = await app.request("http://localhost/api/login", jsonPost({ login: "jan", password: "bad" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_credentials" });
  });

  it("rejects form-style cross-site logins", async () => {
    const app = createApp({ fetch: fakeIdu().impl });
    const body = JSON.stringify({ login: "jan", password: "good" });
    const crossSite = await app.request("http://localhost/api/login", {
      method: "POST",
      headers: { "content-type": "text/plain", origin: "https://evil.example" },
      body,
    });
    expect(crossSite.status).toBe(403);
    const sameSiteForm = await app.request("http://localhost/api/login", {
      method: "POST",
      headers: { "content-type": "text/plain", origin: "http://localhost" },
      body,
    });
    expect(sameSiteForm.status).toBe(400);
  });

  it("returns session_expired without a cookie", async () => {
    const app = createApp({ fetch: fakeIdu().impl });
    const res = await app.request("http://localhost/api/home");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "session_expired" });
  });
});
