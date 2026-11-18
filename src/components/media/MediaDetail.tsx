// components/media/MediaDetail.tsx

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Film,
  Frown,
  Heart,
  Loader2,
  Meh,
  Minus,
  Play,
  Plus,
  Smile,
  Star,
  Trash2,
} from "lucide-react";

import MediaRelations from "./MediaRelations";
import RichContent from "../ui/RichContent";
import { useAuth } from "../../hooks/useAuth";
import { useDeleteEntry, useToggleFavourite, useViewer } from "../../hooks/useAniList";
import type { FuzzyDate, Media, MediaListEntry, MediaRelationConnection } from "../../types/anilist";

import OpenInAniList from "../ui/OpenInAniList";

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
      isAnimationStudio?: boolean;
    }[];
  };

  relations?: MediaRelationConnection;
  isFavourite?: boolean;
  nextAiringEpisode?: Media["nextAiringEpisode"];
  characters?: Media["characters"];
  staff?: Media["staff"];
  recommendations?: Media["recommendations"];
}

function formatAiringCountdown(seconds: number): string {
  if (seconds <= 0) return "Airing now";
  const mins = Math.floor(seconds / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${Math.max(1, mins)}m`;
}

interface MediaDetailProps<T extends MediaDetailData> {
  media: T | null | undefined;

  list?: MediaListEntry[];

  isLoading: boolean;
  error?: string | null;

  mediaType: "anime" | "manga";
  progressLabel: string;
  progressTotal?: number;
  volumesTotal?: number;

  meta: (string | number | false | null | undefined)[];

  updateEntry: (data: {
    mediaId: number;
    status?: string;
    score?: number;
    progress?: number;
    progressVolumes?: number;
    repeat?: number;
    notes?: string;
    startedAt?: FuzzyDate;
    completedAt?: FuzzyDate;
  }) => Promise<void>;

  isUpdating: boolean;
  backRoute: string;
}

function fuzzyDateToInput(date?: FuzzyDate | null): string {
  if (!date?.year || !date?.month || !date?.day) return "";
  const y = String(date.year).padStart(4, "0");
  const m = String(date.month).padStart(2, "0");
  const d = String(date.day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function inputToFuzzyDate(value: string): FuzzyDate | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return { year: y, month: m, day: d };
}

export default function MediaDetail<T extends MediaDetailData>({
  media,
  list,
  isLoading,
  error,
  mediaType,
  progressLabel,
  progressTotal,
  volumesTotal,
  meta,
  updateEntry,
  isUpdating,
  backRoute,
}: MediaDetailProps<T>) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { viewer } = useViewer();
  const { deleteEntry, isLoading: isDeleting } = useDeleteEntry();
  const { toggleFavourite, isLoading: isTogglingFavourite } = useToggleFavourite();

  const [listStatus, setListStatus] = useState("");
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [progressVolumes, setProgressVolumes] = useState(0);
  const [repeat, setRepeat] = useState(0);
  const [startedAt, setStartedAt] = useState("");
  const [completedAt, setCompletedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);

  const scoreFormat = viewer?.mediaListOptions?.scoreFormat ?? "POINT_10_DECIMAL";

  useEffect(() => {
    if (!media) {
      setListStatus("");
      setScore(0);
      setProgress(0);
      setProgressVolumes(0);
      setRepeat(0);
      setStartedAt("");
      setCompletedAt("");
      setNotes("");
      setSaved(false);
      setSaveError(null);
      setConfirmDelete(false);
      setIsExpanded(false);
      return;
    }

    const entry = list?.find(
      (item) => item.mediaId === media.id
    );

    setListStatus(entry?.status ?? "");
    setScore(entry?.score ?? 0);
    setProgress(entry?.progress ?? 0);
    setProgressVolumes(entry?.progressVolumes ?? 0);
    setRepeat(entry?.repeat ?? 0);
    setStartedAt(fuzzyDateToInput(entry?.startedAt));
    setCompletedAt(fuzzyDateToInput(entry?.completedAt));
    setNotes(entry?.notes ?? "");
    setSaved(false);
    setSaveError(null);
    setConfirmDelete(false);
    setIsExpanded(false);
    setIsFavourite(Boolean(media.isFavourite));
  }, [list, media]);

  /*
   * ------------------------------------------------------------
   * Loading / error states
   * ------------------------------------------------------------
   */

  if (isLoading) {
    return (
      <div className="page-state page-state--fullscreen">
        <Loader2 className="page-state__spinner" size={28} aria-hidden="true" />
        <p>Loading {mediaType} details...</p>
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
    if (progressTotal && progress >= progressTotal) return;

    setProgress((value) => value + 1);
  };

  const decrementProgress = () => {
    setProgress((value) => Math.max(0, value - 1));
  };

  const save = async () => {
    setSaveError(null);
    setSaved(false);
    try {
      await updateEntry({
        mediaId: media.id,
        status: listStatus || undefined,
        score,
        progress,
        progressVolumes: mediaType === "manga" ? progressVolumes : undefined,
        repeat,
        notes: notes.trim() ? notes : undefined,
        startedAt: inputToFuzzyDate(startedAt),
        completedAt: inputToFuzzyDate(completedAt),
      });

      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 1800);
    } catch {
      setSaveError("Failed to save progress. Please try again.");
    }
  };

  const currentEntry = list?.find((item) => item.mediaId === media.id);

  const handleDelete = async () => {
    if (!currentEntry) return;
    setSaveError(null);
    try {
      await deleteEntry(currentEntry.id);
      setListStatus("");
      setScore(0);
      setProgress(0);
      setProgressVolumes(0);
      setRepeat(0);
      setStartedAt("");
      setCompletedAt("");
      setNotes("");
      setConfirmDelete(false);
    } catch {
      setSaveError("Failed to remove from library. Please try again.");
    }
  };

  const handleWatchNow = () => {
    navigate("/playback", {
      state: {
        query: title,
        autoplay: true,
        mediaId: media.id,
        mediaType,
        currentProgress: progress,
      },
    });
  };

  /*
   * ------------------------------------------------------------
   * Render
   * ------------------------------------------------------------
   */

  return (
    <div className="media-detail">
      <div className="media-detail__topbar">
        <button
          type="button"
          className="button-secondary media-detail__back-button"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </button>
      </div>

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
            {mediaType === "anime" ? <Film size={14} aria-hidden="true" /> : <BookOpen size={14} aria-hidden="true" />}

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
            {media.genres?.map((genre) => (
              <span className="media-detail__genre-tag" key={genre}>
                {genre}
              </span>
            ))}
          </div>

          {/*
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
          */}

          {media.studios?.nodes?.length ? (() => {
            const uniqueNodes = Array.from(
              new Map(media.studios.nodes.map((s) => [s.name, s])).values()
            );

            const animationStudios = uniqueNodes.filter((s) => s.isAnimationStudio);
            const producers = uniqueNodes.filter((s) => !s.isAnimationStudio);

            const hasSplit = animationStudios.length > 0;
            const studioList = hasSplit ? animationStudios : uniqueNodes;

            return (
              <div className="media-detail__studios-group">
                <div className="media-detail__studios">
                  <span className="media-detail__label">
                    {studioList.length > 1 ? "Studios:" : "Studio:"}
                  </span>{" "}
                  <span>{studioList.map((s) => s.name).join(", ")}</span>
                </div>

                {hasSplit && producers.length > 0 && (
                  <div className="media-detail__studios">
                    <span className="media-detail__label">
                      {producers.length > 1 ? "Producers:" : "Producer:"}
                    </span>{" "}
                    <span>{producers.map((s) => s.name).join(", ")}</span>
                  </div>
                )}
              </div>
            );
          })() : null}

          <div className="media-detail__actions">
            {mediaType === "anime" && (
              <button
                type="button"
                className="button-primary media-detail__action-button"
                onClick={handleWatchNow}
              >
                <Play size={16} aria-hidden="true" />
                Watch now
              </button>
            )}

            <OpenInAniList mediaId={media.id} mediaType={mediaType} />

            {isAuthenticated && (
              <button
                type="button"
                className={`button-secondary media-detail__fav-button ${isFavourite ? "media-detail__fav-button--active" : ""}`}
                disabled={isTogglingFavourite}
                aria-pressed={isFavourite}
                aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
                onClick={async () => {
                  try {
                    const next = await toggleFavourite(media.id, mediaType);
                    setIsFavourite(next);
                  } catch {
                    // Ignore transient failure
                  }
                }}
              >
                <Heart size={16} fill={isFavourite ? "currentColor" : "none"} aria-hidden="true" />
                {isFavourite ? "Favourited" : "Favourite"}
              </button>
            )}
          </div>

          {media.nextAiringEpisode && (
            <div className="media-detail__airing-badge">
              <Clock size={14} aria-hidden="true" />
              <span>
                Episode {media.nextAiringEpisode.episode} airing in{" "}
                {formatAiringCountdown(media.nextAiringEpisode.timeUntilAiring)}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* --------------------------------------------------------
          Main content
      --------------------------------------------------------- */}

      <div className="media-detail__content">
        <div className="media-detail__main">
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
              >
                <RichContent content={media.description} allowBasicHtml />
              </div>

              {media.description.length > 260 && (
                <button
                  type="button"
                  className="detail-description__toggle"
                  onClick={() =>
                    setIsExpanded((value) => !value)
                  }
                >
                  {isExpanded ? (
                    <>
                      Show less
                      <ChevronUp size={15} aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      Read more
                      <ChevronDown size={15} aria-hidden="true" />
                    </>
                  )}
                </button>
              )}
            </section>
          )}

          {/* Relations */}

          <MediaRelations relations={media.relations} />

          {/* Characters */}

          {media.characters?.edges && media.characters.edges.length > 0 && (
            <section className="detail-panel">
              <div className="detail-panel__header">
                <h2>Characters</h2>
              </div>

              <div className="detail-people-grid">
                {media.characters.edges.map((edge, idx) => {
                  const char = edge.node;
                  const va = edge.voiceActors?.[0];
                  if (!char) return null;

                  return (
                    <div className="detail-person-card" key={`${char.id}-${idx}`}>
                      <div className="detail-person-card__side">
                        {char.image?.medium || char.image?.large ? (
                          <img
                            src={char.image.medium || char.image.large}
                            alt={char.name?.full ?? "Character"}
                            className="detail-person-card__avatar"
                            loading="lazy"
                          />
                        ) : (
                          <div className="detail-person-card__avatar" />
                        )}
                        <div className="detail-person-card__info">
                          <span className="detail-person-card__name">
                            {char.name?.full ?? "Unknown"}
                          </span>
                          {edge.role && (
                            <span className="detail-person-card__role">
                              {edge.role.toLowerCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      {va && (
                        <div className="detail-person-card__side detail-person-card__side--right">
                          <div className="detail-person-card__info detail-person-card__info--right">
                            <span className="detail-person-card__name">
                              {va.name?.full ?? "Unknown"}
                            </span>
                            <span className="detail-person-card__role">Japanese</span>
                          </div>
                          {va.image?.medium || va.image?.large ? (
                            <img
                              src={va.image.medium || va.image.large}
                              alt={va.name?.full ?? "Voice actor"}
                              className="detail-person-card__avatar"
                              loading="lazy"
                            />
                          ) : (
                            <div className="detail-person-card__avatar" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Staff */}

          {media.staff?.edges && media.staff.edges.length > 0 && (
            <section className="detail-panel">
              <div className="detail-panel__header">
                <h2>Staff</h2>
              </div>

              <div className="detail-people-grid">
                {media.staff.edges.map((edge, idx) => {
                  const person = edge.node;
                  if (!person) return null;

                  return (
                    <div className="detail-person-card" key={`${person.id}-${idx}`}>
                      <div className="detail-person-card__side">
                        {person.image?.medium || person.image?.large ? (
                          <img
                            src={person.image.medium || person.image.large}
                            alt={person.name?.full ?? "Staff"}
                            className="detail-person-card__avatar"
                            loading="lazy"
                          />
                        ) : (
                          <div className="detail-person-card__avatar" />
                        )}
                        <div className="detail-person-card__info">
                          <span className="detail-person-card__name">
                            {person.name?.full ?? "Unknown"}
                          </span>
                          {edge.role && (
                            <span className="detail-person-card__role">
                              {edge.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Recommendations */}

          {media.recommendations?.nodes &&
            media.recommendations.nodes.some((n) => n.mediaRecommendation) && (
              <section className="detail-panel">
                <div className="detail-panel__header">
                  <h2>Recommendations</h2>
                </div>

                <div className="detail-recommendations-grid">
                  {media.recommendations.nodes.map((node) => {
                    const rec = node.mediaRecommendation;
                    if (!rec) return null;
                    const recTitle =
                      rec.title.userPreferred ||
                      rec.title.english ||
                      rec.title.romaji ||
                      "Unknown";
                    const recType = rec.type === "MANGA" ? "manga" : "anime";
                    const recCover = rec.coverImage.large || rec.coverImage.medium;

                    return (
                      <Link
                        key={rec.id}
                        to={`/${recType}/${rec.id}`}
                        className="detail-recommendation-card"
                      >
                        <div className="detail-recommendation-card__cover">
                          {recCover && (
                            <img src={recCover} alt={recTitle} loading="lazy" />
                          )}
                          {typeof rec.averageScore === "number" && (
                            <span className="detail-recommendation-card__score">
                              <Star size={11} fill="currentColor" aria-hidden="true" />
                              {(rec.averageScore / 10).toFixed(1)}
                            </span>
                          )}
                        </div>
                        <span className="detail-recommendation-card__title" title={recTitle}>
                          {recTitle}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
        </div>

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

            <div className="progress-panel__numbers">
              <div>
                <span>{progressLabel}</span>
                <strong>{progress}</strong>
                {progressTotal && progressTotal > 0 ? (
                  <small>/ {progressTotal}</small>
                ) : null}
              </div>

              {progressTotal && progressTotal > 0 ? (
                <b>{Math.round(progressPercent)}%</b>
              ) : null}
            </div>

            {progressTotal && progressTotal > 0 && (
              <div className="progress-panel__track">
                <div
                  className="progress-panel__bar"
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
            )}

            <div className="progress-panel__controls">
              <button
                type="button"
                className="progress-panel__step"
                disabled={progress <= 0}
                onClick={decrementProgress}
                aria-label="Decrease progress"
              >
                <Minus size={15} aria-hidden="true" />
              </button>

              <span>
                {progressTotal && progressTotal > 0
                  ? `${progress} / ${progressTotal}`
                  : `${progress} ${progressLabel.toLowerCase()}${progress === 1 ? "" : "s"}`}
              </span>

              <button
                type="button"
                className="progress-panel__step"
                disabled={Boolean(progressTotal && progressTotal > 0 && progress >= progressTotal)}
                onClick={incrementProgress}
                aria-label="Increase progress"
              >
                <Plus size={15} aria-hidden="true" />
              </button>
            </div>

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

              <div className="detail-field">
                <span>Score</span>

                {scoreFormat === "POINT_5" ? (
                  <div className="detail-score-stars" role="group" aria-label="Score out of 5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`detail-score-star ${score >= star ? "detail-score-star--active" : ""}`}
                        onClick={() => setScore(score === star ? 0 : star)}
                        aria-label={`${star} star${star > 1 ? "s" : ""}`}
                        aria-pressed={score >= star}
                      >
                        <Star size={15} fill={score >= star ? "currentColor" : "none"} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                ) : scoreFormat === "POINT_3" ? (
                  <div className="detail-score-smileys" role="group" aria-label="Score">
                    {[
                      { value: 1, label: "Disliked", icon: <Frown size={15} aria-hidden="true" /> },
                      { value: 2, label: "Neutral", icon: <Meh size={15} aria-hidden="true" /> },
                      { value: 3, label: "Liked", icon: <Smile size={15} aria-hidden="true" /> },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`detail-score-smiley ${score === opt.value ? "detail-score-smiley--active" : ""}`}
                        onClick={() => setScore(score === opt.value ? 0 : opt.value)}
                        aria-label={opt.label}
                        aria-pressed={score === opt.value}
                        title={opt.label}
                      >
                        {opt.icon}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="detail-score-input">
                    <Star size={14} aria-hidden="true" />

                    <input
                      type="number"
                      aria-label="Score"
                      min="0"
                      max={scoreFormat === "POINT_100" ? 100 : 10}
                      step={scoreFormat === "POINT_10_DECIMAL" ? "0.1" : "1"}
                      value={score}
                      onChange={(e) =>
                        setScore(Number(e.target.value))
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            {mediaType === "manga" && (
              <div className="progress-panel__inline-row">
                <span className="progress-panel__inline-label">Volumes</span>
                <div className="progress-panel__inline-stepper">
                  <button
                    type="button"
                    className="progress-panel__step"
                    disabled={progressVolumes <= 0}
                    onClick={() => setProgressVolumes((v) => Math.max(0, v - 1))}
                    aria-label="Decrease volumes"
                  >
                    <Minus size={14} aria-hidden="true" />
                  </button>
                  <span>
                    {progressVolumes}
                    {volumesTotal && volumesTotal > 0 ? ` / ${volumesTotal}` : ""}
                  </span>
                  <button
                    type="button"
                    className="progress-panel__step"
                    disabled={Boolean(volumesTotal && volumesTotal > 0 && progressVolumes >= volumesTotal)}
                    onClick={() => setProgressVolumes((v) => v + 1)}
                    aria-label="Increase volumes"
                  >
                    <Plus size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              className="progress-panel__advanced-toggle"
              onClick={() => setShowAdvancedFields((v) => !v)}
              aria-expanded={showAdvancedFields}
            >
              <span>Dates, {mediaType === "manga" ? "Rereads" : "Rewatches"} & Notes</span>
              {showAdvancedFields ? (
                <ChevronUp size={15} aria-hidden="true" />
              ) : (
                <ChevronDown size={15} aria-hidden="true" />
              )}
            </button>

            {showAdvancedFields && (
              <div className="progress-panel__advanced">
                <div className="progress-panel__inline-row">
                  <span className="progress-panel__inline-label">
                    {mediaType === "manga" ? "Rereads" : "Rewatches"}
                  </span>
                  <div className="progress-panel__inline-stepper">
                    <button
                      type="button"
                      className="progress-panel__step"
                      disabled={repeat <= 0}
                      onClick={() => setRepeat((v) => Math.max(0, v - 1))}
                      aria-label="Decrease repeat count"
                    >
                      <Minus size={14} aria-hidden="true" />
                    </button>
                    <span>{repeat}</span>
                    <button
                      type="button"
                      className="progress-panel__step"
                      onClick={() => setRepeat((v) => v + 1)}
                      aria-label="Increase repeat count"
                    >
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="progress-panel__fields">
                  <label className="detail-field">
                    <span>Start Date</span>
                    <input
                      type="date"
                      className="detail-date-input"
                      value={startedAt}
                      onChange={(e) => setStartedAt(e.target.value)}
                    />
                  </label>

                  <label className="detail-field">
                    <span>Finish Date</span>
                    <input
                      type="date"
                      className="detail-date-input"
                      value={completedAt}
                      onChange={(e) => setCompletedAt(e.target.value)}
                    />
                  </label>
                </div>

                <label className="detail-field">
                  <span>Notes</span>
                  <textarea
                    rows={3}
                    className="detail-notes-input"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Personal notes..."
                  />
                </label>
              </div>
            )}

            {saveError && (
              <div className="progress-panel__error" role="alert">
                {saveError}
              </div>
            )}

            {/* Save */}

            <button
              type="button"
              className="progress-panel__save"
              disabled={isUpdating || isDeleting}
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

            {currentEntry && (
              confirmDelete ? (
                <div className="progress-panel__delete-confirm">
                  <span>Remove from library?</span>
                  <div className="progress-panel__delete-actions">
                    <button
                      type="button"
                      className="button-secondary"
                      disabled={isDeleting}
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="progress-panel__delete-btn"
                      disabled={isDeleting}
                      onClick={handleDelete}
                    >
                      {isDeleting ? "Removing..." : "Confirm Remove"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="progress-panel__remove"
                  disabled={isUpdating || isDeleting}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  Remove from Library
                </button>
              )
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}