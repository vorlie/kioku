import { useAuth } from "../../hooks/useAuth";
import { useUserActivities } from "../../hooks/useAniList";
import { useViewer } from "../../hooks/useAniList";
import {
  Activity as ActivityIcon,
  Heart,
  MessageCircle,
  Play,
  BookOpen,
  User,
  Loader2,
} from "lucide-react";
import type {
  ActivityUnion,
  ListActivity,
  TextActivity,
  MessageActivity,
} from "../../types/anilist";
import { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/layout/PageHeader";

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = Date.now();

  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function formatStatus(status?: string): string {
  if (!status) return "";

  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatActivityAction(
  status: string | undefined,
  isManga: boolean,
): string {
  const medium = isManga ? "read" : "watch";
  const progressive = isManga ? "reading" : "watching";

  switch (status) {
    case "CURRENT":
      return `is ${progressive}`;

    case "COMPLETED":
      return `completed`;

    case "PLANNING":
      return `plans to ${medium}`;

    case "PAUSED":
      return `paused`;

    case "DROPPED":
      return `dropped`;

    case "REPEATING":
      return `is re${progressive}`;

    default:
      return "updated";
  }
}

export default function Activity() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isLoading: viewerLoading } = useViewer();
  const [currentPage, setCurrentPage] = useState(1);

  const {
    activities,
    isLoading: activitiesLoading,
    error,
    refetch,
  } = useUserActivities(currentPage, 20);

  if (authLoading || viewerLoading) {
    return (
      <div className="page-state page-state--fullscreen">
        <Loader2 className="page-state__spinner" size={32} />
        <p>Loading activity...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-state">
        <ActivityIcon size={40} className="page-state__icon" />
        <div className="page-state__title">Connect your AniList account</div>
        <div className="page-state__description">
          Sign in to see your AniList activity timeline.
        </div>
      </div>
    );
  }

  if (activitiesLoading && !activities) {
    return (
      <div className="page-state">
        <Loader2 className="page-state__spinner" size={28} />
        <p>Loading activity...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-state page-state--error">
        <ActivityIcon size={40} className="page-state__icon" />
        <div className="page-state__title">Unable to load activity</div>
        <div className="page-state__description">{error}</div>
        <button className="button-primary" onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  }

  const activityList = activities?.activities ?? [];

  return (
    <div className="activity-page">
      <PageHeader
        icon={<ActivityIcon size={20} />}
        title="Activity"
        subtitle="Your recent AniList activity"
      />

      {activityList.length === 0 ? (
        <div className="activity-empty">
          <div className="activity-empty__icon">
            <ActivityIcon size={28} />
          </div>

          <h2>No activity yet</h2>

          <p>Your recent AniList activity will appear here.</p>
        </div>
      ) : (
        <section className="activity-feed">
          {activityList.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              formatTimestamp={formatTimestamp}
            />
          ))}

          {activities?.pageInfo?.hasNextPage && (
            <div className="activity-feed__pagination">
              <button
                className="button-secondary"
                disabled={activitiesLoading}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                {activitiesLoading ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

interface ActivityCardProps {
  activity: ActivityUnion;
  formatTimestamp: (timestamp: number) => string;
}

function ActivityCard({ activity, formatTimestamp }: ActivityCardProps) {
  const displayUser =
    activity.type === "MESSAGE"
      ? (activity as MessageActivity).messenger
      : (activity as TextActivity | ListActivity).user;

  let content: React.ReactNode = null;

  if (activity.type === "ANIME_LIST" || activity.type === "MANGA_LIST") {
    content = <ListActivityContent activity={activity as ListActivity} />;
  } else if (activity.type === "TEXT") {
    content = <TextActivityContent activity={activity as TextActivity} />;
  } else if (activity.type === "MESSAGE") {
    content = <MessageActivityContent activity={activity as MessageActivity} />;
  }

  return (
    <article className="activity-card">
      <header className="activity-card__header">
        <div className="activity-card__user">
          {displayUser?.avatar?.large && (
            <img
              src={displayUser.avatar.large}
              alt=""
              className="activity-card__avatar"
            />
          )}

          <div className="activity-card__user-info">
            <span className="activity-card__username">
              {displayUser?.name ?? "Unknown"}
            </span>

            <span className="activity-card__timestamp">
              {formatTimestamp(activity.createdAt)}
            </span>
          </div>
        </div>
      </header>

      <div className="activity-card__content">{content}</div>

      <footer className="activity-card__footer">
        <div className="activity-card__actions">
          <button
            type="button"
            className={`activity-card__action ${
              activity.isLiked ? "activity-card__action--liked" : ""
            }`}
          >
            <Heart
              size={16}
              fill={activity.isLiked ? "currentColor" : "none"}
            />

            {activity.likeCount > 0 && <span>{activity.likeCount}</span>}
          </button>

          <button type="button" className="activity-card__action">
            <MessageCircle size={16} />

            {activity.replyCount > 0 && <span>{activity.replyCount}</span>}
          </button>
        </div>

        {activity.siteUrl && (
          <a
            href={activity.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="activity-card__link"
          >
            View on AniList
          </a>
        )}
      </footer>
    </article>
  );
}

function ListActivityContent({ activity }: { activity: ListActivity }) {
  const media = activity.media;

  if (!media) return null;

  const title =
    media.title.userPreferred ||
    media.title.english ||
    media.title.romaji ||
    "Unknown";

  const cover =
    media.coverImage.extraLarge ||
    media.coverImage.large ||
    media.coverImage.medium;

  const isManga = media.type === "MANGA";

  return (
    <Link
      to={`/${isManga ? "manga" : "anime"}/${media.id}`}
      className="activity-media"
    >
      {cover && <img src={cover} alt="" className="activity-media__cover" />}

      <div className="activity-media__body">
        <span className="activity-media__action">
          {isManga ? <BookOpen size={14} /> : <Play size={14} />}

          {formatActivityAction(activity.status, isManga)}
        </span>

        <h3 className="activity-media__title">{title}</h3>

        <div className="activity-media__meta">
          {activity.status && (
            <span className="activity-media__status">
              {formatStatus(activity.status)}
            </span>
          )}

          {activity.progress && <span>{activity.progress}</span>}
        </div>
      </div>
    </Link>
  );
}

function TextActivityContent({ activity }: { activity: TextActivity }) {
  return (
    <div className="activity-text-content">
      {activity.text && (
        <p className="activity-text-content__text">{activity.text}</p>
      )}
    </div>
  );
}

function MessageActivityContent({ activity }: { activity: MessageActivity }) {
  return (
    <div className="activity-message-content">
      <div className="activity-message-content__header">
        <User size={16} strokeWidth={2} />
        <span className="activity-message-content__users">
          {activity.messenger?.name || "Unknown"} →{" "}
          {activity.recipient?.name || "Unknown"}
        </span>
        {activity.isPrivate && (
          <span className="activity-message-content__private">Private</span>
        )}
      </div>
      {activity.message && (
        <p className="activity-message-content__text">{activity.message}</p>
      )}
    </div>
  );
}
