import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Compass, Loader2, Search as SearchIcon, X } from "lucide-react";

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
  getCurrentSeason,
  getYearOptions,
} from "../../constants/anilistFilters";
import type { Media } from "../../types/anilist";
import MediaCard from "../../components/media/MediaCard";
import Tabs from "../../components/ui/Tabs";
import LayoutToggle, { type ViewMode } from "../../components/layout/LayoutToggle";
import PageHeader from "../../components/layout/PageHeader";

type BrowseTab = "trending" | "popular" | "top-rated" | "season" | "upcoming";

export default function Browse() {
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated } = useAuth();
  const [mediaType, setMediaType] = useState<"ANIME" | "MANGA">("ANIME");
  const [activeTab, setActiveTab] = useState<BrowseTab>("trending");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [format, setFormat] = useState("");
  const [seasonYear, setSeasonYear] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Media[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const focusInput = () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };

    if (
      typeof location.state === "object" &&
      location.state !== null &&
      "focusSearch" in location.state
    ) {
      focusInput();
    }

    window.addEventListener("kioku:focus-discover-search", focusInput);
    return () => window.removeEventListener("kioku:focus-discover-search", focusInput);
  }, [location.state]);

  const currentSeason = useMemo(() => getCurrentSeason(), []);
  const yearOptions = useMemo(() => getYearOptions(), []);

  const browseTabs = useMemo(() => {
    const base: { id: BrowseTab; label: string }[] = [
      { id: "trending", label: "Trending" },
      { id: "popular", label: "Popular" },
      { id: "top-rated", label: "Top Rated" },
    ];
    if (mediaType === "ANIME") {
      base.push({ id: "season", label: "This Season" });
    }
    base.push({ id: "upcoming", label: "Upcoming" });
    return base;
  }, [mediaType]);

  const hasSearch = debouncedQuery.trim().length > 0;

  const sort = useMemo(() => {
    if (hasSearch) return "SEARCH_MATCH";
    switch (activeTab) {
      case "popular":
      case "season":
      case "upcoming":
        return "POPULARITY_DESC";
      case "top-rated":
        return "SCORE_DESC";
      case "trending":
      default:
        return "TRENDING_DESC";
    }
  }, [activeTab, hasSearch]);

  const status = !hasSearch && activeTab === "upcoming" ? "NOT_YET_RELEASED" : undefined;
  const season =
    !hasSearch && activeTab === "season" && mediaType === "ANIME"
      ? currentSeason.season
      : undefined;
  const effectiveYear =
    !hasSearch && activeTab === "season" && mediaType === "ANIME"
      ? currentSeason.year
      : seasonYear;

  const { results, isLoading, error } = useDiscoverMedia({
    mediaType,
    search: hasSearch ? debouncedQuery : undefined,
    genre: genre || undefined,
    format: format || undefined,
    seasonYear: effectiveYear,
    season,
    status,
    sort,
    page,
    perPage: 20,
  });

  const { list: animeList } = useAnimeList(undefined, isAuthenticated && mediaType === "ANIME");
  const { list: mangaList } = useMangaList(undefined, isAuthenticated && mediaType === "MANGA");

  const statusByMediaId = useMemo(() => {
    if (!isAuthenticated) return new Map<number, string>();
    const map = new Map<number, string>();
    const source = mediaType === "ANIME" ? animeList : mangaList;
    for (const entry of source) {
      if (entry.status) map.set(entry.mediaId, entry.status);
    }
    return map;
  }, [animeList, isAuthenticated, mangaList, mediaType]);

  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [mediaType, activeTab, debouncedQuery, genre, format, seasonYear]);

  useEffect(() => {
    const incoming = results?.media;
    if (!incoming) return;
    setItems((prev) => {
      if (page === 1) return incoming;
      const seen = new Set(prev.map((m) => m.id));
      return [...prev, ...incoming.filter((m) => !seen.has(m.id))];
    });
  }, [results, page]);

  const handleMediaTypeChange = (next: "ANIME" | "MANGA") => {
    setMediaType(next);
    setFormat("");
    if (next === "MANGA" && activeTab === "season") {
      setActiveTab("trending");
    }
  };

  const formatOptions = mediaType === "ANIME" ? ANIME_FORMATS : MANGA_FORMATS;
  const hasFilters = Boolean(genre || format || seasonYear);

  return (
    <div className="browse-page">
      <PageHeader
        icon={<Compass size={20} />}
        title="Discover"
        subtitle={`Search and browse ${mediaType === "ANIME" ? "anime" : "manga"} on AniList`}
        actions={
          <div className="library-actions">
            <div className="search-type">
              <button
                type="button"
                className={`search-type__button ${
                  mediaType === "ANIME" ? "search-type__button--active" : ""
                }`}
                onClick={() => handleMediaTypeChange("ANIME")}
              >
                Anime
              </button>
              <button
                type="button"
                className={`search-type__button ${
                  mediaType === "MANGA" ? "search-type__button--active" : ""
                }`}
                onClick={() => handleMediaTypeChange("MANGA")}
              >
                Manga
              </button>
            </div>

            <LayoutToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
        }
      >
        {!hasSearch && (
          <Tabs
            tabs={browseTabs}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as BrowseTab)}
          />
        )}
      </PageHeader>

      <section className="search-toolbar">
        <div className="search-toolbar__main">
          <div className="search-input">
            <SearchIcon size={18} className="search-input__icon" aria-hidden="true" />

            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${mediaType === "ANIME" ? "anime" : "manga"}... (Ctrl+K)`}
              className="search-input__field"
              aria-label={`Search ${mediaType === "ANIME" ? "anime" : "manga"}`}
            />

            {query && (
              <button
                type="button"
                className="search-input__clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
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

          {(hasSearch || activeTab !== "season") && (
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
          )}

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

        {hasSearch && !isLoading && items.length > 0 && (
          <div className="search-toolbar__meta">
            <span>
              {items.length} {items.length === 1 ? "result" : "results"} for &ldquo;{debouncedQuery.trim()}&rdquo;
            </span>
          </div>
        )}
      </section>

      {isLoading && items.length === 0 ? (
        <div className="page-state">
          <Loader2 className="page-state__spinner" size={28} aria-hidden="true" />
          <p className="page-state__description">
            {hasSearch
              ? `Searching for "${debouncedQuery.trim()}"...`
              : `Loading ${mediaType.toLowerCase()}...`}
          </p>
        </div>
      ) : error && items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon-box">
            <Compass size={24} aria-hidden="true" />
          </div>
          <h2 className="empty-state__title">Unable to load titles</h2>
          <p className="empty-state__description">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon-box">
            <SearchIcon size={24} aria-hidden="true" />
          </div>
          <h2 className="empty-state__title">No titles found</h2>
          <p className="empty-state__description">
            Try a different search term or reset your filters.
          </p>
        </div>
      ) : (
        <>
          <div className={`media-layout-grid media-layout-grid--${viewMode}`}>
            {items.map((media) => (
              <MediaCard
                key={media.id}
                media={media}
                listStatus={statusByMediaId.get(media.id)}
                mediaType={mediaType === "ANIME" ? "anime" : "manga"}
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
        </>
      )}
    </div>
  );
}
