import { useEffect, useState } from "react";

export type Route =
  | { name: "start" }
  | { name: "plan" }
  | { name: "grades" }
  | { name: "attendance" }
  | { name: "events" }
  | { name: "news" }
  | { name: "article"; id: string };

export const PAGES = [
  { name: "plan", hash: "#plan", title: "Plan lekcji" },
  { name: "grades", hash: "#oceny", title: "Oceny" },
  { name: "attendance", hash: "#obecnosci", title: "Obecności" },
  { name: "events", hash: "#wydarzenia", title: "Wydarzenia" },
  { name: "news", hash: "#aktualnosci", title: "Aktualności" },
] as const;

function parse(hash: string): Route {
  const article = hash.match(/^#aktualnosci\/(\d+)$/);
  if (article) return { name: "article", id: article[1]! };
  const page = PAGES.find((p) => p.hash === hash);
  return page ? { name: page.name } : { name: "start" };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function go(hash: string): void {
  if (location.hash !== hash) location.hash = hash;
}
