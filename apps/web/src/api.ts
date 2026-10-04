import type { ApiErrorCode, Attendance, Grades, Home, Me, NewsArticle, NewsList } from "@zeszyt/shared";

export type ClientErrorCode = ApiErrorCode | "offline";

export class ApiError extends Error {
  constructor(readonly code: ClientErrorCode) {
    super(code);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    const headers = new Headers(init?.headers);
    // zrok.io serves a warning page instead of our API unless this header is present.
    headers.set("skip_zrok_interstitial", "1");
    res = await fetch(path, { credentials: "same-origin", ...init, headers });
  } catch {
    throw new ApiError("offline");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error ?? "idu_unavailable");
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  login: (login: string, password: string) =>
    call<Me>("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    }),
  logout: () => call<void>("/api/logout", { method: "POST" }),
  home: () => call<Home>("/api/home"),
  grades: () => call<Grades>("/api/grades"),
  attendance: () => call<Attendance>("/api/attendance"),
  news: () => call<NewsList>("/api/news"),
  article: (id: string) => call<NewsArticle>(`/api/news/${encodeURIComponent(id)}`),
};

export const ERROR_MESSAGES: Record<ClientErrorCode, string> = {
  invalid_credentials: "Nieprawidłowy login lub hasło.",
  session_expired: "Sesja wygasła. Zaloguj się ponownie.",
  rate_limited: "Za dużo prób. Spróbuj ponownie za minutę.",
  idu_unavailable: "IDU nie odpowiada. Spróbuj później.",
  parse_failed: "IDU zmieniło wygląd strony. Ta sekcja wymaga aktualizacji aplikacji.",
  bad_request: "Nieprawidłowe zapytanie.",
  offline: "Brak połączenia. Pokazuję zapisane dane.",
};
