import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ActivityPage,
  ActivityReply,
  ActivityUnion,
  AiringSchedule,
  FuzzyDate,
  Media,
  MediaListEntry,
  Page,
  PageInfo,
  Viewer,
} from "../types/anilist";

type CacheEntry<T> = { value: T; expiresAt: number };
const MAX_CACHE_ENTRIES = 250;
const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();
const cacheListeners = new Set<(prefix: string, mode: "invalidate" | "patched") => void>();

const TTL = {
  viewer: 5 * 60_000,
  library: 2 * 60_000,
  media: 10 * 60_000,
  discovery: 10 * 60_000,
  search: 2 * 60_000,
  activity: 3 * 60_000,
  calendar: 10 * 60_000,
};

function setCacheEntry<T>(key: string, value: T, ttl: number) {
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttl });
}

async function cached<T>(key: string, ttl: number, request: () => Promise<T>, force = false): Promise<T> {
  const existing = cache.get(key) as CacheEntry<T> | undefined;
  if (!force && existing && existing.expiresAt > Date.now()) {
    // Refresh LRU recency
    cache.delete(key);
    cache.set(key, existing);
    return existing.value;
  }

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = request().then((value) => {
    setCacheEntry(key, value, ttl);
    return value;
  }).finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

export function clearAniListCache(prefix = "") {
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
  for (const listener of cacheListeners) listener(prefix, "invalidate");
}

function patchLibraryCache(updated: MediaListEntry) {
  for (const [key, entry] of cache.entries()) {
    if (!key.startsWith("library:")) continue;
    const list = entry.value as MediaListEntry[];
    if (!Array.isArray(list)) continue;

    const statusFilter = key.split(":")[2];
    const matchesStatus = !statusFilter || statusFilter === "all" || updated.status === statusFilter;
    const exists = list.some((item) => item.mediaId === updated.mediaId);

    let nextList: MediaListEntry[];
    if (exists) {
      nextList = matchesStatus
        ? list.map((item) => (item.mediaId === updated.mediaId ? { ...item, ...updated } : item))
        : list.filter((item) => item.mediaId !== updated.mediaId);
    } else if (matchesStatus) {
      nextList = [updated, ...list];
    } else {
      nextList = list;
    }

    cache.set(key, { value: nextList, expiresAt: entry.expiresAt });
  }
  for (const listener of cacheListeners) listener("library:", "patched");
}

function removeFromLibraryCache(entryId: number) {
  for (const [key, entry] of cache.entries()) {
    if (!key.startsWith("library:")) continue;
    const list = entry.value as MediaListEntry[];
    if (!Array.isArray(list)) continue;
    cache.set(key, {
      value: list.filter((item) => item.id !== entryId),
      expiresAt: entry.expiresAt,
    });
  }
  for (const listener of cacheListeners) listener("library:", "patched");
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

  useEffect(() => {
    if (!enabled) return;
    const onInvalidate = (prefix: string, mode: "invalidate" | "patched") => {
      if (!key.startsWith(prefix)) return;
      if (mode === "patched") {
        const entry = cache.get(key) as CacheEntry<T> | undefined;
        if (entry) setData(entry.value);
      } else {
        void load(true);
      }
    };
    cacheListeners.add(onInvalidate);
    return () => { cacheListeners.delete(onInvalidate); };
  }, [enabled, key, load]);

  return { data, isLoading, error, refetch: () => load(true) };
}

export function useViewer() {
  const query = useCachedQuery("viewer", TTL.viewer, () => invoke<Viewer>("get_viewer"));
  return { viewer: query.data, ...query };
}

function useLibrary(mediaType: "ANIME" | "MANGA", status?: string, enabled = true) {
  const key = `library:${mediaType}:${status ?? "all"}`;
  const query = useCachedQuery(
    key,
    TTL.library,
    () => invoke<MediaListEntry[]>("get_user_list", { mediaType, status: status || undefined }),
    enabled,
  );
  return { list: query.data ?? [], ...query };
}

export const useAnimeList = (status?: string, enabled = true) =>
  useLibrary("ANIME", status, enabled);
export const useMangaList = (status?: string, enabled = true) =>
  useLibrary("MANGA", status, enabled);

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
  const updateEntry = async (data: {
    mediaId: number;
    status?: string;
    score?: number;
    progress?: number;
    progressVolumes?: number;
    repeat?: number;
    notes?: string;
    startedAt?: FuzzyDate;
    completedAt?: FuzzyDate;
  }) => {
    setIsLoading(true); setError(null);
    try {
      const updated = await invoke<MediaListEntry>("update_entry", data);
      patchLibraryCache(updated);
      clearAniListCache("viewer");
    }
    catch (reason) { console.error(reason); setError("Failed to update entry"); throw reason; }
    finally { setIsLoading(false); }
  };
  return { updateEntry, isLoading, error };
}

export function useDeleteEntry() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteEntry = async (entryId: number) => {
    setIsLoading(true); setError(null);
    try {
      await invoke<boolean>("delete_entry", { entryId });
      removeFromLibraryCache(entryId);
      clearAniListCache("viewer");
    } catch (reason) {
      console.error(reason);
      setError("Failed to remove entry");
      throw reason;
    } finally {
      setIsLoading(false);
    }
  };
  return { deleteEntry, isLoading, error };
}

function useDiscovery(kind: "trending" | "popular") {
  const command = `${kind}_anime`;
  const query = useCachedQuery(`discovery:${kind}`, TTL.discovery, () => invoke<Page<Media>>(command, { page: 1, perPage: 20 }));
  return { results: query.data, ...query };
}

export const useTrendingAnime = () => useDiscovery("trending");
export const usePopularAnime = () => useDiscovery("popular");

export interface DiscoverMediaParams {
  mediaType: "ANIME" | "MANGA";
  search?: string;
  genre?: string;
  seasonYear?: number;
  season?: string;
  format?: string;
  status?: string;
  sort?: string;
  page?: number;
  perPage?: number;
  enabled?: boolean;
}

export function useDiscoverMedia(params: DiscoverMediaParams) {
  const {
    mediaType,
    search,
    genre,
    seasonYear,
    season,
    format,
    status,
    sort,
    page = 1,
    perPage = 20,
    enabled = true,
  } = params;

  const normalizedSearch = search?.trim().replace(/\s+/g, " ") || undefined;
  const key = `discover:${mediaType}:${normalizedSearch ?? ""}:${genre ?? ""}:${seasonYear ?? ""}:${season ?? ""}:${format ?? ""}:${status ?? ""}:${sort ?? ""}:${page}:${perPage}`;

  const query = useCachedQuery(
    key,
    TTL.discovery,
    () =>
      invoke<Page<Media>>("discover_media", {
        mediaType,
        search: normalizedSearch,
        genre: genre || undefined,
        seasonYear: seasonYear || undefined,
        season: season || undefined,
        format: format || undefined,
        status: status || undefined,
        sort: sort || undefined,
        page,
        perPage,
      }),
    enabled,
  );

  return { results: query.data, ...query };
}

export function useToggleFavourite() {
  const [isLoading, setIsLoading] = useState(false);
  const toggleFavourite = async (mediaId: number, mediaType: "anime" | "manga") => {
    setIsLoading(true);
    try {
      const nextState = await invoke<boolean>("toggle_favourite", {
        mediaId,
        mediaType: mediaType.toUpperCase(),
      });
      clearAniListCache(`${mediaType}:${mediaId}`);
      clearAniListCache("viewer");
      return nextState;
    } finally {
      setIsLoading(false);
    }
  };
  return { toggleFavourite, isLoading };
}

export function useAiringCalendar(startTime: number, endTime: number) {
  const key = `calendar:${startTime}:${endTime}`;
  const query = useCachedQuery(
    key,
    TTL.calendar,
    () =>
      invoke<{ pageInfo: PageInfo; airingSchedules: AiringSchedule[] }>(
        "fetch_airing_calendar",
        { startTime, endTime },
      ),
  );
  return {
    schedules: query.data?.airingSchedules ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export type ActivityScope = "personal" | "following" | "global";
export type ActivityTypeFilter = "all" | "TEXT" | "LIST";

export function useUserActivities(
  page: number = 1,
  perPage: number = 20,
  scope: ActivityScope = "personal",
  typeFilter: ActivityTypeFilter = "all",
  enabled: boolean = true,
) {
  const typeIn =
    typeFilter === "TEXT"
      ? ["TEXT"]
      : typeFilter === "LIST"
        ? ["ANIME_LIST", "MANGA_LIST"]
        : undefined;

  const key = `activities:${scope}:${typeFilter}:${page}:${perPage}`;
  const query = useCachedQuery(
    key,
    TTL.activity,
    () =>
      invoke<ActivityPage>("get_user_activities", {
        scope,
        typeIn,
        page,
        perPage,
      }),
    enabled,
  );
  return { activities: query.data, ...query };
}

export async function fetchActivityReplies(activityId: number) {
  return invoke<ActivityReply[]>("get_activity_replies", { activityId });
}

export async function toggleActivityLike(
  id: number,
  likeType: "ACTIVITY" | "ACTIVITY_REPLY",
) {
  return invoke<{ id: number; likeCount: number; isLiked: boolean }>(
    "toggle_like",
    { id, likeType },
  );
}

export async function postTextActivity(text: string) {
  const created = await invoke<ActivityUnion>("save_text_activity", { text });
  clearAniListCache("activities:");
  return created;
}

export async function postActivityReply(activityId: number, text: string) {
  return invoke<ActivityReply>("save_activity_reply", { activityId, text });
}

export async function removeActivity(id: number) {
  const deleted = await invoke<boolean>("delete_activity", { id });
  if (deleted) clearAniListCache("activities:");
  return deleted;
}

export async function removeActivityReply(id: number) {
  return invoke<boolean>("delete_activity_reply", { id });
}
