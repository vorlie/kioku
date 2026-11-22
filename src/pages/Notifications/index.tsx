import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  BellOff,
  CheckCheck,
  ExternalLink,
  Film,
  Layers,
  Loader2,
  LogIn,
  MessageSquare,
  Play,
  RefreshCw,
  Sparkles,
  Tv,
  UserPlus,
} from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import LoginModal from "../../components/ui/LoginModal";
import RichContent from "../../components/ui/RichContent";
import Tabs from "../../components/ui/Tabs";
import { useNotificationsContext } from "../../context/NotificationContext";
import { clearAniListCache, fetchNotifications } from "../../hooks/useAniList";
import { useAuth } from "../../hooks/useAuth";
import type {
  DesktopNotificationCategory,
  NotificationCategory,
  NotificationItem,
} from "../../types/anilist";
import {
  formatNotificationTypeEnumLabel,
  formatRelativeNotificationTime,
  formatSubmissionHeadline,
  getAiringContextParts,
  getMediaPreferredTitle,
  getNotificationCategory,
  getNotificationExternalUrl,
  getNotificationTypesForCategory,
  getPersonPreferredName,
  groupNotificationsByDate,
  mergeNotificationsById,
} from "../../utils/notifications";
import { openExternalUrl, sanitizeImageUrl } from "../../utils/safeUrl";

const PAGE_SIZE = 25;

const CATEGORY_TABS: { id: NotificationCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "airing", label: "Airing" },
  { id: "activity", label: "Activity" },
  { id: "follows", label: "Follows" },
  { id: "forum", label: "Forum" },
  { id: "media", label: "Media" },
];

const CATEGORY_BADGE_LABELS: Record<DesktopNotificationCategory, string> = {
  airing: "Airing",
  activity: "Activity",
  follows: "Follows",
  forum: "Forum",
  media: "Media",
};

const EMPTY_COPY_BY_CATEGORY: Record<
  NotificationCategory,
  { title: string; description: string }
> = {
  all: {
    title: "You're all caught up",
    description:
      "Airing episodes, replies, follows, forum discussions, and library updates will show up here.",
  },
  airing: {
    title: "No airing notifications yet",
    description:
      "When an anime on your Watching list airs a new episode, it will appear here with a quick watch button.",
  },
  activity: {
    title: "No activity notifications",
    description:
      "Direct messages, activity replies, mentions, and likes from AniList will appear here.",
  },
  follows: {
    title: "No follower notifications",
    description: "New followers on AniList will appear here.",
  },
  forum: {
    title: "No forum notifications",
    description:
      "Forum thread replies, mentions, and likes will appear here.",
  },
  media: {
    title: "No media or submission updates",
    description:
      "Related media additions, database changes, merges, and submission statuses will appear here.",
  },
};

function CategoryIcon({
  category,
  size = 14,
}: {
  category: DesktopNotificationCategory;
  size?: number;
}) {
  switch (category) {
    case "airing":
      return <Tv size={size} aria-hidden="true" />;
    case "activity":
      return <Sparkles size={size} aria-hidden="true" />;
    case "follows":
      return <UserPlus size={size} aria-hidden="true" />;
    case "forum":
      return <MessageSquare size={size} aria-hidden="true" />;
    case "media":
      return <Layers size={size} aria-hidden="true" />;
  }
}

function getMediaPath(mediaType?: string): "anime" | "manga" {
  return mediaType?.toUpperCase() === "MANGA" ? "manga" : "anime";
}

function NotificationVisual({
  item,
  category,
}: {
  item: NotificationItem;
  category: DesktopNotificationCategory;
}) {
  const mediaCover = sanitizeImageUrl(
    item.media?.coverImage?.large || item.media?.coverImage?.medium || "",
  );
  if (item.media && mediaCover) {
    return (
      <Link
        to={`/${getMediaPath(item.media.type)}/${item.media.id}`}
        className="notification-card__media-thumb"
        aria-label={getMediaPreferredTitle(item.media)}
      >
        <img src={mediaCover} alt="" loading="lazy" />
      </Link>
    );
  }

  const avatarUrl = sanitizeImageUrl(
    item.user?.avatar?.medium || item.user?.avatar?.large || "",
  );
  if (item.user && avatarUrl) {
    return (
      <div className="notification-card__avatar-wrap">
        <img
          src={avatarUrl}
          alt={item.user.name}
          className="notification-card__avatar"
          loading="lazy"
        />
        <span
          className={`notification-card__mini-badge notification-card__mini-badge--${category}`}
          aria-hidden="true"
        >
          <CategoryIcon category={category} size={11} />
        </span>
      </div>
    );
  }

  const person = item.staff ?? item.character;
  const personImg = sanitizeImageUrl(
    person?.image?.medium || person?.image?.large || "",
  );
  if (personImg) {
    return (
      <div className="notification-card__avatar-wrap">
        <img
          src={personImg}
          alt={getPersonPreferredName(person)}
          className="notification-card__avatar"
          loading="lazy"
        />
        <span
          className={`notification-card__mini-badge notification-card__mini-badge--${category}`}
          aria-hidden="true"
        >
          <CategoryIcon category={category} size={11} />
        </span>
      </div>
    );
  }

  return (
    <div
      className={`notification-card__icon-tile notification-card__icon-tile--${category}`}
      aria-hidden="true"
    >
      {item.media ? <Film size={18} /> : <CategoryIcon category={category} size={18} />}
    </div>
  );
}

function NotificationHeadline({ item }: { item: NotificationItem }) {
  if (item.type === "AIRING") {
    const parts = getAiringContextParts(item);
    return (
      <p className="notification-card__headline">
        {parts.prefix}
        {parts.episodeLabel && <strong>{parts.episodeLabel}</strong>}
        {parts.middle}
        {item.media ? (
          <Link
            to={`/anime/${item.media.id}`}
            className="notification-card__entity-link"
          >
            {parts.mediaTitle}
          </Link>
        ) : (
          <strong>{parts.mediaTitle}</strong>
        )}
        {parts.suffix}
      </p>
    );
  }

  const category = getNotificationCategory(item.type);

  if (category === "follows" || category === "activity") {
    const actor = item.user?.name ?? "Someone";
    const actorUrl = item.user?.siteUrl ||
      (item.user?.name ? `https://anilist.co/user/${encodeURIComponent(item.user.name)}` : undefined);

    return (
      <p className="notification-card__headline">
        {actorUrl ? (
          <button
            type="button"
            className="notification-card__inline-btn"
            onClick={() => void openExternalUrl(actorUrl)}
          >
            {actor}
          </button>
        ) : (
          <strong>{actor}</strong>
        )}
        {item.context || " interacted with your activity."}
        {item.activity?.media && (
          <>
            {" "}
            <Link
              to={`/${getMediaPath(item.activity.media.type)}/${item.activity.media.id}`}
              className="notification-card__entity-link"
            >
              ({getMediaPreferredTitle(item.activity.media)})
            </Link>
          </>
        )}
      </p>
    );
  }

  if (category === "forum") {
    const actor = item.user?.name ?? "Someone";
    return (
      <p className="notification-card__headline">
        <strong>{actor}</strong>
        {item.context || " commented on a forum thread."}
        {item.thread?.title && (
          <>
            {" "}
            in{" "}
            {item.thread.siteUrl ? (
              <button
                type="button"
                className="notification-card__inline-btn"
                onClick={() => void openExternalUrl(item.thread!.siteUrl!)}
              >
                {item.thread.title}
              </button>
            ) : (
              <strong>{item.thread.title}</strong>
            )}
          </>
        )}
      </p>
    );
  }

  if (
    item.type === "MEDIA_SUBMISSION_UPDATE" ||
    item.type === "STAFF_SUBMISSION_UPDATE" ||
    item.type === "CHARACTER_SUBMISSION_UPDATE"
  ) {
    const statusLabel = item.status
      ? formatNotificationTypeEnumLabel(item.status)
      : null;
    const statusVariant = item.status?.toUpperCase().includes("REJECT")
      ? "rejected"
      : item.status?.toUpperCase().includes("PARTIAL")
        ? "partial"
        : "accepted";

    return (
      <p className="notification-card__headline">
        {formatSubmissionHeadline(item)}
        {statusLabel && (
          <span
            className={`notification-status-pill notification-status-pill--${statusVariant}`}
          >
            {statusLabel}
          </span>
        )}
      </p>
    );
  }

  if (item.type === "MEDIA_DELETION") {
    return (
      <p className="notification-card__headline">
        <strong>{item.deletedMediaTitle || "A tracked title"}</strong>
        {item.context || " was deleted from AniList."}
      </p>
    );
  }

  if (item.type === "MEDIA_MERGE") {
    const mergedTitles = item.deletedMediaTitles?.length
      ? item.deletedMediaTitles.join(", ")
      : "An entry";
    return (
      <p className="notification-card__headline">
        <strong>{mergedTitles}</strong>
        {item.context || " was merged into "}
        {item.media ? (
          <Link
            to={`/${getMediaPath(item.media.type)}/${item.media.id}`}
            className="notification-card__entity-link"
          >
            {getMediaPreferredTitle(item.media)}
          </Link>
        ) : (
          <strong>another entry</strong>
        )}
        .
      </p>
    );
  }

  if (
    item.type === "RELATED_MEDIA_ADDITION" ||
    item.type === "MEDIA_DATA_CHANGE"
  ) {
    const title = getMediaPreferredTitle(item.media);
    return (
      <p className="notification-card__headline">
        {item.media ? (
          <Link
            to={`/${getMediaPath(item.media.type)}/${item.media.id}`}
            className="notification-card__entity-link"
          >
            {title}
          </Link>
        ) : (
          <strong>{title}</strong>
        )}
        {item.context || " was updated on AniList."}
      </p>
    );
  }

  return (
    <p className="notification-card__headline">
      {item.context?.trim() || "New notification from AniList."}
    </p>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    unreadCount,
    isRefreshing,
    isMarkingRead,
    preferences,
    refreshUnreadCount,
    markAllRead,
    recordSeenNotifications,
    syncUnreadCount,
  } = useNotificationsContext();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeCategory, setActiveCategory] =
    useState<NotificationCategory>("all");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionUnreadSnapshot, setSessionUnreadSnapshot] = useState(0);

  const requestIdRef = useRef(0);
  const autoResetDoneRef = useRef(false);
  const unreadCountRef = useRef(unreadCount);
  unreadCountRef.current = unreadCount;

  const autoMarkReadOnOpen = preferences.autoMarkReadOnOpen;

  const loadNotificationsPage = useCallback(
    async (targetCategory: NotificationCategory, targetPage: number) => {
      if (!isAuthenticated) return;

      const reqId = ++requestIdRef.current;
      const isInitial = targetPage === 1;
      if (isInitial) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      const shouldAutoReset =
        isInitial &&
        targetCategory === "all" &&
        autoMarkReadOnOpen &&
        unreadCountRef.current > 0 &&
        !autoResetDoneRef.current;

      if (shouldAutoReset) {
        autoResetDoneRef.current = true;
        setSessionUnreadSnapshot(unreadCountRef.current);
      }

      try {
        const result = await fetchNotifications({
          typeIn: getNotificationTypesForCategory(targetCategory),
          resetNotificationCount: shouldAutoReset,
          page: targetPage,
          perPage: PAGE_SIZE,
        });

        if (reqId !== requestIdRef.current) return;

        recordSeenNotifications(result.notifications);

        if (shouldAutoReset) {
          syncUnreadCount(0);
          clearAniListCache("viewer");
        }

        setItems((prev) =>
          isInitial
            ? result.notifications
            : mergeNotificationsById(prev, result.notifications),
        );
        setPage(targetPage);
        setHasNextPage(Boolean(result.pageInfo?.hasNextPage));
      } catch (err) {
        if (reqId !== requestIdRef.current) return;
        console.error("Failed to load notifications:", err);
        setError("Unable to load notifications from AniList. Please try again.");
      } finally {
        if (reqId === requestIdRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [
      autoMarkReadOnOpen,
      isAuthenticated,
      recordSeenNotifications,
      syncUnreadCount,
    ],
  );

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      requestIdRef.current++;
      autoResetDoneRef.current = false;
      setItems([]);
      setPage(1);
      setHasNextPage(false);
      setError(null);
      setSessionUnreadSnapshot(0);
      return;
    }

    setItems([]);
    setPage(1);
    setHasNextPage(false);
    void loadNotificationsPage(activeCategory, 1);
  }, [activeCategory, authLoading, isAuthenticated, loadNotificationsPage]);

  const handleRefresh = async () => {
    if (!isAuthenticated || isLoading) return;
    await Promise.all([
      loadNotificationsPage(activeCategory, 1),
      refreshUnreadCount({ force: true, suppressDesktop: true }),
    ]);
  };

  const handleMarkAllRead = async () => {
    if (!isAuthenticated || unreadCount === 0 || isMarkingRead) return;
    setError(null);
    try {
      const freshPage = await markAllRead();
      setSessionUnreadSnapshot(0);
      if (freshPage && activeCategory === "all") {
        setItems(freshPage.notifications);
        setPage(1);
        setHasNextPage(Boolean(freshPage.pageInfo?.hasNextPage));
      }
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
      setError("Failed to mark notifications as read. Please try again.");
    }
  };

  const highlightCount =
    activeCategory === "all"
      ? unreadCount > 0
        ? unreadCount
        : sessionUnreadSnapshot
      : 0;

  const highlightedUnreadIds = useMemo(
    () => new Set(items.slice(0, highlightCount).map((item) => item.id)),
    [highlightCount, items],
  );

  const grouped = useMemo(() => groupNotificationsByDate(items), [items]);

  if (authLoading) {
    return (
      <div className="page-state page-state--fullscreen">
        <Loader2 className="page-state__spinner" size={28} aria-hidden="true" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="notifications-page">
        <PageHeader
          icon={<Bell />}
          title="Notifications"
          subtitle="Airing episodes, replies, follows, forum mentions, and library updates"
        />

        <div className="empty-state">
          <div className="empty-state__icon-box">
            <Bell size={24} aria-hidden="true" />
          </div>
          <h2 className="empty-state__title">Sign in to view notifications</h2>
          <p className="empty-state__description">
            Connect your AniList account to track new episode releases,
            activity replies, follows, and media updates.
          </p>
          <button
            type="button"
            className="button-primary"
            onClick={() => setShowLoginModal(true)}
          >
            <LogIn size={16} aria-hidden="true" />
            Sign In with AniList
          </button>
        </div>

        {showLoginModal && (
          <LoginModal onClose={() => setShowLoginModal(false)} />
        )}
      </div>
    );
  }

  const emptyCopy = EMPTY_COPY_BY_CATEGORY[activeCategory];

  return (
    <div className="notifications-page">
      <PageHeader
        icon={<Bell />}
        title="Notifications"
        subtitle="Airing episodes, replies, follows, forum mentions, and library updates"
        meta={
          unreadCount > 0 ? (
            <span className="notifications-unread-pill">
              {unreadCount} unread
            </span>
          ) : undefined
        }
        actions={
          <div className="notifications-header-actions">
            <button
              type="button"
              className="button-secondary"
              disabled={isLoading || isRefreshing}
              onClick={() => void handleRefresh()}
            >
              <RefreshCw
                size={15}
                className={isLoading || isRefreshing ? "notifications-spin" : ""}
                aria-hidden="true"
              />
              Refresh
            </button>

            <button
              type="button"
              className={unreadCount > 0 ? "button-primary" : "button-secondary"}
              disabled={unreadCount === 0 || isMarkingRead}
              onClick={() => void handleMarkAllRead()}
            >
              {isMarkingRead ? (
                <Loader2
                  size={15}
                  className="notifications-spin"
                  aria-hidden="true"
                />
              ) : (
                <CheckCheck size={15} aria-hidden="true" />
              )}
              Mark all read
            </button>
          </div>
        }
      />

      <div className="notifications-toolbar">
        <Tabs
          tabs={CATEGORY_TABS}
          activeTab={activeCategory}
          onTabChange={(tabId) => {
            setActiveCategory(tabId as NotificationCategory);
          }}
        />
      </div>

      {error && (
        <div className="notifications-error-banner" role="alert">
          <div className="notifications-error-banner__content">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="button-secondary"
            onClick={() => void loadNotificationsPage(activeCategory, 1)}
          >
            Retry
          </button>
        </div>
      )}

      {isLoading && items.length === 0 ? (
        <div className="notifications-skeleton-list" aria-busy="true">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="notification-skeleton-card">
              <div className="notification-skeleton notification-skeleton--thumb" />
              <div className="notification-skeleton__lines">
                <div className="notification-skeleton notification-skeleton--line-lg" />
                <div className="notification-skeleton notification-skeleton--line-sm" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon-box">
            <BellOff size={24} aria-hidden="true" />
          </div>
          <h2 className="empty-state__title">{emptyCopy.title}</h2>
          <p className="empty-state__description">{emptyCopy.description}</p>
        </div>
      ) : (
        <div className="notifications-groups">
          {grouped.map((group) => (
            <section
              key={group.label}
              className="notifications-group"
              aria-label={group.label}
            >
              <header className="notifications-group__header">
                <h2 className="notifications-group__title">{group.label}</h2>
                <span className="notifications-group__count">
                  {group.items.length}
                </span>
              </header>

              <div className="notifications-list">
                {group.items.map((item) => {
                  const category = getNotificationCategory(item.type);
                  const isUnread = highlightedUnreadIds.has(item.id);
                  const richSnippet =
                    item.activity?.message ||
                    item.activity?.text ||
                    item.comment?.comment ||
                    null;
                  const noteText =
                    !richSnippet && (item.reason || item.notes)
                      ? item.reason || item.notes
                      : null;
                  const externalUrl = getNotificationExternalUrl(item);
                  const exactTimestamp = item.createdAt
                    ? new Date(item.createdAt * 1000).toLocaleString()
                    : undefined;

                  return (
                    <article
                      key={item.id}
                      className={`notification-card${isUnread ? " notification-card--unread" : ""}`}
                    >
                      <NotificationVisual item={item} category={category} />

                      <div className="notification-card__body">
                        <NotificationHeadline item={item} />

                        {richSnippet && (
                          <div className="notification-card__snippet-box">
                            <RichContent
                              content={richSnippet}
                              allowBasicHtml
                              className="notification-card__snippet"
                            />
                          </div>
                        )}

                        {noteText && (
                          <p className="notification-card__note">{noteText}</p>
                        )}

                        <div className="notification-card__meta">
                          <span
                            className={`notification-card__category notification-card__category--${category}`}
                          >
                            <CategoryIcon category={category} size={12} />
                            {CATEGORY_BADGE_LABELS[category]}
                          </span>

                          {item.createdAt > 0 && (
                            <span
                              className="notification-card__time"
                              title={exactTimestamp}
                            >
                              {formatRelativeNotificationTime(item.createdAt)}
                            </span>
                          )}

                          {isUnread && (
                            <span className="notification-card__unread-dot">
                              New
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="notification-card__actions">
                        {item.type === "AIRING" && item.media ? (
                          <>
                            <button
                              type="button"
                              className="button-primary notification-card__btn"
                              onClick={() =>
                                navigate("/playback", {
                                  state: {
                                    query: getMediaPreferredTitle(item.media),
                                    mediaId: item.media!.id,
                                    mediaType: "anime",
                                    episode: item.episode,
                                  },
                                })
                              }
                            >
                              <Play size={14} aria-hidden="true" />
                              Watch{item.episode ? ` Ep. ${item.episode}` : ""}
                            </button>
                            <Link
                              to={`/anime/${item.media.id}`}
                              className="button-secondary notification-card__btn"
                            >
                              Details
                            </Link>
                          </>
                        ) : (
                          <>
                            {item.media && (
                              <Link
                                to={`/${getMediaPath(item.media.type)}/${item.media.id}`}
                                className="button-secondary notification-card__btn"
                              >
                                View{" "}
                                {item.media.type?.toUpperCase() === "MANGA"
                                  ? "Manga"
                                  : "Anime"}
                              </Link>
                            )}
                            {externalUrl && (
                              <button
                                type="button"
                                className="button-secondary notification-card__btn"
                                onClick={() => void openExternalUrl(externalUrl)}
                              >
                                <ExternalLink size={14} aria-hidden="true" />
                                Open on AniList
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {hasNextPage && (
            <div className="notifications-load-more">
              <button
                type="button"
                className="button-secondary"
                disabled={isLoadingMore}
                onClick={() =>
                  void loadNotificationsPage(activeCategory, page + 1)
                }
              >
                {isLoadingMore && (
                  <Loader2
                    size={15}
                    className="notifications-spin"
                    aria-hidden="true"
                  />
                )}
                {isLoadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
