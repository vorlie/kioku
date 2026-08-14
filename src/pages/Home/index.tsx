import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useViewer, useAnimeList } from "../../hooks/useAniList";
import MediaCard from "../../components/media/MediaCard";
import { ViewMode } from "../../components/layout/LayoutToggle";
import LayoutToggle from "../../components/layout/LayoutToggle";
import { BookOpen, Film, LogIn, Loader2, Star, Tv } from "lucide-react";

export default function Home() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { viewer, isLoading: viewerLoading } = useViewer();
  const { list: watchingList, isLoading: watchingLoading } =
    useAnimeList("CURRENT");

  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  if (authLoading || viewerLoading) {
    return (
      <div className="page-state page-state--fullscreen">
        <Loader2 className="page-state__spinner" size={32} />
        <p>Syncing dashboard...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="home-welcome">
        <div className="home-welcome__icon">
          <Tv size={36} />
        </div>

        <div className="home-welcome__content">
          <span className="home-welcome__eyebrow">Kioku</span>

          <h1 className="home-welcome__title">
            Your AniList library, beautifully organized.
          </h1>

          <p className="home-welcome__description">
            Connect your AniList account to sync your anime and manga,
            track progress, explore favourites, and keep everything in one
            place.
          </p>

          <button
            onClick={() => {
              window.location.href = "/settings";
            }}
            className="button-primary home-welcome__button"
          >
            <LogIn size={17} />
            Connect AniList Account
          </button>
        </div>
      </div>
    );
  }

  const animeStats = viewer?.statistics?.anime;
  const mangaStats = viewer?.statistics?.manga;

  const totalAnime = animeStats?.count || 0;
  const totalManga = mangaStats?.count || 0;
  const episodesWatched = animeStats?.episodesWatched || 0;
  const chaptersRead = mangaStats?.chaptersRead || 0;

  const favouritesAnime = viewer?.favourites?.anime?.nodes || [];
  const favouritesManga = viewer?.favourites?.manga?.nodes || [];

  return (
    <div className="home-page">
      {/* Hero */}
      {viewer && (
        <section className="home-hero">
          {viewer.bannerImage && (
            <div
              className="home-hero__banner"
              style={{
                backgroundImage: `url(${viewer.bannerImage})`,
              }}
            />
          )}

          <div className="home-hero__overlay" />

          <div className="home-hero__content">
            {viewer.avatar?.large && (
              <img
                src={viewer.avatar.large}
                alt={viewer.name}
                className="home-hero__avatar"
              />
            )}

            <div className="home-hero__identity">
              <span className="home-hero__eyebrow">
                AniList Library
              </span>

              <h1 className="home-hero__title">
                Welcome back, {viewer.name}
              </h1>

              <p className="home-hero__subtitle">
                Here's what's happening in your library.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Quick stats */}
      <section className="home-stats">
        <div className="home-stat">
          <div className="home-stat__icon">
            <Film size={18} />
          </div>

          <div className="home-stat__content">
            <strong>{totalAnime}</strong>
            <span>Anime</span>
          </div>
        </div>

        <div className="home-stat">
          <div className="home-stat__icon">
            <BookOpen size={18} />
          </div>

          <div className="home-stat__content">
            <strong>{totalManga}</strong>
            <span>Manga</span>
          </div>
        </div>

        <div className="home-stat">
          <div className="home-stat__icon">
            <Tv size={18} />
          </div>

          <div className="home-stat__content">
            <strong>{episodesWatched}</strong>
            <span>Episodes watched</span>
          </div>
        </div>

        <div className="home-stat">
          <div className="home-stat__icon">
            <BookOpen size={18} />
          </div>

          <div className="home-stat__content">
            <strong>{chaptersRead}</strong>
            <span>Chapters read</span>
          </div>
        </div>
      </section>

      {/* Currently watching */}
      <section className="home-section">
        <div className="home-section__header">
          <div className="home-section__heading">
            <Tv size={19} className="home-section__icon accent" />

            <div>
              <h2 className="section__title">Currently Watching</h2>
              <span className="home-section__subtitle">
                Continue where you left off
              </span>
            </div>
          </div>

          <LayoutToggle
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>

        {watchingLoading ? (
          <div className="home-state">
            <Loader2 className="page-state__spinner" size={20} />
            <span>Loading your library...</span>
          </div>
        ) : watchingList && watchingList.length > 0 ? (
          <div
            className={`media-layout-grid media-layout-grid--${viewMode}`}
          >
            {watchingList.slice(0, 12).map((entry) => (
              <MediaCard
                key={entry.id}
                entry={entry}
                mediaType="anime"
                viewMode={viewMode}
              />
            ))}
          </div>
        ) : (
          <div className="home-empty">
            <Tv size={24} />
            <div>
              <strong>No active series</strong>
              <span>
                Start adding anime to your AniList library and they'll
                appear here.
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Favourite Anime */}
      {favouritesAnime.length > 0 && (
        <section className="home-section">
          <div className="home-section__header">
            <div className="home-section__heading">
              <Star size={19} className="home-section__icon accent" />

              <div>
                <h2 className="section__title">Favourite Anime</h2>
                <span className="home-section__subtitle">
                  Your favourite series
                </span>
              </div>
            </div>
          </div>

          <div
            className={`media-layout-grid media-layout-grid--${viewMode}`}
          >
            {favouritesAnime.map((media) => (
              <MediaCard
                key={media.id}
                media={media}
                mediaType="anime"
                viewMode={viewMode}
              />
            ))}
          </div>
        </section>
      )}

      {/* Favourite Manga */}
      {favouritesManga.length > 0 && (
        <section className="home-section">
          <div className="home-section__header">
            <div className="home-section__heading">
              <Star size={19} className="home-section__icon accent" />

              <div>
                <h2 className="section__title">Favourite Manga</h2>
                <span className="home-section__subtitle">
                  Your favourite manga
                </span>
              </div>
            </div>
          </div>

          <div
            className={`media-layout-grid media-layout-grid--${viewMode}`}
          >
            {favouritesManga.map((media) => (
              <MediaCard
                key={media.id}
                media={media}
                mediaType="manga"
                viewMode={viewMode}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}