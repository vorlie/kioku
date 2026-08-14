import { useState } from "react";
import { Compass, Loader2, Search as SearchIcon } from "lucide-react";

import { useSearchAnime, useSearchManga } from "../../hooks/useAniList";

import MediaCard from "../../components/media/MediaCard";
import LayoutToggle, { ViewMode } from "../../components/layout/LayoutToggle";
import PageHeader from "../../components/layout/PageHeader";

export default function Search() {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchType, setSearchType] = useState<"anime" | "manga">("anime");

  const { results: animeResults, isLoading: animeLoading } =
    useSearchAnime(query);

  const { results: mangaResults, isLoading: mangaLoading } =
    useSearchManga(query);

  const results = searchType === "anime" ? animeResults : mangaResults;

  const isLoading = searchType === "anime" ? animeLoading : mangaLoading;

  const media = results?.media ?? [];
  const hasQuery = query.trim().length > 0;

  return (
    <div className="search-page">
      {/* --------------------------------------------------------
          Page Header
      --------------------------------------------------------- */}

      <PageHeader
        icon={<SearchIcon/>}
        title="Search"
        subtitle="Search AniList for Manga or Anime"
        actions={
          <LayoutToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        }
      />

      {/* --------------------------------------------------------
          Search Toolbar
      --------------------------------------------------------- */}

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
              onClick={() => setSearchType("anime")}
            >
              Anime
            </button>

            <button
              type="button"
              className={`search-type__button ${
                searchType === "manga" ? "search-type__button--active" : ""
              }`}
              onClick={() => setSearchType("manga")}
            >
              Manga
            </button>
          </div>
        </div>

        {hasQuery && !isLoading && media.length > 0 && (
          <div className="search-toolbar__meta">
            <span>
              {media.length} {media.length === 1 ? "result" : "results"}
            </span>

            <span className="search-toolbar__separator">•</span>

            <span>{searchType === "anime" ? "Anime" : "Manga"}</span>
          </div>
        )}
      </section>

      {/* --------------------------------------------------------
          Loading
      --------------------------------------------------------- */}

      {isLoading && (
        <div className="search-state">
          <Loader2 size={24} className="search-state__spinner" />

          <div>
            <strong>Searching AniList</strong>
            <span>
              Looking for {searchType} matching "{query}"
            </span>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------
          No results
      --------------------------------------------------------- */}

      {!isLoading && hasQuery && media.length === 0 && (
        <div className="search-state search-state--empty">
          <div className="search-state__icon">
            <SearchIcon size={24} />
          </div>

          <div>
            <strong>No {searchType} found</strong>

            <span>
              Nothing matched "{query}". Try another title or search term.
            </span>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------
          Initial state
      --------------------------------------------------------- */}

      {!isLoading && !hasQuery && (
        <div className="search-state search-state--welcome">
          <div className="search-state__icon">
            <Compass size={26} />
          </div>

          <div>
            <strong>Discover something new</strong>

            <span>Search AniList for anime and manga.</span>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------
          Results
      --------------------------------------------------------- */}

      {!isLoading && hasQuery && media.length > 0 && (
        <section className="search-results">
          <div className={`media-layout-grid media-layout-grid--${viewMode}`}>
            {media.map((item) => (
              <MediaCard
                key={item.id}
                media={item}
                mediaType={searchType}
                viewMode={viewMode}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
