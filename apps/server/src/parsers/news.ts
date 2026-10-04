import * as cheerio from "cheerio";
import sanitizeHtml from "sanitize-html";
import type { NewsArticle, NewsItem } from "@zeszyt/shared";
import { IduError } from "../idu/errors.ts";
import { clean, idFromHref, parsePlDate } from "./text.ts";

export function parseNewsItems($: cheerio.CheerioAPI): NewsItem[] {
  const seen = new Set<string>();
  return $(".profile-event.news")
    .toArray()
    .flatMap((node) => {
      const el = $(node);
      const link = el.find('.name a[href*="/informations/"]').first();
      const id = idFromHref(link.attr("href"), "informations");
      if (!id || seen.has(id)) return [];
      seen.add(id);
      const updated = clean(el.find(".name").text()).match(/Aktualizacja:\s*(\d{1,2}\s+\S+\s+\d{4},?\s+\d{1,2}:\d{2})/)?.[1];
      const priority = Number(el.attr("class")?.match(/priority_(\d+)/)?.[1] ?? 0);
      const comments = Number(clean(el.text()).match(/komentarze:\s*(\d+)/)?.[1] ?? 0);
      return [
        {
          id,
          title: clean(link.text()),
          date: parsePlDate(el.find(".date").text()),
          updated: parsePlDate(updated),
          pinned: el.hasClass("sticky"),
          priority,
          comments,
          read: el.hasClass("read"),
        },
      ];
    });
}

export function parseNewsList(html: string): NewsItem[] {
  return parseNewsItems(cheerio.load(html));
}

export function parseNewsArticle(html: string, id: string, baseUrl: URL): NewsArticle {
  const $ = cheerio.load(html);
  const heading = $("#content .module h1").first();
  if (!heading.length) throw new IduError("parse_failed", "No article heading");
  const body = heading
    .nextAll()
    .toArray()
    .map((el) => $.html(el))
    .join("");

  return { id, title: clean(heading.text()), html: sanitizeArticle(body, baseUrl) };
}

/** Keeps structure and outside images; drops styling, scripts, and IDU-hosted images that need a session. */
export function sanitizeArticle(html: string, baseUrl: URL): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li",
      "h2", "h3", "h4", "blockquote", "img", "table", "thead", "tbody", "tr", "th", "td", "hr",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["https"] },
    transformTags: {
      a: (tagName, attribs): sanitizeHtml.Tag => {
        const attrs: sanitizeHtml.Attributes = { target: "_blank", rel: "noopener noreferrer" };
        if (attribs.href) attrs.href = new URL(attribs.href, baseUrl).toString();
        return { tagName, attribs: attrs };
      },
    },
    exclusiveFilter: (frame) =>
      frame.tag === "img" && (!/^https:\/\//.test(frame.attribs.src ?? "") || frame.attribs.src!.startsWith(baseUrl.origin)),
  }).replace(/(<p>\s*(&nbsp;|\u00a0)?\s*<\/p>)+/g, "");
}
