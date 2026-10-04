import * as cheerio from "cheerio";
import { CookieJar } from "./cookieJar.ts";
import { IduError } from "./errors.ts";

const ALLOWED_GET_PATHS: RegExp[] = [
  /^\/$/,
  /^\/users\/sign_in$/,
  /^\/users\/sign_out$/,
  /^\/students\/\d+$/,
  /^\/students\/\d+\/(grades|presences|homeworks)$/,
  /^\/internal_messages$/,
  /^\/internal_messages\/\d+\/watek$/,
  /^\/informations$/,
  /^\/informations\/\d+$/,
];

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;
const SIGN_IN_PATH = "/users/sign_in";

export interface IduPage {
  url: URL;
  html: string;
}

export interface IduClientOptions {
  baseUrl: URL;
  userAgent: string;
  fetch?: typeof fetch;
}

export class IduClient {
  private readonly fetchImpl: typeof fetch;

  constructor(
    readonly jar: CookieJar,
    private readonly options: IduClientOptions,
  ) {
    this.fetchImpl = options.fetch ?? fetch;
  }

  async get(path: string): Promise<IduPage> {
    if (!ALLOWED_GET_PATHS.some((re) => re.test(path))) {
      throw new IduError("bad_request", `Path not allowed: ${path}`);
    }
    const page = await this.request(new URL(path, this.options.baseUrl), { method: "GET" });
    if (page.url.pathname === SIGN_IN_PATH && path !== SIGN_IN_PATH) {
      throw new IduError("session_expired");
    }
    return page;
  }

  async login(login: string, password: string): Promise<IduPage> {
    const form = await this.get(SIGN_IN_PATH);
    const $ = cheerio.load(form.html);
    const token = $('#new_user input[name="authenticity_token"]').attr("value");
    if (!token) throw new IduError("parse_failed", "No authenticity_token on sign-in form");

    const body = new URLSearchParams({
      utf8: "✓",
      authenticity_token: token,
      "user[login]": login,
      "user[password]": password,
      "user[remember_me]": "1",
      not_a_robot: "1",
      commit: "Zaloguj",
    });
    const result = await this.request(new URL(SIGN_IN_PATH, this.options.baseUrl), {
      method: "POST",
      body,
      contentType: "application/x-www-form-urlencoded",
    });
    if (result.url.pathname === SIGN_IN_PATH || cheerio.load(result.html)("#new_user").length) {
      throw new IduError("invalid_credentials");
    }
    return result;
  }

  async logout(): Promise<void> {
    await this.get("/users/sign_out").catch(() => undefined);
  }

  private async request(
    url: URL,
    init: { method: "GET" | "POST"; body?: URLSearchParams; contentType?: string },
  ): Promise<IduPage> {
    let current = url;
    let method = init.method;
    let body = init.body;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (current.origin !== this.options.baseUrl.origin) {
        throw new IduError("idu_unavailable", `Refusing cross-origin redirect to ${current.origin}`);
      }
      const headers: Record<string, string> = {
        "User-Agent": this.options.userAgent,
        "Accept-Language": "pl,en;q=0.8",
        Accept: "text/html,application/xhtml+xml",
      };
      const cookie = this.jar.header();
      if (cookie) headers.Cookie = cookie;
      if (body && init.contentType) headers["Content-Type"] = init.contentType;

      let response: Response;
      try {
        response = await this.fetchImpl(current, {
          method,
          headers,
          body,
          redirect: "manual",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (err) {
        throw new IduError("idu_unavailable", String(err));
      }
      this.jar.absorb(response.headers.getSetCookie());

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new IduError("idu_unavailable", "Redirect without Location");
        current = new URL(location, current);
        method = "GET";
        body = undefined;
        continue;
      }
      if (response.status >= 500) {
        throw new IduError("idu_unavailable", `IDU responded ${response.status}`);
      }
      return { url: current, html: await response.text() };
    }
    throw new IduError("idu_unavailable", "Too many redirects");
  }
}
