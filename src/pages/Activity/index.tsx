import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { openExternalUrl } from "../../utils/safeUrl";
import RichContent from "../../components/ui/RichContent";
import {
  Activity as ActivityIcon,
  BookOpen,
  Heart,
  Loader2,
  LogIn,
  MessageCircle,
  Play,
  Send,
  Trash2,
  User,
} from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import {
  fetchActivityReplies,
  postActivityReply,
  postTextActivity,
  removeActivity,
  removeActivityReply,
  toggleActivityLike,
  useUserActivities,
  useViewer,
  type ActivityScope,
  type ActivityTypeFilter,
} from "../../hooks/useAniList";
import type {
  ActivityReply,
  ActivityUnion,
  ListActivity,
  MessageActivity,
  TextActivity,
} from "../../types/anilist";
import PageHeader from "../../components/layout/PageHeader";
import Tabs from "../../components/ui/Tabs";

const SCOPE_TABS: { id: ActivityScope; label: string }[] = [
  { id: "following", label: "Following" },
  { id: "global", label: "Global" },
  { id: "personal", label: "My Activity" },
];

const TYPE_FILTERS: { id: ActivityTypeFilter; label: string }[] = [
  { id: "all", label: "All Activity" },
  { id: "TEXT", label: "Statuses" },
  { id: "LIST", label: "List Updates" },
];

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
      return "completed";
    case "PLANNING":
      return `plans to ${medium}`;
    case "PAUSED":
      return "paused";
    case "DROPPED":
      return "dropped";
    case "REPEATING":
      return `is re${progressive}`;
    default:
      return "updated";
  }
}

export default function Activity() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { viewer } = useViewer();
  const [scope, setScope] = useState<ActivityScope>("following");
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [accumulated, setAccumulated] = useState<ActivityUnion[]>([]);
  const [statusDraft, setStatusDraft] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // If logged out, default to global feed unless user explicitly stays on a protected tab
  useEffect(() => {
    if (!authLoading && !isAuthenticated && scope !== "global") {
      setScope("global");
    }
  }, [authLoading, isAuthenticated]);

  const requiresAuth = scope !== "global";
  const queryEnabled = !requiresAuth || isAuthenticated;

  const {
    activities,
    isLoading: activitiesLoading,
    error,
    refetch,
  } = useUserActivities(currentPage, 20, scope, typeFilter, queryEnabled);

  useEffect(() => {
    setCurrentPage(1);
    setAccumulated([]);
  }, [scope, typeFilter]);

  useEffect(() => {
    const incoming = activities?.activities;
    if (!incoming) return;
    setAccumulated((prev) => {
      if (currentPage === 1) return incoming;
      const seen = new Set(prev.map((item) => item.id));
      return [...prev, ...incoming.filter((item) => !seen.has(item.id))];
    });
  }, [activities, currentPage]);

  const handlePostStatus = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = statusDraft.trim();
    if (!trimmed || isPosting) return;
    setIsPosting(true);
    setPostError(null);
    try {
      const created = await postTextActivity(trimmed);
      setStatusDraft("");
      setAccumulated((prev) => [created, ...prev]);
    } catch {
      setPostError("Failed to post status. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleLikeActivity = async (activityId: number) => {
    if (!isAuthenticated) return;
    setAccumulated((prev) =>
      prev.map((item) =>
        item.id === activityId
          ? {
              ...item,
              isLiked: !item.isLiked,
              likeCount: item.likeCount + (item.isLiked ? -1 : 1),
            }
          : item,
      ),
    );
    try {
      const updated = await toggleActivityLike(activityId, "ACTIVITY");
      setAccumulated((prev) =>
        prev.map((item) =>
          item.id === activityId
            ? { ...item, isLiked: updated.isLiked, likeCount: updated.likeCount }
            : item,
        ),
      );
    } catch {
      // Revert on failure
      setAccumulated((prev) =>
        prev.map((item) =>
          item.id === activityId
            ? {
                ...item,
                isLiked: !item.isLiked,
                likeCount: item.likeCount + (item.isLiked ? -1 : 1),
              }
            : item,
        ),
      );
    }
  };

  const handleDeleteActivity = async (activityId: number) => {
    try {
      const deleted = await removeActivity(activityId);
      if (deleted) {
        setAccumulated((prev) => prev.filter((item) => item.id !== activityId));
      }
    } catch {
      // Ignore transient error
    }
  };

  const handleReplyCountDelta = (activityId: number, delta: number) => {
    setAccumulated((prev) =>
      prev.map((item) =>
        item.id === activityId
          ? { ...item, replyCount: Math.max(0, item.replyCount + delta) }
          : item,
      ),
    );
  };

  return (
    <div className="activity-page">
      <PageHeader
        icon={<ActivityIcon size={20} />}
        title="Activity"
        subtitle="AniList social feed and status updates"
        actions={
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ActivityTypeFilter)}
            className="form-select"
            aria-label="Filter activity type"
          >
            {TYPE_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        }
      >
        <Tabs
          tabs={SCOPE_TABS}
          activeTab={scope}
          onTabChange={(id) => setScope(id as ActivityScope)}
        />
      </PageHeader>

      {isAuthenticated && (
        <form className="activity-composer" onSubmit={handlePostStatus}>
          <textarea
            className="activity-composer__input"
            rows={2}
            value={statusDraft}
            onChange={(e) => setStatusDraft(e.target.value)}
            placeholder="Write a status update..."
            aria-label="Write a status update"
          />
          {postError && (
            <div className="activity-composer__error" role="alert">
              {postError}
            </div>
          )}
          <div className="activity-composer__footer">
            <button
              type="submit"
              className="button-primary"
              disabled={isPosting || !statusDraft.trim()}
            >
              <Send size={15} aria-hidden="true" />
              {isPosting ? "Posting..." : "Post Status"}
            </button>
          </div>
        </form>
      )}

      {requiresAuth && !authLoading && !isAuthenticated ? (
        <div className="empty-state">
          <div className="empty-state__icon-box">
            <ActivityIcon size={24} aria-hidden="true" />
          </div>
          <h2 className="empty-state__title">Connect your AniList account</h2>
          <p className="empty-state__description">
            Sign in to view your Following and Personal feeds, or switch to the Global tab.
          </p>
          <Link to="/settings" className="button-primary" style={{ textDecoration: "none" }}>
            <LogIn size={16} aria-hidden="true" />
            Connect AniList Account
          </Link>
        </div>
      ) : activitiesLoading && accumulated.length === 0 ? (
        <div className="page-state">
          <Loader2 className="page-state__spinner" size={28} aria-hidden="true" />
          <p>Loading activity...</p>
        </div>
      ) : error && accumulated.length === 0 ? (
        <div className="page-state page-state--error">
          <ActivityIcon size={40} className="page-state__icon" />
          <div className="page-state__title">Unable to load activity</div>
          <div className="page-state__description">{error}</div>
          <button type="button" className="button-primary" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : accumulated.length === 0 ? (
        <div className="activity-empty">
          <div className="activity-empty__icon">
            <ActivityIcon size={28} />
          </div>
          <h2>No activity yet</h2>
          <p>Recent AniList activity for this feed will appear here.</p>
        </div>
      ) : (
        <section className="activity-feed">
          {accumulated.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              viewerId={viewer?.id}
              isAuthenticated={isAuthenticated}
              onLike={() => handleLikeActivity(activity.id)}
              onDelete={() => handleDeleteActivity(activity.id)}
              onReplyCountDelta={(delta) => handleReplyCountDelta(activity.id, delta)}
            />
          ))}

          {activities?.pageInfo?.hasNextPage && (
            <div className="activity-feed__pagination">
              <button
                type="button"
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
  viewerId?: number;
  isAuthenticated: boolean;
  onLike: () => void;
  onDelete: () => void;
  onReplyCountDelta: (delta: number) => void;
}

function ActivityCard({
  activity,
  viewerId,
  isAuthenticated,
  onLike,
  onDelete,
  onReplyCountDelta,
}: ActivityCardProps) {
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replies, setReplies] = useState<ActivityReply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const displayUser =
    activity.type === "MESSAGE"
      ? (activity as MessageActivity).messenger
      : (activity as TextActivity | ListActivity).user;

  const isOwner = Boolean(viewerId && displayUser?.id === viewerId);

  const toggleReplies = async () => {
    const nextOpen = !repliesOpen;
    setRepliesOpen(nextOpen);
    if (nextOpen && replies.length === 0 && activity.replyCount > 0) {
      setRepliesLoading(true);
      try {
        const fetched = await fetchActivityReplies(activity.id);
        setReplies(fetched);
      } finally {
        setRepliesLoading(false);
      }
    }
  };

  const handleSendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed || isSendingReply || !isAuthenticated) return;
    setIsSendingReply(true);
    try {
      const created = await postActivityReply(activity.id, trimmed);
      setReplies((prev) => [...prev, created]);
      setReplyText("");
      onReplyCountDelta(1);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleLikeReply = async (replyId: number) => {
    if (!isAuthenticated) return;
    setReplies((prev) =>
      prev.map((r) =>
        r.id === replyId
          ? { ...r, isLiked: !r.isLiked, likeCount: r.likeCount + (r.isLiked ? -1 : 1) }
          : r,
      ),
    );
    try {
      const updated = await toggleActivityLike(replyId, "ACTIVITY_REPLY");
      setReplies((prev) =>
        prev.map((r) =>
          r.id === replyId
            ? { ...r, isLiked: updated.isLiked, likeCount: updated.likeCount }
            : r,
        ),
      );
    } catch {
      // Revert on failure
      setReplies((prev) =>
        prev.map((r) =>
          r.id === replyId
            ? { ...r, isLiked: !r.isLiked, likeCount: r.likeCount + (r.isLiked ? -1 : 1) }
            : r,
        ),
      );
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    try {
      const deleted = await removeActivityReply(replyId);
      if (deleted) {
        setReplies((prev) => prev.filter((r) => r.id !== replyId));
        onReplyCountDelta(-1);
      }
    } catch {
      // Ignore transient error
    }
  };

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
        <button
          type="button"
          className="activity-card__user activity-card__user-btn"
          onClick={() =>
            displayUser?.name &&
            void openExternalUrl(`https://anilist.co/user/${encodeURIComponent(displayUser.name)}`)
          }
        >
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
        </button>

        {isOwner && (
          confirmDelete ? (
            <div className="activity-card__delete-confirm">
              <button
                type="button"
                className="activity-card__delete-confirm-btn"
                onClick={onDelete}
              >
                Delete
              </button>
              <button
                type="button"
                className="activity-card__more"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="activity-card__more"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete activity"
              title="Delete activity"
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          )
        )}
      </header>

      <div className="activity-card__content">{content}</div>

      <footer className="activity-card__footer">
        <div className="activity-card__actions">
          <button
            type="button"
            disabled={!isAuthenticated}
            onClick={onLike}
            className={`activity-card__action ${
              activity.isLiked ? "activity-card__action--liked" : ""
            }`}
            aria-pressed={activity.isLiked}
            aria-label={activity.isLiked ? "Unlike activity" : "Like activity"}
          >
            <Heart
              size={16}
              fill={activity.isLiked ? "currentColor" : "none"}
              aria-hidden="true"
            />

            {activity.likeCount > 0 && <span>{activity.likeCount}</span>}
          </button>

          <button
            type="button"
            onClick={() => void toggleReplies()}
            className={`activity-card__action ${
              repliesOpen ? "activity-card__action--active" : ""
            }`}
            aria-expanded={repliesOpen}
            aria-label="Toggle replies"
          >
            <MessageCircle size={16} aria-hidden="true" />

            {activity.replyCount > 0 && <span>{activity.replyCount}</span>}
          </button>
        </div>

        {activity.siteUrl && (
          <button
            type="button"
            onClick={() => void openExternalUrl(activity.siteUrl!)}
            className="activity-card__link"
          >
            View on AniList
          </button>
        )}
      </footer>

      {repliesOpen && (
        <div className="activity-replies">
          {repliesLoading ? (
            <div className="activity-replies__loading">
              <Loader2 size={16} className="page-state__spinner" aria-hidden="true" />
              <span>Loading replies...</span>
            </div>
          ) : replies.length === 0 ? (
            <p className="activity-replies__empty">No replies yet.</p>
          ) : (
            <div className="activity-replies__list">
              {replies.map((reply) => (
                <div className="activity-reply" key={reply.id}>
                  <div className="activity-reply__header">
                    <button
                      type="button"
                      className="activity-reply__user"
                      onClick={() =>
                        reply.user?.name &&
                        void openExternalUrl(`https://anilist.co/user/${encodeURIComponent(reply.user.name)}`)
                      }
                    >
                      {reply.user?.avatar?.medium && (
                        <img
                          src={reply.user.avatar.medium}
                          alt=""
                          className="activity-reply__avatar"
                        />
                      )}
                      <strong>{reply.user?.name ?? "Unknown"}</strong>
                    </button>
                    <span className="activity-card__timestamp">
                      {formatTimestamp(reply.createdAt)}
                    </span>
                  </div>

                  {reply.text && (
                    <RichContent content={reply.text} className="activity-reply__text" />
                  )}

                  <div className="activity-reply__actions">
                    <button
                      type="button"
                      disabled={!isAuthenticated}
                      onClick={() => void handleLikeReply(reply.id)}
                      className={`activity-card__action ${
                        reply.isLiked ? "activity-card__action--liked" : ""
                      }`}
                      aria-pressed={reply.isLiked}
                    >
                      <Heart
                        size={13}
                        fill={reply.isLiked ? "currentColor" : "none"}
                        aria-hidden="true"
                      />
                      {reply.likeCount > 0 && <span>{reply.likeCount}</span>}
                    </button>

                    {viewerId && reply.userId === viewerId && (
                      <button
                        type="button"
                        className="activity-card__action"
                        onClick={() => void handleDeleteReply(reply.id)}
                        aria-label="Delete reply"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isAuthenticated && (
            <form className="activity-reply-form" onSubmit={handleSendReply}>
              <input
                type="text"
                className="form-input"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                aria-label="Write a reply"
              />
              <button
                type="submit"
                className="button-secondary"
                disabled={isSendingReply || !replyText.trim()}
              >
                {isSendingReply ? "Sending..." : "Reply"}
              </button>
            </form>
          )}
        </div>
      )}
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
        <RichContent content={activity.text} className="activity-text-content__text" />
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
        <RichContent content={activity.message} className="activity-message-content__text" />
      )}
    </div>
  );
}
