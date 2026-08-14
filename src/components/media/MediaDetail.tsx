// components/media/MediaDetail.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Star,
} from "lucide-react";

import MediaRelations from "./MediaRelations";
import type { MediaRelationConnection } from "../../types/anilist";

export interface MediaDetailData {
  id: number;

  title: {
    userPreferred?: string;
    english?: string;
    romaji?: string;
  };

  coverImage: {
    extraLarge?: string;
    large?: string;
    medium?: string;
  };

  bannerImage?: string;
  description?: string;
  averageScore?: number;
  status?: string;
  format?: string;
  genres?: string[];

  studios?: {
    nodes?: {
      id: number;
      name: string;
    }[];
  };

  relations?: MediaRelationConnection;
}

interface MediaDetailProps<T extends MediaDetailData> {
  media: T | null | undefined;

  list?: {
    mediaId: number;
    status?: string;
    score?: number;
    progress?: number;
  }[];

  isLoading: boolean;
  error?: string | null;

  mediaType: "anime" | "manga";
  progressLabel: string;
  progressTotal?: number;

  meta: (string | number | false | null | undefined)[];

  updateEntry: (data: {
    mediaId: number;
    status?: string;
    score?: number;
    progress?: number;
  }) => Promise<void>;

  isUpdating: boolean;
  backRoute: string;
}

export default function MediaDetail<T extends MediaDetailData>({
  media,
  list,
  isLoading,
  error,
  mediaType,
  progressLabel,
  progressTotal,
  meta,
  updateEntry,
  isUpdating,
  backRoute,
}: MediaDetailProps<T>) {
  const navigate = useNavigate();

  const [listStatus, setListStatus] = useState("");
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [saved, setSaved] = useState(false);

  /*
   * Keep hooks unconditional.
   *
   * media can temporarily be null while AniList is loading,
   * so the effect itself handles that case.
   */
  useEffect(() => {
    if (!media) {
      setListStatus("");
      setScore(0);
      setProgress(0);
      setSaved(false);
      setIsExpanded(false);
      return;
    }

    const entry = list?.find(
      (item) => item.mediaId === media.id
    );

    setListStatus(entry?.status ?? "");
    setScore(entry?.score ?? 0);
    setProgress(entry?.progress ?? 0);
    setSaved(false);
    setIsExpanded(false);
  }, [list, media]);

  /*
   * ------------------------------------------------------------
   * Loading / error states
   * ------------------------------------------------------------
   */

  if (isLoading) {
    return (
      <div className="page-state page-state--fullscreen">
        Loading {mediaType} details...
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="empty-state">
        <div className="error-message section__title">
          {error ||
            `${mediaType === "anime" ? "Anime" : "Manga"} not found`}
        </div>

        <button
          className="button-primary"
          onClick={() => navigate(backRoute)}
        >
          Back to Library
        </button>
      </div>
    );
  }

  /*
   * From this point onward, TypeScript knows that media exists.
   */

  const title =
    media.title.userPreferred ||
    media.title.english ||
    media.title.romaji ||
    "Unknown Title";

  const cover =
    media.coverImage.extraLarge ||
    media.coverImage.large ||
    media.coverImage.medium;

  const cleanMeta = meta.filter(Boolean);

  const progressPercent =
    progressTotal && progressTotal > 0
      ? Math.min(100, (progress / progressTotal) * 100)
      : 0;

  /*
   * ------------------------------------------------------------
   * Actions
   * ------------------------------------------------------------
   */

  const incrementProgress = () => {
    if (!progressTotal || progress >= progressTotal) return;

    setProgress((value) => value + 1);
  };

  const decrementProgress = () => {
    setProgress((value) => Math.max(0, value - 1));
  };

  const save = async () => {
    await updateEntry({
      mediaId: media.id,
      status: listStatus || undefined,
      score: score || undefined,
      progress: progress || undefined,
    });

    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 1800);
  };

  /*
   * ------------------------------------------------------------
   * Render
   * ------------------------------------------------------------
   */

  return (
    <div className="media-detail">
      {/* --------------------------------------------------------
          Banner
      --------------------------------------------------------- */}

      {media.bannerImage && (
        <div className="media-detail__banner">
          <div
            className="media-detail__banner-image"
            style={{
              backgroundImage: `url(${media.bannerImage})`,
            }}
          />

          <div className="media-detail__banner-overlay" />
        </div>
      )}

      {/* --------------------------------------------------------
          Hero
      --------------------------------------------------------- */}

      <section className="media-detail__hero">
        {cover && (
          <div className="media-detail__cover-wrapper">
            <img
              src={cover}
              alt={title}
              className="media-detail__cover"
              loading="eager"
            />
          </div>
        )}

        <div className="media-detail__hero-content">
          <div className="media-detail__eyebrow">
            <BookOpen size={14} />

            <span>
              {mediaType === "anime" ? "Anime" : "Manga"}
            </span>

            {media.status && (
              <>
                <span className="media-detail__separator">•</span>
                <span>{media.status}</span>
              </>
            )}
          </div>

          <h1 className="media-detail__title">
            {title}
          </h1>

          <div className="media-detail__meta">
            {media.averageScore != null && (
              <span className="media-detail__score">
                <Star size={14} fill="currentColor" />
                {(media.averageScore / 10).toFixed(1)}
              </span>
            )}

            {cleanMeta.map((item, index) => (
              <span
                className="media-detail__meta-item"
                key={`${item}-${index}`}
              >
                {item}
              </span>
            ))}
          </div>

          {media.genres?.length > 0 && (
            <div className="media-detail__genres">
              {media.genres.map((genre) => (
                <span
                  className="media-detail__genre"
                  key={genre}
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {media.studios?.nodes?.length ? (
            <div className="media-detail__studios">
              <span>Studios</span>

              {media.studios.nodes.map((studio) => (
                <span key={studio.id}>
                  {studio.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* --------------------------------------------------------
          Main content
      --------------------------------------------------------- */}

      <div className="media-detail__content">
        <main className="media-detail__main">
          {/* Overview */}

          {media.description && (
            <section className="detail-panel">
              <div className="detail-panel__header">
                <h2>Overview</h2>
              </div>

              <div
                className={`detail-description ${
                  isExpanded
                    ? "detail-description--expanded"
                    : ""
                }`}
                dangerouslySetInnerHTML={{
                  __html: media.description,
                }}
              />

              <button
                className="detail-description__toggle"
                onClick={() =>
                  setIsExpanded((value) => !value)
                }
              >
                {isExpanded ? (
                  <>
                    Show less
                    <ChevronUp size={15} />
                  </>
                ) : (
                  <>
                    Read more
                    <ChevronDown size={15} />
                  </>
                )}
              </button>
            </section>
          )}

          {/* Relations */}

          <MediaRelations relations={media.relations} />
        </main>

        {/* ------------------------------------------------------
            Library / progress sidebar
        ------------------------------------------------------- */}

        <aside className="media-detail__sidebar">
          <section className="progress-panel">
            <div className="progress-panel__header">
              <div>
                <span className="progress-panel__eyebrow">
                  Your Library
                </span>

                <h2>My Progress</h2>
              </div>

              {saved && (
                <span className="progress-panel__saved">
                  <Check size={14} />
                  Saved
                </span>
              )}
            </div>

            {/* Progress */}

            {progressTotal && progressTotal > 0 ? (
              <>
                <div className="progress-panel__numbers">
                  <div>
                    <span>{progressLabel}</span>
                    <strong>{progress}</strong>
                    <small>/ {progressTotal}</small>
                  </div>

                  <b>{Math.round(progressPercent)}%</b>
                </div>

                <div className="progress-panel__track">
                  <div
                    className="progress-panel__bar"
                    style={{
                      width: `${progressPercent}%`,
                    }}
                  />
                </div>

                <div className="progress-panel__controls">
                  <button
                    className="progress-panel__step"
                    disabled={progress <= 0}
                    onClick={decrementProgress}
                    aria-label="Decrease progress"
                  >
                    <Minus size={15} />
                  </button>

                  <span>
                    {progress} / {progressTotal}
                  </span>

                  <button
                    className="progress-panel__step"
                    disabled={
                      progress >= progressTotal
                    }
                    onClick={incrementProgress}
                    aria-label="Increase progress"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </>
            ) : (
              <div className="progress-panel__no-progress">
                No progress information available.
              </div>
            )}

            {/* Library fields */}

            <div className="progress-panel__fields">
              <label className="detail-field">
                <span>Status</span>

                <select
                  value={listStatus}
                  onChange={(e) =>
                    setListStatus(e.target.value)
                  }
                >
                  <option value="">Select status</option>

                  <option value="CURRENT">
                    {mediaType === "anime"
                      ? "Watching"
                      : "Reading"}
                  </option>

                  <option value="COMPLETED">
                    Completed
                  </option>

                  <option value="PLANNING">
                    Planning
                  </option>

                  <option value="PAUSED">
                    Paused
                  </option>

                  <option value="DROPPED">
                    Dropped
                  </option>

                  <option value="REPEATING">
                    Repeating
                  </option>
                </select>
              </label>

              <label className="detail-field">
                <span>Score</span>

                <div className="detail-score-input">
                  <Star size={14} />

                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={score}
                    onChange={(e) =>
                      setScore(Number(e.target.value))
                    }
                  />
                </div>
              </label>
            </div>

            {/* Save */}

            <button
              className="progress-panel__save"
              disabled={isUpdating}
              onClick={save}
            >
              {isUpdating ? (
                "Saving..."
              ) : saved ? (
                <>
                  <Check size={16} />
                  Saved
                </>
              ) : (
                "Save Progress"
              )}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}