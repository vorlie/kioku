import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Media, MediaListEntry, Page, Viewer } from "../types/anilist";

type CacheEntry<T> = { value: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

const TTL = {
  viewer: 5 * 60_000,
  library: 60_000,
  media: 10 * 60_000,
  discovery: 10 * 60_000,
  search: 2 * 60_000,
};

async function cached<T>(key: string, ttl: number, request: () => Promise<T>, force = false): Promise<T> {
  const existing = cache.get(key) as CacheEntry<T> | undefined;
  if (!force && existing && existing.expiresAt > Date.now()) return existing.value;

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = request().then((value) => {
    cache.set(key, { value, expiresAt: Date.now() + ttl });
    return value;
  }).finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

export function clearAniListCache(prefix = "") {
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
}

type QueryResult<T> = { data: T | null; isLoading: boolean; error: string | null; refetch: () => Promise<void> };

function useCachedQuery<T>(key: string, ttl: number, request: () => Promise<T>, enabled = true): QueryResult<T> {
  const requestRef = useRef(request);
  requestRef.current = request;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (!enabled) { setData(null); setIsLoading(false); return; }
    setIsLoading(true); setError(null);
    try { setData(await cached(key, ttl, requestRef.current, force)); }
    catch (reason) { console.error(reason); setError("Unable to load data. Please try again."); }
    finally { setIsLoading(false); }
  }, [enabled, key, ttl]);

  useEffect(() => { void load(); }, [load]);
  return { data, isLoading, error, refetch: () => load(true) };
}

export function useViewer() {
  const query = useCachedQuery("viewer", TTL.viewer, () => invoke<Viewer>("get_viewer"));
  return { viewer: query.data, ...query };
}

function useLibrary(mediaType: "ANIME" | "MANGA", status?: string) {
  const key = `library:${mediaType}:${status ?? "all"}`;
  const query = useCachedQuery(key, TTL.library, () => invoke<MediaListEntry[]>("get_user_list", { mediaType, status: status || undefined }));
  return { list: query.data ?? [], ...query };
}

export const useAnimeList = (status?: string) => useLibrary("ANIME", status);
export const useMangaList = (status?: string) => useLibrary("MANGA", status);

function useMedia<T extends "anime" | "manga">(type: T, id: number): ({ [K in T]: Media | null } & QueryResult<Media>) {
  const query = useCachedQuery<Media>(`${type}:${id}`, TTL.media, () => invoke<Media>(`get_${type}`, { id }), Boolean(id));
  return { [type]: query.data, ...query } as ({ [K in T]: Media | null } & QueryResult<Media>);
}

export const useAnime = (id: number) => {
  const query = useMedia("anime", id);
  return { ...query, anime: query.anime as Media | null };
};
export const useManga = (id: number) => {
  const query = useMedia("manga", id);
  return { ...query, manga: query.manga as Media | null };
};

function useSearch(type: "anime" | "manga", query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 400);
    return () => window.clearTimeout(timer);
  }, [query]);
  const normalized = debouncedQuery.trim().replace(/\s+/g, " ");
  const key = `search:${type}:${normalized.toLowerCase()}`;
  const result = useCachedQuery(key, TTL.search, () => invoke<Page<Media>>(`search_${type}`, { search: normalized, page: 1, perPage: 20 }), Boolean(normalized));
  return { results: result.data, isLoading: result.isLoading && Boolean(normalized), error: result.error };
}

export const useSearchAnime = (query: string) => useSearch("anime", query);
export const useSearchManga = (query: string) => useSearch("manga", query);

export function useUpdateEntry() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateEntry = async (data: { mediaId: number; status?: string; score?: number; progress?: number }) => {
    setIsLoading(true); setError(null);
    try { await invoke("update_entry", data); clearAniListCache("library:"); clearAniListCache("viewer"); }
    catch (reason) { console.error(reason); setError("Failed to update entry"); throw reason; }
    finally { setIsLoading(false); }
  };
  return { updateEntry, isLoading, error };
}

function useDiscovery(kind: "trending" | "popular") {
  const command = `${kind}_anime`;
  const query = useCachedQuery(`discovery:${kind}`, TTL.discovery, () => invoke<Page<Media>>(command, { page: 1, perPage: 20 }));
  return { results: query.data, ...query };
}

export const useTrendingAnime = () => useDiscovery("trending");
export const usePopularAnime = () => useDiscovery("popular");
