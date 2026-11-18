import { useEffect, useMemo, useState } from "react";
import { Compass, Loader2, Search as SearchIcon } from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import {
  useAnimeList,
  useDiscoverMedia,
  useMangaList,
} from "../../hooks/useAniList";
import {
  ANILIST_GENRES,
  ANIME_FORMATS,
  MANGA_FORMATS,
  getYearOptions,
} from "../../constants/anilistFilters";
import type { Media } from "../../types/anilist";
import MediaCard from "../../components/media/MediaCard";
import LayoutToggle, { type ViewMode } from "../../components/layout/LayoutToggle";
import PageHeader from "../../components/layout/PageHeader";

export default function Search() {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchType, setSearchType] = useState<"anime" | "manga">("anime");
  const [genre, setGenre] = useState("");
  const [format, setFormat] = useState("");
  const [seasonYear, setSeasonYear] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Media[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  const hasQuery = debouncedQuery.trim().length > 0;
  const hasFilters = Boolean(genre || format || seasonYear);
  const shouldFetch = hasQuery || hasFilters;

  const { results, isLoading } = useDiscoverMedia({
    mediaType: searchType === "anime" ? "ANIME" : "MANGA",
    search: hasQuery ? debouncedQuery : undefined,
    genre: genre || undefined,
    format: format || undefined,
    seasonYear,
    sort: hasQuery ? "SEARCH_MATCH" : "POPULARITY_DESC",
    page,
    perPage: 20,
    enabled: shouldFetch,
  });

  const { list: animeList } = useAnimeList(undefined, isAuthenticated && searchType === "anime");
  const { list: mangaList } = useMangaList(undefined, isAuthenticated && searchType === "manga");

  const statusByMediaId = useMemo(() => {
    if (!isAuthenticated) return new Map<number, string>();
    const map = new Map<number, string>();
    const source = searchType === "anime" ? animeList : mangaList;
    for (const entry of source) {
      if (entry.status) map.set(entry.mediaId, entry.status);
    }
    return map;
  }, [animeList, isAuthenticated, mangaList, searchType]);

  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [debouncedQuery, searchType, genre, format, seasonYear]);

  useEffect(() => {
    if (!shouldFetch) {
      setItems([]);
      return;
    }
    const incoming = results?.media;
    if (!incoming) return;
    setItems((prev) => {
      if (page === 1) return incoming;
      const seen = new Set(prev.map((m) => m.id));
      return [...prev, ...incoming.filter((m) => !seen.has(m.id))];
    });
  }, [results, page, shouldFetch]);

  const yearOptions = useMemo(() => getYearOptions(), []);
  const formatOptions = searchType === "anime" ? ANIME_FORMATS : MANGA_FORMATS;

  return (
    <div className="search-page">
      <PageHeader
        icon={<SearchIcon />}
        title="Search"
        subtitle="Search AniList for Manga or Anime"
        actions={
          <LayoutToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        }
      />

      <section className="search-toolbar">
        <div className="search-toolbar__main">
          <div className="search-input">
            <SearchIcon size={18} className="search-input__icon" />

            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${searchType}...`}
              className="search-input__field"
              autoFocus
            />

            {query && (
              <button
                type="button"
                className="search-input__clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="search-type">
            <button
              type="button"
              className={`search-type__button ${
                searchType === "anime" ? "search-type__button--active" : ""
              }`}
              onClick={() => {
                setSearchType("anime");
                setFormat("");
              }}
            >
              Anime
            </button>

            <button
              type="button"
              className={`search-type__button ${
                searchType === "manga" ? "search-type__button--active" : ""
              }`}
              onClick={() => {
                setSearchType("manga");
                setFormat("");
              }}
            >
              Manga
            </button>
          </div>
        </div>

        <div className="discovery-filters">
          <select
            className="form-select"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            aria-label="Filter by genre"
          >
            <option value="">All Genres</option>
            {ANILIST_GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            aria-label="Filter by format"
          >
            <option value="">All Formats</option>
            {formatOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            value={seasonYear ?? ""}
            onChange={(e) =>
              setSeasonYear(e.target.value ? Number(e.target.value) : undefined)
            }
            aria-label="Filter by year"
          >
            <option value="">All Years</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setGenre("");
                setFormat("");
                setSeasonYear(undefined);
              }}
            >
              Reset filters
            </button>
          )}
        </div>

        {shouldFetch && !isLoading && items.length > 0 && (
          <div className="search-toolbar__meta">
            <span>
              {items.length} {items.length === 1 ? "result" : "results"}
            </span>

            <span className="search-toolbar__separator">•</span>

            <span>{searchType === "anime" ? "Anime" : "Manga"}</span>
          </div>
        )}
      </section>

      {isLoading && items.length === 0 && (
        <div className="search-state">
          <Loader2 size={24} className="search-state__spinner" />

          <div>
            <strong>Searching AniList</strong>
            <span>
              Looking for {searchType}
              {hasQuery ? ` matching "${debouncedQuery}"` : ""}
            </span>
          </div>
        </div>
      )}

      {!isLoading && shouldFetch && items.length === 0 && (
        <div className="search-state search-state--empty">
          <div className="search-state__icon">
            <SearchIcon size={24} />
          </div>

          <div>
            <strong>No {searchType} found</strong>

            <span>
              Nothing matched your current search or filters.
            </span>
          </div>
        </div>
      )}

      {!isLoading && !shouldFetch && (
        <div className="search-state search-state--welcome">
          <div className="search-state__icon">
            <Compass size={26} />
          </div>

          <div>
            <strong>Discover something new</strong>

            <span>Search AniList or pick a genre, format, or year above.</span>
          </div>
        </div>
      )}

      {shouldFetch && items.length > 0 && (
        <section className="search-results">
          <div className={`media-layout-grid media-layout-grid--${viewMode}`}>
            {items.map((item) => (
              <MediaCard
                key={item.id}
                media={item}
                listStatus={statusByMediaId.get(item.id)}
                mediaType={searchType}
                viewMode={viewMode}
              />
            ))}
          </div>

          {results?.pageInfo?.hasNextPage && (
            <div className="discovery-pagination">
              <button
                type="button"
                className="button-secondary"
                disabled={isLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                {isLoading ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
