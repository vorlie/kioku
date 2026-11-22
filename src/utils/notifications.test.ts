import test from "node:test";
import assert from "node:assert/strict";
import type { NotificationItem } from "../types/anilist.ts";
import {
  CATEGORY_NOTIFICATION_TYPES,
  filterNewNotifications,
  formatAiringMessage,
  formatNotificationPlainText,
  formatNotificationSummary,
  getMaxNotificationId,
  getNotificationCategory,
  getNotificationDateBucket,
  getNotificationExternalUrl,
  getNotificationTypesForCategory,
  groupNotificationsByDate,
  mergeNotificationsById,
  stripFormattingToPlainText,
} from "./notifications.ts";

test("maps all 20 notification types to categories and handles unknown fallback", () => {
  const allTypes = Object.values(CATEGORY_NOTIFICATION_TYPES).flat();
  assert.equal(allTypes.length, 20);

  assert.equal(getNotificationCategory("AIRING"), "airing");
  assert.equal(getNotificationCategory("ACTIVITY_REPLY"), "activity");
  assert.equal(getNotificationCategory("FOLLOWING"), "follows");
  assert.equal(getNotificationCategory("THREAD_COMMENT_MENTION"), "forum");
  assert.equal(getNotificationCategory("MEDIA_MERGE"), "media");
  assert.equal(getNotificationCategory("UNKNOWN_FUTURE_TYPE"), "media");

  assert.equal(getNotificationTypesForCategory("all"), undefined);
  assert.deepEqual(getNotificationTypesForCategory("airing"), ["AIRING"]);
});

test("formats AiringNotification contexts array cleanly with fallback", () => {
  const airing: NotificationItem = {
    id: 1,
    type: "AIRING",
    createdAt: 1_700_000_000,
    animeId: 21,
    episode: 7,
    contexts: ["Episode ", " of ", " aired."],
    media: {
      id: 21,
      type: "ANIME",
      title: { userPreferred: "Frieren: Beyond Journey's End" },
    },
  };

  assert.equal(
    formatAiringMessage(airing),
    "Episode 7 of Frieren: Beyond Journey's End aired.",
  );

  const fallbackAiring: NotificationItem = {
    id: 2,
    type: "AIRING",
    createdAt: 1_700_000_000,
    episode: 12,
    media: {
      id: 22,
      title: { romaji: "Dungeon Meshi" },
    },
  };
  assert.equal(
    formatAiringMessage(fallbackAiring),
    "Episode 12 of Dungeon Meshi aired.",
  );
});

test("strips markdown, HTML, images, and redacts spoilers for OS notifications", () => {
  const dirty =
    '<b>Hello</b> [AniList](https://anilist.co) ~!secret plot twist!~ <span class="markdown_spoiler">another spoiler</span> img220(https://img.example/a.png) ***bold***';
  const cleaned = stripFormattingToPlainText(dirty, 180);

  assert.ok(cleaned.includes("Hello"));
  assert.ok(cleaned.includes("AniList"));
  assert.ok(cleaned.includes("[spoiler]"));
  assert.ok(!cleaned.includes("secret plot twist"));
  assert.ok(!cleaned.includes("another spoiler"));
  assert.ok(!cleaned.includes("img220"));
  assert.ok(!cleaned.includes("<b>"));

  const longText = "a".repeat(220);
  const truncated = stripFormattingToPlainText(longText, 50);
  assert.equal(truncated.length, 50);
  assert.ok(truncated.endsWith("…"));
});

test("formats plain-text notifications and burst summaries across types", () => {
  const follow: NotificationItem = {
    id: 10,
    type: "FOLLOWING",
    createdAt: 1_700_000_000,
    context: " started following you.",
    user: { id: 5, name: "Himmel" },
  };
  assert.deepEqual(formatNotificationPlainText(follow), {
    title: "New follower",
    body: "Himmel started following you.",
  });

  const forum: NotificationItem = {
    id: 11,
    type: "THREAD_COMMENT_MENTION",
    createdAt: 1_700_000_100,
    context: " mentioned you, in a forum comment.",
    user: { id: 6, name: "Stark" },
    thread: { id: 77, title: "Weekly Discussion" },
    comment: { id: 99, comment: "~!Ending spoiler!~ Loved the soundtrack!" },
  };
  const formattedForum = formatNotificationPlainText(forum);
  assert.equal(formattedForum.title, "Forum mention");
  assert.ok(formattedForum.body.includes("Stark"));
  assert.ok(formattedForum.body.includes("Weekly Discussion"));
  assert.ok(!formattedForum.body.includes("Ending spoiler"));

  const summary = formatNotificationSummary([
    follow,
    forum,
    { id: 12, type: "AIRING", createdAt: 1_700_000_200, episode: 3 },
    { id: 13, type: "MEDIA_DELETION", createdAt: 1_700_000_300 },
  ]);
  assert.equal(summary.title, "Kioku — AniList");
  assert.match(summary.body, /^4 new AniList notifications, including /);
});

test("groups notifications into Today, Yesterday, This Week, and Earlier", () => {
  const now = new Date(2026, 4, 15, 14, 0, 0).getTime();
  const todaySec = Math.floor(new Date(2026, 4, 15, 9, 0, 0).getTime() / 1000);
  const yesterdaySec = Math.floor(
    new Date(2026, 4, 14, 18, 0, 0).getTime() / 1000,
  );
  const thisWeekSec = Math.floor(
    new Date(2026, 4, 10, 12, 0, 0).getTime() / 1000,
  );
  const earlierSec = Math.floor(
    new Date(2026, 4, 1, 12, 0, 0).getTime() / 1000,
  );

  assert.equal(getNotificationDateBucket(todaySec, now), "Today");
  assert.equal(getNotificationDateBucket(yesterdaySec, now), "Yesterday");
  assert.equal(getNotificationDateBucket(thisWeekSec, now), "This Week");
  assert.equal(getNotificationDateBucket(earlierSec, now), "Earlier");

  const items: NotificationItem[] = [
    { id: 4, type: "AIRING", createdAt: todaySec },
    { id: 3, type: "FOLLOWING", createdAt: yesterdaySec },
    { id: 2, type: "ACTIVITY_LIKE", createdAt: thisWeekSec },
    { id: 1, type: "MEDIA_DATA_CHANGE", createdAt: earlierSec },
  ];

  const groups = groupNotificationsByDate(items, now);
  assert.deepEqual(
    groups.map((g) => g.label),
    ["Today", "Yesterday", "This Week", "Earlier"],
  );
});

test("merges paginated items by id, filters new notifications, and validates external URLs", () => {
  const existing: NotificationItem[] = [
    { id: 50, type: "AIRING", createdAt: 100 },
    { id: 49, type: "FOLLOWING", createdAt: 90 },
  ];
  const incoming: NotificationItem[] = [
    { id: 49, type: "FOLLOWING", createdAt: 90 },
    { id: 48, type: "ACTIVITY_LIKE", createdAt: 80 },
  ];

  const merged = mergeNotificationsById(existing, incoming);
  assert.deepEqual(
    merged.map((i) => i.id),
    [50, 49, 48],
  );

  const unseen = filterNewNotifications(
    [
      { id: 52, type: "AIRING", createdAt: 120 },
      { id: 50, type: "AIRING", createdAt: 100 },
      { id: 55, type: "FOLLOWING", createdAt: 130 },
    ],
    50,
  );
  assert.deepEqual(
    unseen.map((i) => i.id),
    [55, 52],
  );
  assert.equal(getMaxNotificationId(unseen, 50), 55);

  assert.equal(
    getNotificationExternalUrl({
      id: 90,
      type: "ACTIVITY_REPLY",
      createdAt: 100,
      activityId: 777,
      activity: { id: 777, siteUrl: "javascript:alert(1)" },
    }),
    "https://anilist.co/activity/777",
  );
});
