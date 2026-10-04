import type { NewsItem } from "@zeszyt/shared";
import { api } from "../api.ts";
import { Card, Empty, PageHeader, SyncBar } from "../components/Chrome.tsx";
import { Icon } from "../components/Icon.tsx";
import { formatDayTime } from "../lib/format.ts";
import { useSection } from "../lib/useSection.ts";

export function NewsPage({ onMenu }: { onMenu: () => void }) {
  const news = useSection("news", api.news);
  const items = news.entry?.data.items ?? [];
  const pinned = items.filter((n) => n.pinned);
  const rest = items.filter((n) => !n.pinned);

  return (
    <>
      <PageHeader title="Aktualności" backTo="#" onMenu={onMenu} />
      <SyncBar sync={news.sync} fetchedAt={news.entry?.fetchedAt ?? null} onRefresh={news.refresh} />
      {!news.entry ? (
        <Empty>{news.loaded ? "Wczytuję aktualności…" : ""}</Empty>
      ) : items.length === 0 ? (
        <Empty>Brak aktualności.</Empty>
      ) : (
        <div className="stack">
          {pinned.length > 0 && (
            <Card title="Przypięte">
              <NewsRows items={pinned} />
            </Card>
          )}
          {rest.length > 0 && (
            <Card title="Pozostałe">
              <NewsRows items={rest} />
            </Card>
          )}
        </div>
      )}
    </>
  );
}

function NewsRows({ items }: { items: NewsItem[] }) {
  return (
    <ul className="rows">
      {items.map((n) => (
        <li key={n.id}>
          <a className="row row-link" href={`#aktualnosci/${n.id}`}>
            {!n.read && <span className="unread-dot" aria-label="nieprzeczytane" />}
            <div className="row-main">
              <span className="row-title">{n.title}</span>
              <span className="row-sub">
                {formatDayTime(n.date)}
                {n.updated && ` · zaktualizowano ${formatDayTime(n.updated)}`}
                {n.comments > 0 && ` · ${n.comments} kom.`}
              </span>
            </div>
            <Icon name="chevron" size={18} />
          </a>
        </li>
      ))}
    </ul>
  );
}
