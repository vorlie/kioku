import type {
  DesktopNotificationCategory,
  NotificationCategory,
  NotificationItem,
  NotificationMedia,
  NotificationPerson,
} from "../types/anilist.ts";
import { sanitizeExternalUrl } from "./safeUrl.ts";

export type NotificationDateBucket =
  | "Today"
  | "Yesterday"
  | "This Week"
  | "Earlier";

export interface NotificationGroup {
  label: NotificationDateBucket;
  items: NotificationItem[];
}

export const CATEGORY_NOTIFICATION_TYPES: Record<
  DesktopNotificationCategory,
  readonly string[]
> = {
  airing: ["AIRING"],
  activity: [
    "ACTIVITY_MESSAGE",
    "ACTIVITY_REPLY",
    "ACTIVITY_MENTION",
    "ACTIVITY_LIKE",
    "ACTIVITY_REPLY_LIKE",
    "ACTIVITY_REPLY_SUBSCRIBED",
  ],
  follows: ["FOLLOWING"],
  forum: [
    "THREAD_COMMENT_MENTION",
    "THREAD_SUBSCRIBED",
    "THREAD_COMMENT_REPLY",
    "THREAD_COMMENT_LIKE",
    "THREAD_LIKE",
  ],
  media: [
    "RELATED_MEDIA_ADDITION",
    "MEDIA_DATA_CHANGE",
    "MEDIA_MERGE",
    "MEDIA_DELETION",
    "MEDIA_SUBMISSION_UPDATE",
    "STAFF_SUBMISSION_UPDATE",
    "CHARACTER_SUBMISSION_UPDATE",
  ],
};

export const DESKTOP_CATEGORY_LABELS: Record<
  DesktopNotificationCategory,
  string
> = {
  airing: "Airing",
  activity: "Activity",
  follows: "Follows",
  forum: "Forum",
  media: "Media & Updates",
};

export interface AniListNotificationOptionMeta {
  label: string;
  description: string;
  group: "Activity" | "Follows" | "Forum" | "Media & Library";
}

export const ANILIST_NOTIFICATION_OPTION_META: Record<
  string,
  AniListNotificationOptionMeta
> = {
  ACTIVITY_MESSAGE: {
    label: "Direct messages",
    description: "When someone sends an activity message to your profile.",
    group: "Activity",
  },
  ACTIVITY_REPLY: {
    label: "Activity replies",
    description: "When someone replies to your status or list activity.",
    group: "Activity",
  },
  ACTIVITY_REPLY_SUBSCRIBED: {
    label: "Subscribed activity replies",
    description: "When someone replies to an activity thread you joined.",
    group: "Activity",
  },
  ACTIVITY_MENTION: {
    label: "Activity mentions",
    description: "When another user @mentions you in an activity or reply.",
    group: "Activity",
  },
  ACTIVITY_LIKE: {
    label: "Activity likes",
    description: "When someone likes your status or list update.",
    group: "Activity",
  },
  ACTIVITY_REPLY_LIKE: {
    label: "Reply likes",
    description: "When someone likes your activity reply.",
    group: "Activity",
  },
  FOLLOWING: {
    label: "New followers",
    description: "When another AniList user starts following you.",
    group: "Follows",
  },
  THREAD_COMMENT_MENTION: {
    label: "Forum mentions",
    description: "When another user @mentions you in a forum comment.",
    group: "Forum",
  },
  THREAD_SUBSCRIBED: {
    label: "Subscribed threads",
    description: "When a new comment is posted in a subscribed forum thread.",
    group: "Forum",
  },
  THREAD_COMMENT_REPLY: {
    label: "Forum replies",
    description: "When someone replies directly to your forum comment.",
    group: "Forum",
  },
  THREAD_COMMENT_LIKE: {
    label: "Forum comment likes",
    description: "When someone likes one of your forum comments.",
    group: "Forum",
  },
  THREAD_LIKE: {
    label: "Thread likes",
    description: "When someone likes a forum thread you created.",
    group: "Forum",
  },
  RELATED_MEDIA_ADDITION: {
    label: "Related media additions",
    description:
      "When a sequel, side story, or adaptation is added for media on your list.",
    group: "Media & Library",
  },
  MEDIA_DATA_CHANGE: {
    label: "Media data updates",
    description:
      "When an entry on your list has significant data changes affecting tracking.",
    group: "Media & Library",
  },
  MEDIA_MERGE: {
    label: "Media merges",
    description:
      "When duplicate entries on your list are merged into another entry.",
    group: "Media & Library",
  },
  MEDIA_DELETION: {
    label: "Media removals",
    description: "When a title from your list is deleted from AniList.",
    group: "Media & Library",
  },
  MEDIA_SUBMISSION_UPDATE: {
    label: "Media submission updates",
    description: "Status updates for anime or manga submissions you sent.",
    group: "Media & Library",
  },
  STAFF_SUBMISSION_UPDATE: {
    label: "Staff submission updates",
    description: "Status updates for staff submissions you sent.",
    group: "Media & Library",
  },
  CHARACTER_SUBMISSION_UPDATE: {
    label: "Character submission updates",
    description: "Status updates for character submissions you sent.",
    group: "Media & Library",
  },
};

export function formatNotificationTypeEnumLabel(type: string): string {
  return type
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function getNotificationTypesForCategory(
  category: NotificationCategory,
): string[] | undefined {
  if (category === "all") return undefined;
  return [...CATEGORY_NOTIFICATION_TYPES[category]];
}

export function getNotificationCategory(
  type: string,
): DesktopNotificationCategory {
  for (const [category, types] of Object.entries(CATEGORY_NOTIFICATION_TYPES)) {
    if (types.includes(type)) {
      return category as DesktopNotificationCategory;
    }
  }
  return "media";
}

export function getMediaPreferredTitle(media?: NotificationMedia | null): string {
  const title = media?.title;
  return (
    title?.userPreferred ||
    title?.english ||
    title?.romaji ||
    title?.native ||
    "Unknown title"
  );
}

export function getPersonPreferredName(
  person?: NotificationPerson | null,
): string {
  return person?.name?.userPreferred || person?.name?.full || "Unknown entry";
}

export function stripFormattingToPlainText(
  input?: string | null,
  maxLength = 180,
): string {
  if (!input) return "";

  let text = input;

  // Redact AniList spoilers before stripping HTML or markdown tokens
  text = text.replace(
    /<span\b[^>]*class\s*=\s*["'][^"']*markdown_spoiler[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,
    "[spoiler]",
  );
  text = text.replace(/~!([\s\S]*?)!~/g, "[spoiler]");

  // Strip embedded AniList image syntax and markdown images
  text = text.replace(/img\d*\([^)]*\)/gi, "");
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, "");

  // Replace markdown links with visible label text
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // Strip HTML tags and center/alignment markers
  text = text.replace(/<br\s*\/?>/gi, " ");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/~~~/g, " ");

  // Strip common markdown emphasis/code markers
  text = text.replace(/```[\s\S]*?```/g, (block) =>
    block.replace(/```/g, " "),
  );
  text = text.replace(/`([^`]*)`/g, "$1");
  text = text.replace(/(\*\*|__|~~)/g, "");
  text = text.replace(/(^|\s)[*>#]+(?=\s|$)/g, "$1");
  text = text.replace(/[*_]/g, "");

  text = text.replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (maxLength > 1 && text.length > maxLength) {
    return `${text.slice(0, maxLength - 1).trimEnd()}…`;
  }
  return text;
}

export interface AiringContextParts {
  prefix: string;
  episodeLabel: string;
  middle: string;
  mediaTitle: string;
  suffix: string;
}

export function getAiringContextParts(
  item: NotificationItem,
): AiringContextParts {
  const mediaTitle = getMediaPreferredTitle(item.media);
  const episodeLabel = item.episode != null ? String(item.episode) : "";
  const contexts = item.contexts;

  if (contexts && contexts.length >= 3 && episodeLabel) {
    return {
      prefix: contexts[0] ?? "Episode ",
      episodeLabel,
      middle: contexts[1] ?? " of ",
      mediaTitle,
      suffix: contexts[2] ?? " aired.",
    };
  }

  if (episodeLabel) {
    return {
      prefix: "Episode ",
      episodeLabel,
      middle: " of ",
      mediaTitle,
      suffix: " aired.",
    };
  }

  return {
    prefix: "New episode of ",
    episodeLabel: "",
    middle: "",
    mediaTitle,
    suffix: " aired.",
  };
}

export function formatAiringMessage(item: NotificationItem): string {
  const parts = getAiringContextParts(item);
  return `${parts.prefix}${parts.episodeLabel}${parts.middle}${parts.mediaTitle}${parts.suffix}`.trim();
}

export function getNotificationSnippet(item: NotificationItem): string | null {
  const raw =
    item.activity?.message ||
    item.activity?.text ||
    item.comment?.comment ||
    null;
  if (raw && raw.trim()) return raw;

  if (item.activity?.status) {
    const mediaTitle = getMediaPreferredTitle(item.activity.media);
    const progress = item.activity.progress
      ? ` ${item.activity.progress}`
      : "";
    return `${item.activity.status}${progress} — ${mediaTitle}`.trim();
  }

  return item.reason || item.notes || null;
}

const DEFAULT_CONTEXT_BY_TYPE: Record<string, string> = {
  FOLLOWING: " started following you.",
  ACTIVITY_MESSAGE: " sent you a message.",
  ACTIVITY_REPLY: " replied to your activity.",
  ACTIVITY_MENTION: " mentioned you in an activity.",
  ACTIVITY_LIKE: " liked your activity.",
  ACTIVITY_REPLY_LIKE: " liked your activity reply.",
  ACTIVITY_REPLY_SUBSCRIBED: " replied to a subscribed activity.",
  THREAD_COMMENT_MENTION: " mentioned you in a forum comment.",
  THREAD_SUBSCRIBED: " commented in a subscribed thread.",
  THREAD_COMMENT_REPLY: " replied to your forum comment.",
  THREAD_COMMENT_LIKE: " liked your forum comment.",
  THREAD_LIKE: " liked your forum thread.",
  RELATED_MEDIA_ADDITION: " was added to AniList.",
  MEDIA_DATA_CHANGE: " received data updates.",
  MEDIA_MERGE: " was merged.",
  MEDIA_DELETION: " was deleted from AniList.",
};

const TOAST_TITLE_BY_TYPE: Record<string, string> = {
  FOLLOWING: "New follower",
  ACTIVITY_MESSAGE: "New activity message",
  ACTIVITY_REPLY: "Activity reply",
  ACTIVITY_MENTION: "Activity mention",
  ACTIVITY_LIKE: "Activity liked",
  ACTIVITY_REPLY_LIKE: "Reply liked",
  ACTIVITY_REPLY_SUBSCRIBED: "Subscribed activity",
  THREAD_COMMENT_MENTION: "Forum mention",
  THREAD_SUBSCRIBED: "Subscribed forum thread",
  THREAD_COMMENT_REPLY: "Forum comment reply",
  THREAD_COMMENT_LIKE: "Forum comment liked",
  THREAD_LIKE: "Forum thread liked",
  RELATED_MEDIA_ADDITION: "Related media added",
  MEDIA_DATA_CHANGE: "Media data updated",
  MEDIA_MERGE: "Media merged",
  MEDIA_DELETION: "Media removed",
  MEDIA_SUBMISSION_UPDATE: "Media submission update",
  STAFF_SUBMISSION_UPDATE: "Staff submission update",
  CHARACTER_SUBMISSION_UPDATE: "Character submission update",
};

export function formatSubmissionHeadline(item: NotificationItem): string {
  const targetTitle =
    item.media != null
      ? getMediaPreferredTitle(item.media)
      : item.submittedTitle
        ? item.submittedTitle
        : item.staff != null
          ? getPersonPreferredName(item.staff)
          : item.character != null
            ? getPersonPreferredName(item.character)
            : "your submission";

  if (item.contexts && item.contexts.length >= 2) {
    const combined = `${item.contexts[0]}${targetTitle}${item.contexts.slice(1).join("")}`.trim();
    if (combined) return combined;
  }

  if (item.contexts && item.contexts.length === 1 && item.contexts[0].trim()) {
    return item.contexts[0].trim();
  }

  const statusText = item.status
    ? item.status.toLowerCase().replace(/_/g, " ")
    : "updated";
  return `Your submission for ${targetTitle} was ${statusText}.`;
}

export function formatNotificationPlainText(
  item: NotificationItem,
): { title: string; body: string } {
  if (item.type === "AIRING") {
    return {
      title: getMediaPreferredTitle(item.media),
      body: formatAiringMessage(item),
    };
  }

  const category = getNotificationCategory(item.type);
  const title = TOAST_TITLE_BY_TYPE[item.type] ?? "AniList notification";

  if (category === "follows" || category === "activity") {
    const actor = item.user?.name ?? "Someone";
    const context = item.context ?? DEFAULT_CONTEXT_BY_TYPE[item.type] ?? " interacted with your activity.";
    const headline = `${actor}${context}`.replace(/\s+/g, " ").trim();
    const snippet = stripFormattingToPlainText(getNotificationSnippet(item), 120);
    return {
      title,
      body: snippet ? `${headline} — ${snippet}` : headline,
    };
  }

  if (category === "forum") {
    const actor = item.user?.name ?? "Someone";
    const context = item.context ?? DEFAULT_CONTEXT_BY_TYPE[item.type] ?? " updated a thread.";
    const threadPart = item.thread?.title ? ` in "${item.thread.title}"` : "";
    const headline = `${actor}${context}${threadPart}`.replace(/\s+/g, " ").trim();
    const snippet = stripFormattingToPlainText(item.comment?.comment, 120);
    return {
      title,
      body: snippet ? `${headline} — ${snippet}` : headline,
    };
  }

  if (
    item.type === "MEDIA_SUBMISSION_UPDATE" ||
    item.type === "STAFF_SUBMISSION_UPDATE" ||
    item.type === "CHARACTER_SUBMISSION_UPDATE"
  ) {
    const headline = formatSubmissionHeadline(item);
    const notes = stripFormattingToPlainText(item.notes, 120);
    return {
      title,
      body: notes ? `${headline} (${notes})` : headline,
    };
  }

  if (item.type === "MEDIA_DELETION") {
    const deletedTitle = item.deletedMediaTitle || "A tracked title";
    const context = item.context ?? DEFAULT_CONTEXT_BY_TYPE.MEDIA_DELETION;
    const reason = stripFormattingToPlainText(item.reason, 120);
    const headline = `${deletedTitle}${context}`.replace(/\s+/g, " ").trim();
    return {
      title,
      body: reason ? `${headline} (${reason})` : headline,
    };
  }

  if (
    item.type === "RELATED_MEDIA_ADDITION" ||
    item.type === "MEDIA_DATA_CHANGE" ||
    item.type === "MEDIA_MERGE"
  ) {
    const targetTitle =
      item.type === "MEDIA_MERGE" && item.deletedMediaTitles?.length
        ? item.deletedMediaTitles.join(", ")
        : getMediaPreferredTitle(item.media);
    const mergedInto =
      item.type === "MEDIA_MERGE" && item.media
        ? getMediaPreferredTitle(item.media)
        : "";
    const context = item.context ?? DEFAULT_CONTEXT_BY_TYPE[item.type] ?? "";
    const reason = stripFormattingToPlainText(item.reason, 120);
    const headline = `${targetTitle}${context}${mergedInto}`
      .replace(/\s+/g, " ")
      .trim();
    return {
      title: item.media ? getMediaPreferredTitle(item.media) : title,
      body: reason ? `${headline} (${reason})` : headline,
    };
  }

  return {
    title,
    body: item.context?.trim() || "You have a new notification on AniList.",
  };
}

export function formatNotificationSummary(
  items: NotificationItem[],
): { title: string; body: string } {
  if (items.length === 0) {
    return { title: "Kioku", body: "No new notifications." };
  }
  if (items.length === 1) {
    return formatNotificationPlainText(items[0]);
  }
  const first = formatNotificationPlainText(items[0]);
  const sampleLabel = first.title || "recent activity";
  return {
    title: "Kioku — AniList",
    body: `${items.length} new AniList notifications, including ${sampleLabel}.`,
  };
}

export function getNotificationExternalUrl(item: NotificationItem): string | null {
  const candidates: (string | undefined)[] = [
    item.comment?.siteUrl,
    item.thread?.siteUrl,
    item.activity?.siteUrl,
    item.activityId ? `https://anilist.co/activity/${item.activityId}` : undefined,
    item.media?.siteUrl,
    item.staff?.siteUrl,
    item.character?.siteUrl,
    item.user?.siteUrl,
    item.user?.name
      ? `https://anilist.co/user/${encodeURIComponent(item.user.name)}`
      : undefined,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const safe = sanitizeExternalUrl(candidate);
    if (safe) return safe;
  }

  return null;
}

export function getNotificationDateBucket(
  createdAtSeconds: number,
  nowMs = Date.now(),
): NotificationDateBucket {
  if (!Number.isFinite(createdAtSeconds) || createdAtSeconds <= 0) {
    return "Earlier";
  }

  const now = new Date(nowMs);
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const yesterdayStart = todayStart - 86_400_000;
  const weekStart = todayStart - 6 * 86_400_000;
  const itemMs = createdAtSeconds * 1000;

  if (itemMs >= todayStart) return "Today";
  if (itemMs >= yesterdayStart) return "Yesterday";
  if (itemMs >= weekStart) return "This Week";
  return "Earlier";
}

export function groupNotificationsByDate(
  items: NotificationItem[],
  nowMs = Date.now(),
): NotificationGroup[] {
  const order: NotificationDateBucket[] = [
    "Today",
    "Yesterday",
    "This Week",
    "Earlier",
  ];
  const buckets = new Map<NotificationDateBucket, NotificationItem[]>();

  for (const item of items) {
    const label = getNotificationDateBucket(item.createdAt, nowMs);
    const group = buckets.get(label);
    if (group) {
      group.push(item);
    } else {
      buckets.set(label, [item]);
    }
  }

  return order
    .map((label) => {
      const grouped = buckets.get(label);
      return grouped && grouped.length > 0 ? { label, items: grouped } : null;
    })
    .filter((entry): entry is NotificationGroup => entry !== null);
}

export function formatRelativeNotificationTime(
  createdAtSeconds: number,
  nowMs = Date.now(),
): string {
  if (!Number.isFinite(createdAtSeconds) || createdAtSeconds <= 0) {
    return "";
  }

  const date = new Date(createdAtSeconds * 1000);
  const diffMs = Math.max(0, nowMs - date.getTime());
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  const currentYear = new Date(nowMs).getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== currentYear ? "numeric" : undefined,
  });
}

export function mergeNotificationsById(
  existing: NotificationItem[],
  incoming: NotificationItem[],
): NotificationItem[] {
  const seen = new Set(existing.map((item) => item.id));
  const merged = [...existing];
  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

export function filterNewNotifications(
  items: NotificationItem[],
  lastNotifiedId: number,
): NotificationItem[] {
  return items
    .filter((item) => item.id > lastNotifiedId)
    .sort((a, b) => b.id - a.id);
}

export function getMaxNotificationId(
  items: NotificationItem[],
  currentMax = 0,
): number {
  let maxId = currentMax;
  for (const item of items) {
    if (item.id > maxId) {
      maxId = item.id;
    }
  }
  return maxId;
}
