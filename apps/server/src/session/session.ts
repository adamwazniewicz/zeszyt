import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Me } from "@zeszyt/shared";
import { config } from "../config.ts";
import type { CookieRecord } from "../idu/cookieJar.ts";
import { seal, unseal } from "./seal.ts";

const COOKIE_NAME = "zs";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export interface Session {
  jar: CookieRecord;
  me: Me;
}

export function readSession(c: Context): Session | null {
  const token = getCookie(c, COOKIE_NAME);
  return token ? unseal<Session>(token, config.sessionSecret) : null;
}

export function writeSession(c: Context, session: Session): void {
  setCookie(c, COOKIE_NAME, seal(session, config.sessionSecret), {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "Strict",
    path: "/api",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSession(c: Context): void {
  deleteCookie(c, COOKIE_NAME, { path: "/api", secure: config.cookieSecure });
}
