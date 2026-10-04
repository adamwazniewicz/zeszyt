function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

function url(name: string, fallback?: string): URL | null {
  const value = process.env[name] || fallback;
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be a full URL like https://example.com, got "${value}"`);
  }
}

const isProduction = process.env.NODE_ENV === "production";

export const config = {
  iduBaseUrl: url("IDU_BASE_URL", "https://s31.idu.edu.pl")!,
  userAgent:
    process.env.IDU_USER_AGENT ?? "Zeszyt/0.1 (unofficial student client)",
  sessionSecret: isProduction
    ? required("SESSION_SECRET")
    : (process.env.SESSION_SECRET ?? "dev-only-insecure-secret"),
  port: Number(process.env.PORT ?? 8787),
  cookieSecure: isProduction,
  trustProxy: process.env.TRUST_PROXY === "1",
  /** Public URL behind a proxy (e.g. the zrok share), used for the CSRF origin check. */
  publicOrigin: url("PUBLIC_ORIGIN")?.origin ?? null,
  webDist: process.env.WEB_DIST ?? "../web/dist",
};
