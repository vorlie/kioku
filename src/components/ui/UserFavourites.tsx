import type { Viewer } from "../../types/anilist";
import { Star } from "lucide-react";
import MediaCard from "../media/MediaCard"; 
import type { ViewMode } from "../layout/LayoutToggle";

interface UserFavouritesProps {
  viewer: Viewer;
  viewMode: ViewMode;
}

export default function UserFavourites({ viewer, viewMode }: UserFavouritesProps) {
  const favAnime = viewer?.favourites?.anime?.nodes || [];
  const favManga = viewer?.favourites?.manga?.nodes || [];

  if (favAnime.length === 0 && favManga.length === 0) return null;

  return (
    <>
      {favAnime.length > 0 && (
        <section className="dashboard-section">
          <div className="dashboard-section__header">          
            <Star size={20} className="dashboard-section__icon accent" />
            <h2 className="section__title">Favourite Anime</h2>
          </div>
          <div className={`media-layout-grid media-layout-grid--${viewMode}`}>
            {favAnime.map((media) => (
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

      {favManga.length > 0 && (
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <Star size={20} className="dashboard-section__icon" />
            <h2 className="section__title">Favourite Manga</h2>
          </div>
          <div className={`media-layout-grid media-layout-grid--${viewMode}`}>
            {favManga.map((media) => (
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
    </>
  );
}