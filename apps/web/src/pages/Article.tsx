import { api } from "../api.ts";
import { Empty, PageHeader, SyncBar } from "../components/Chrome.tsx";
import { useSection } from "../lib/useSection.ts";

export function ArticlePage({ id, onMenu }: { id: string; onMenu: () => void }) {
  // Opening an article marks it read on IDU, so a saved copy is never refetched automatically.
  const article = useSection(`article:${id}`, () => api.article(id), { onlyIfMissing: true });
  const data = article.entry?.data;

  return (
    <>
      <PageHeader title="Aktualność" backTo="#aktualnosci" onMenu={onMenu} />
      <SyncBar sync={article.sync} fetchedAt={article.entry?.fetchedAt ?? null} onRefresh={article.refresh} />
      {!data ? (
        <Empty>{article.loaded ? "Wczytuję…" : ""}</Empty>
      ) : (
        <article className="card article">
          <h2 className="article-title">{data.title}</h2>
          {/* Sanitized server-side against a strict tag/attribute allowlist. */}
          <div className="prose" dangerouslySetInnerHTML={{ __html: data.html }} />
        </article>
      )}
    </>
  );
}
