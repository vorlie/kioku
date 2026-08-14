import { useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import type { Media, MediaListEntry } from "../../types/anilist";

interface MediaCardProps {
  media?: Media;
  entry?: MediaListEntry;
  mediaType?: "anime" | "manga";
  viewMode?: "grid" | "compact";
}

export default function MediaCard({
  media,
  entry,
  mediaType = "anime",
  viewMode = "grid",
}: MediaCardProps) {
  const navigate = useNavigate();

  const mediaData = media || entry?.media;

  if (!mediaData) return null;

  const title =
    mediaData.title.userPreferred ||
    mediaData.title.english ||
    mediaData.title.romaji ||
    mediaData.title.native ||
    "Unknown Title";

  const coverImage =
    mediaData.coverImage.extraLarge ||
    mediaData.coverImage.large ||
    mediaData.coverImage.medium ||
    "";

  const progress = entry?.progress ?? 0;

  const totalItems =
    mediaType === "manga"
      ? mediaData.chapters
      : mediaData.episodes;

  const hasProgress = progress > 0;
  const hasTotal = typeof totalItems === "number" && totalItems > 0;

  const progressPercent = hasTotal
    ? Math.min((progress / totalItems!) * 100, 100)
    : 0;

  const status = entry?.status;

  const score =
    typeof mediaData.averageScore === "number"
      ? (mediaData.averageScore / 10).toFixed(1)
      : null;

  const handleClick = () => {
    const id = entry?.mediaId ?? mediaData.id;
    navigate(`/${mediaType}/${id}`);
  };

  return (
    <article
      className={`media-card media-card--${viewMode}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="media-card__cover">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="media-card__image"
            loading="lazy"
          />
        ) : (
          <div className="media-card__missing-cover">
            No cover
          </div>
        )}

        {viewMode === "grid" && status && (
          <span className="media-card__status">
            {status}
          </span>
        )}

        {score && (
          <span className="media-card__score">
            <Star size={12} fill="currentColor" />
            {score}
          </span>
        )}
      </div>

      <div className="media-card__body">
        <div className="media-card__main-info">
          <h3
            className="media-card__title"
            title={title}
          >
            {title}
          </h3>

          {hasProgress && (
            <div className="media-card__progress">
              <div className="media-card__progress-label">
                <span>
                  {mediaType === "manga" ? "Ch." : "Ep."}{" "}
                  {progress}
                  {hasTotal && ` / ${totalItems}`}
                </span>

                {hasTotal && (
                  <span>
                    {Math.round(progressPercent)}%
                  </span>
                )}
              </div>

              <div className="media-card__progress-track">
                <div
                  className="media-card__progress-bar"
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {viewMode === "compact" && status && (
          <span className="media-card__compact-status">
            {status}
          </span>
        )}
      </div>
    </article>
  );
}