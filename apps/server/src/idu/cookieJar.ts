export type CookieRecord = Record<string, string>;

/** Single-host cookie jar; IDU is one origin so domain/path scoping is unnecessary. */
export class CookieJar {
  private cookies: Map<string, string>;
  changed = false;

  constructor(initial: CookieRecord = {}) {
    this.cookies = new Map(Object.entries(initial));
  }

  absorb(setCookieHeaders: string[]): void {
    for (const header of setCookieHeaders) {
      const [pair, ...attrs] = header.split(";");
      if (!pair) continue;
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const expired = attrs.some((attr) => {
        const [key, val] = attr.split("=").map((s) => s.trim().toLowerCase());
        if (key === "max-age") return Number(val) <= 0;
        if (key === "expires" && val) return Date.parse(val) < Date.now();
        return false;
      });
      const previous = this.cookies.get(name);
      if (expired || value === "") {
        if (previous !== undefined) {
          this.cookies.delete(name);
          this.changed = true;
        }
      } else if (previous !== value) {
        this.cookies.set(name, value);
        this.changed = true;
      }
    }
  }

  header(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  toJSON(): CookieRecord {
    return Object.fromEntries(this.cookies);
  }
}
