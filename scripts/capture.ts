import { mkdir, writeFile } from "node:fs/promises";
import { IduClient } from "../apps/server/src/idu/client.ts";
import { CookieJar } from "../apps/server/src/idu/cookieJar.ts";
import { parseMe } from "../apps/server/src/parsers/me.ts";

const login = process.env.IDU_LOGIN;
const password = process.env.IDU_PASSWORD;
if (!login || !password) {
  console.error("Set IDU_LOGIN and IDU_PASSWORD (e.g. in .env).");
  process.exit(1);
}

const outDir = new URL("../fixtures/raw/", import.meta.url);
await mkdir(outDir, { recursive: true });

const idu = new IduClient(new CookieJar(), {
  baseUrl: new URL(process.env.IDU_BASE_URL ?? "https://s31.idu.edu.pl"),
  userAgent: process.env.IDU_USER_AGENT ?? "Zeszyt/0.1 (unofficial student client; fixture capture)",
});

await idu.login(login, password);
const home = await idu.get("/");
const { studentId } = parseMe(home.html);

const pages: Record<string, string> = {
  hall: "/",
  profile: `/students/${studentId}`,
  grades: `/students/${studentId}/grades`,
  presences: `/students/${studentId}/presences`,
  homeworks: `/students/${studentId}/homeworks`,
  messages: "/internal_messages",
  news: "/informations",
};

for (const [name, path] of Object.entries(pages)) {
  const page = name === "hall" ? home : await idu.get(path);
  await writeFile(new URL(`${name}.html`, outDir), page.html);
  console.log(`saved ${name}.html (${page.html.length} bytes)`);
  await new Promise((r) => setTimeout(r, 1000));

  if (name === "news") {
    // Opening an article marks it read on IDU, so only capture one that is already read.
    const articleId = page.html.match(/class="profile-event news read[^"]*">\s*<span class="name">[\s\S]*?\/informations\/(\d+)/)?.[1];
    if (articleId) {
      const article = await idu.get(`/informations/${articleId}`);
      await writeFile(new URL("news-article.html", outDir), article.html);
      console.log(`saved news-article.html (${article.html.length} bytes)`);
    }
  }
}

await idu.logout();
