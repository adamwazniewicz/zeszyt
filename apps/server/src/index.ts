import { readFile } from "node:fs/promises";
import path from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app.ts";
import { config } from "./config.ts";

const app = createApp();

const webDist = path.resolve(config.webDist);
app.use("/*", serveStatic({ root: path.relative(process.cwd(), webDist) }));
app.get("*", async (c) => {
  if (c.req.path.startsWith("/api/")) return c.json({ error: "bad_request" }, 404);
  try {
    return c.html(await readFile(path.join(webDist, "index.html"), "utf8"));
  } catch {
    return c.text("Web build not found. Run `npm run build`.", 404);
  }
});

serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(`Zeszyt server on http://localhost:${port} → ${config.iduBaseUrl.origin}`);
});
