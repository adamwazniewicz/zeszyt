import { useEffect, type ReactNode } from "react";
import { ERROR_MESSAGES } from "../api.ts";
import { formatAgo } from "../lib/format.ts";
import { go, PAGES } from "../lib/router.ts";
import type { SyncState } from "../lib/useSection.ts";
import { Icon } from "./Icon.tsx";

export function PageHeader({
  title,
  subtitle,
  backTo,
  onMenu,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  onMenu: () => void;
}) {
  return (
    <header className="topbar">
      {backTo !== undefined && (
        <button className="icon-button back-button" onClick={() => go(backTo)} aria-label="Wróć">
          <Icon name="back" />
        </button>
      )}
      <div className="topbar-text">
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      <button className="icon-button" onClick={onMenu} aria-label="Menu">
        <Icon name="menu" />
      </button>
    </header>
  );
}

export function SyncBar({
  sync,
  fetchedAt,
  onRefresh,
}: {
  sync: SyncState;
  fetchedAt: number | null;
  onRefresh: () => void;
}) {
  const label =
    sync.kind === "syncing"
      ? "Odświeżam…"
      : sync.kind === "error" && sync.code !== "session_expired"
        ? ERROR_MESSAGES[sync.code]
        : fetchedAt
          ? `Zaktualizowano ${formatAgo(fetchedAt)}`
          : "";
  return (
    <div className={`syncbar${sync.kind === "error" ? " syncbar-error" : ""}`}>
      <span>{label}</span>
      <button className="ghost-button" onClick={onRefresh} disabled={sync.kind === "syncing"}>
        Odśwież
      </button>
    </div>
  );
}

export function Menu({ open, onClose, onLogout }: { open: boolean; onClose: () => void; onLogout: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className="menu-root" data-open={open} aria-hidden={!open}>
      <div className="menu-backdrop" onClick={onClose} />
      <nav className="menu-sheet" aria-label="Sekcje">
        <div className="menu-head">
          <span>Menu</span>
          <button className="icon-button" onClick={onClose} aria-label="Zamknij" tabIndex={open ? 0 : -1}>
            <Icon name="close" />
          </button>
        </div>
        {[{ hash: "#", title: "Start" }, ...PAGES].map((p) => (
          <button key={p.hash} className="menu-item" onClick={() => { go(p.hash); onClose(); }} tabIndex={open ? 0 : -1}>
            {p.title}
            <Icon name="chevron" size={18} />
          </button>
        ))}
        <button className="menu-item menu-logout" onClick={onLogout} tabIndex={open ? 0 : -1}>
          Wyloguj
        </button>
      </nav>
    </div>
  );
}

export function Card({ title, href, children }: { title: string; href?: string; children: ReactNode }) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>{title}</h2>
        {href && (
          <a className="card-link" href={href}>
            Wszystkie
            <Icon name="chevron" size={16} />
          </a>
        )}
      </div>
      {children}
    </section>
  );
}

export function CardLink({ title, href }: { title: string; href: string }) {
  return (
    <a className="card card-folded" href={href}>
      <h2>{title}</h2>
      <Icon name="chevron" size={18} />
    </a>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
