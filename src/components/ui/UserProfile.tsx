import type { Viewer } from "../../types/anilist";
import LayoutToggle, { ViewMode } from "../layout/LayoutToggle";

interface UserProfileProps {
  viewer: Viewer;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function UserProfile({ viewer, viewMode, onViewModeChange }: UserProfileProps) {
  const avatar = viewer.avatar?.large || viewer.avatar?.medium;
  const banner = viewer.bannerImage;
  
  const animeStats = viewer.statistics?.anime;
  const mangaStats = viewer.statistics?.manga;

  const totalAnime = animeStats?.count || 0;
  const totalManga = mangaStats?.count || 0;
  const episodesWatched = animeStats?.episodesWatched || 0;
  const chaptersRead = mangaStats?.chaptersRead || 0;

  return (
    <div className={`user-profile ${!banner ? "user-profile--without-banner" : ""}`}>
      {banner && (
        <div className="user-profile__banner">
          <div className="user-profile__banner__image" style={{ backgroundImage: `url(${banner})` }} />
        </div>
      )}

      <div className="user-profile__content">
        {avatar && (
          <img
            src={avatar}
            alt={viewer.name}
            className="user-profile__avatar"
          />
        )}
        <div className="user-profile__info">
          <h1 className="user-profile__name">
            Welcome back, {viewer.name}!
          </h1>
          <p className="user-profile__stats">
            {totalAnime} anime • {totalManga} manga • {episodesWatched} episodes watched • {chaptersRead} chapters read
          </p>
        </div>
        
        <LayoutToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>
    </div>
  );
}