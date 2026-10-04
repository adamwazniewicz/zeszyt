import { describe, expect, it } from "vitest";
import { CookieJar } from "../src/idu/cookieJar.ts";
import { seal, unseal } from "../src/session/seal.ts";

describe("seal", () => {
  it("round-trips and rejects tampering or a wrong key", () => {
    const token = seal({ a: 1 }, "secret");
    expect(unseal(token, "secret")).toEqual({ a: 1 });
    expect(unseal(token, "other")).toBeNull();
    const tampered = token.slice(0, -2) + (token.endsWith("A") ? "BB" : "AA");
    expect(unseal(tampered, "secret")).toBeNull();
  });
});

describe("CookieJar", () => {
  it("tracks sets, rotations and deletions", () => {
    const jar = new CookieJar({ a: "1" });
    jar.absorb(["a=1; path=/"]);
    expect(jar.changed).toBe(false);
    jar.absorb(["a=2; path=/; HttpOnly", "b=x"]);
    expect(jar.toJSON()).toEqual({ a: "2", b: "x" });
    jar.absorb(["b=; Max-Age=0"]);
    expect(jar.header()).toBe("a=2");
    expect(jar.changed).toBe(true);
  });
});
