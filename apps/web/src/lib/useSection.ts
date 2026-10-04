import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiError, type ClientErrorCode } from "../api.ts";
import { load, save, type Cached, type Schema, type StoreKey } from "../store.ts";

export type SyncState = { kind: "idle" } | { kind: "syncing" } | { kind: "error"; code: ClientErrorCode };

export const SessionContext = createContext<{ expire: () => void }>({ expire: () => undefined });

export interface Section<T> {
  entry: Cached<T> | null;
  loaded: boolean;
  sync: SyncState;
  refresh: () => Promise<void>;
}

/**
 * Renders from IndexedDB first, then fetches. With `onlyIfMissing`, a cached copy is
 * never refetched automatically (used for reads that mark items as read on IDU).
 */
export function useSection<K extends StoreKey>(
  key: K,
  fetcher: () => Promise<Schema[K]>,
  { onlyIfMissing = false, onData }: { onlyIfMissing?: boolean; onData?: (data: Schema[K]) => void } = {},
): Section<Schema[K]> {
  const { expire } = useContext(SessionContext);
  const [entry, setEntry] = useState<Cached<Schema[K]> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sync, setSync] = useState<SyncState>({ kind: "idle" });

  const refresh = useCallback(async () => {
    setSync({ kind: "syncing" });
    try {
      const data = await fetcher();
      setEntry(await save(key, data));
      onData?.(data);
      setSync({ kind: "idle" });
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "idu_unavailable";
      if (code === "session_expired") expire();
      setSync({ kind: "error", code });
    }
    // fetcher/onData are recreated each render; the key identifies the section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, expire]);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setEntry(null);
    void load(key).then((cached) => {
      if (cancelled) return;
      setEntry(cached);
      setLoaded(true);
      if (!(onlyIfMissing && cached)) void refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [key, onlyIfMissing, refresh]);

  return { entry, loaded, sync, refresh };
}
