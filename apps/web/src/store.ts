import { clear, get, set } from "idb-keyval";
import type { Attendance, Grades, Home, Me, NewsArticle, NewsList } from "@zeszyt/shared";

export interface Cached<T> {
  data: T;
  fetchedAt: number;
}

export interface Schema {
  me: Me;
  home: Home;
  grades: Grades;
  attendance: Attendance;
  news: NewsList;
  seenGrades: string[];
  [article: `article:${string}`]: NewsArticle;
}

export type StoreKey = keyof Schema & string;

export async function load<K extends StoreKey>(key: K): Promise<Cached<Schema[K]> | null> {
  return (await get<Cached<Schema[K]>>(key)) ?? null;
}

export async function save<K extends StoreKey>(key: K, data: Schema[K]): Promise<Cached<Schema[K]>> {
  const entry = { data, fetchedAt: Date.now() };
  await set(key, entry);
  return entry;
}

export const wipe = () => clear();

/** Asks the browser not to evict our IndexedDB under storage pressure. */
export function requestPersistence(): void {
  navigator.storage?.persist?.().catch(() => undefined);
}
