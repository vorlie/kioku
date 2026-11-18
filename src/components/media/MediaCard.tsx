import { useNavigate } from "react-router-dom";
import { Play, Plus, Star } from "lucide-react";
import { useUpdateEntry } from "../../hooks/useAniList";
import type { Media, MediaListEntry } from "../../types/anilist";

interface MediaCardProps {
  media?: Media;
  entry?: MediaListEntry;
  listStatus?: string;
  mediaType?: "anime" | "manga";
  viewMode?: "grid" | "compact";
}

export default function MediaCard({
  media,
  entry,
  listStatus,
  mediaType = "anime",
  viewMode = "grid",
}: MediaCardProps) {
  const navigate = useNavigate();
  const { updateEntry, isLoading: isUpdating } = useUpdateEntry();

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

  const status = entry?.status ?? listStatus;

  const score =
    typeof mediaData.averageScore === "number"
      ? (mediaData.averageScore / 10).toFixed(1)
      : null;

  const handleClick = () => {
    const id = entry?.mediaId ?? mediaData.id;
    navigate(`/${mediaType}/${id}`);
  };

  const handleWatchNow = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    navigate("/playback", {
      state: {
        query: title,
        mediaId: mediaData.id,
        mediaType,
        ...(mediaType === "anime" ? { episode: progress + 1 } : {}),
      },
    });
  };

  const canIncrement = Boolean(entry) && (!hasTotal || progress < (totalItems ?? 0));

  const handleQuickIncrement = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!entry || isUpdating || !canIncrement) return;
    await updateEntry({
      mediaId: entry.mediaId ?? mediaData.id,
      progress: progress + 1,
    });
  };

  return (
    <article className={`media-card media-card--${viewMode}`}>
      <button
        type="button"
        className="media-card__trigger"
        onClick={handleClick}
        aria-label={`View details for ${title}`}
      />

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

        {mediaType === "anime" && (
          <button
            type="button"
            className="media-card__watch-button"
            onClick={handleWatchNow}
            aria-label={`Watch ${title} now`}
            title={`Watch ${title} now`}
          >
            <Play size={12} fill="currentColor" aria-hidden="true" />
          </button>
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

          {(hasProgress || entry) && (
            <div className="media-card__progress">
              <div className="media-card__progress-label">
                <span>
                  {mediaType === "manga" ? "Ch." : "Ep."}{" "}
                  {progress}
                  {hasTotal && ` / ${totalItems}`}
                </span>

                <div className="media-card__progress-actions">
                  {hasTotal && (
                    <span>
                      {Math.round(progressPercent)}%
                    </span>
                  )}

                  {canIncrement && (
                    <button
                      type="button"
                      className="media-card__increment"
                      onClick={handleQuickIncrement}
                      disabled={isUpdating}
                      aria-label={`Increment ${title} progress`}
                      title={`+1 ${mediaType === "manga" ? "chapter" : "episode"}`}
                    >
                      <Plus size={11} aria-hidden="true" />1
                    </button>
                  )}
                </div>
              </div>

              {hasTotal && (
                <div className="media-card__progress-track">
                  <div
                    className="media-card__progress-bar"
                    style={{
                      width: `${progressPercent}%`,
                    }}
                  />
                </div>
              )}
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