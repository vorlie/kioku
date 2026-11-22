export interface Title {
  romaji?: string;
  english?: string;
  native?: string;
  userPreferred?: string;
}

export interface CoverImage {
  extraLarge?: string;
  large?: string;
  medium?: string;
  color?: string;
}

export interface Studio {
  id: number;
  name: string;
  isAnimationStudio?: boolean;
}

export interface FuzzyDate {
  year?: number;
  month?: number;
  day?: number;
}

export interface MediaListEntry {
  id: number;
  mediaId: number;
  status?: string;
  score?: number;
  progress?: number;
  progressVolumes?: number;
  repeat?: number;
  priority?: number;
  notes?: string;
  startedAt?: FuzzyDate;
  completedAt?: FuzzyDate;
  updatedAt?: number;
  createdAt?: number;
  media?: Media;
}

export interface Media {
  id: number;
  title: Title;
  coverImage: CoverImage;
  bannerImage?: string;
  description?: string;
  episodes?: number;
  duration?: number;
  chapters?: number;
  volumes?: number;
  status?: string;
  genres?: string[];
  studios?: StudioConnection;
  season?: string;
  seasonYear?: number;
  averageScore?: number;
  meanScore?: number;
  format?: string;
  source?: string;
  countryOfOrigin?: string;
  isAdult?: boolean;
  isFavourite?: boolean;
  siteUrl?: string;
  nextAiringEpisode?: {
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
  };
  relations?: MediaRelationConnection;
  characters?: {
    edges?: {
      role?: string;
      node?: {
        id: number;
        name?: { full?: string };
        image?: { large?: string; medium?: string };
      };
      voiceActors?: {
        id: number;
        name?: { full?: string };
        image?: { large?: string; medium?: string };
      }[];
    }[];
  };
  staff?: {
    edges?: {
      role?: string;
      node?: {
        id: number;
        name?: { full?: string };
        image?: { large?: string; medium?: string };
      };
    }[];
  };
  recommendations?: {
    nodes?: {
      mediaRecommendation?: {
        id: number;
        type?: "ANIME" | "MANGA";
        title: Title;
        coverImage: CoverImage;
        format?: string;
        averageScore?: number;
      };
    }[];
  };
}

export interface MediaRelationEdge {
  relationType: string; // e.g., 'SEQUEL', 'PREQUEL', 'ADAPTATION', 'SIDE_STORY'
  node: RelatedMediaNode;
}

export interface MediaRelationConnection {
  edges?: MediaRelationEdge[];
}

export interface RelatedMediaNode {
  id: number;
  type: 'ANIME' | 'MANGA';
  title: Title;
  coverImage: CoverImage;
  status?: string;
  format?: string;
}

export interface StudioConnection {
  nodes?: Studio[];
}

export interface Avatar {
  large?: string;
  medium?: string;
}

export interface MediaListOptions {
  scoreFormat?: string;
}

export type UserStatisticsSort = 
  | 'ID' | 'ID_DESC' 
  | 'COUNT' | 'COUNT_DESC' 
  | 'PROGRESS' | 'PROGRESS_DESC' 
  | 'MEAN_SCORE' | 'MEAN_SCORE_DESC';

export interface BaseStatistic {
  count: number;
  meanScore: number;
  minutesWatched: number;
  chaptersRead: number;
  mediaIds: number[];
}

export interface AiringSchedule {
  id: number;
  airingAt: number;
  episode: number;
  media: RelatedMediaNode;
}

export interface UserFormatStatistic extends BaseStatistic { format: string; }
export interface UserStatusStatistic extends BaseStatistic { status: string; }
export interface UserScoreStatistic extends BaseStatistic { score: number; }
export interface UserLengthStatistic extends BaseStatistic { length: string; }
export interface UserReleaseYearStatistic extends BaseStatistic { releaseYear: number; }
export interface UserStartYearStatistic extends BaseStatistic { startYear: number; }
export interface UserGenreStatistic extends BaseStatistic { genre: string; }
export interface UserTagStatistic extends BaseStatistic { tag: { id: number; name: string }; }
export interface UserCountryStatistic extends BaseStatistic { country: string; }

export interface UserVoiceActorStatistic extends BaseStatistic {
  voiceActor: { id: number; name: { full: string }; image: { large: string } };
  characterIds: number[];
}

export interface UserStaffStatistic extends BaseStatistic {
  staff: { id: number; name: { full: string }; image: { large: string } };
}

export interface UserStudioStatistic extends BaseStatistic {
  studio: { id: number; name: string };
}

export interface UserStatistics {
  count: number;
  meanScore: number;
  standardDeviation: number;
  minutesWatched: number;
  episodesWatched: number;
  chaptersRead: number;
  volumesRead: number;
  formats: UserFormatStatistic[];
  statuses: UserStatusStatistic[];
  scores: UserScoreStatistic[];
  lengths: UserLengthStatistic[];
  releaseYears: UserReleaseYearStatistic[];
  startYears: UserStartYearStatistic[];
  genres: UserGenreStatistic[];
  tags: UserTagStatistic[];
  countries: UserCountryStatistic[];
  voiceActors: UserVoiceActorStatistic[];
  staff: UserStaffStatistic[];
  studios: UserStudioStatistic[];
}

export interface UserStatisticTypes  {
  anime?: UserStatistics;
  manga?: UserStatistics;
}

export interface FavouritesConnection {
  nodes?: Media[];
}

export interface UserFavouritesData {
  anime?: FavouritesConnection;
  manga?: FavouritesConnection;
}

export type NotificationType =
  | "ACTIVITY_MESSAGE"
  | "ACTIVITY_REPLY"
  | "FOLLOWING"
  | "ACTIVITY_MENTION"
  | "THREAD_COMMENT_MENTION"
  | "THREAD_SUBSCRIBED"
  | "THREAD_COMMENT_REPLY"
  | "AIRING"
  | "ACTIVITY_LIKE"
  | "ACTIVITY_REPLY_LIKE"
  | "THREAD_LIKE"
  | "THREAD_COMMENT_LIKE"
  | "ACTIVITY_REPLY_SUBSCRIBED"
  | "RELATED_MEDIA_ADDITION"
  | "MEDIA_DATA_CHANGE"
  | "MEDIA_MERGE"
  | "MEDIA_DELETION"
  | "MEDIA_SUBMISSION_UPDATE"
  | "STAFF_SUBMISSION_UPDATE"
  | "CHARACTER_SUBMISSION_UPDATE"
  | (string & {});

export type NotificationCategory =
  | "all"
  | "airing"
  | "activity"
  | "follows"
  | "forum"
  | "media";

export type DesktopNotificationCategory = Exclude<NotificationCategory, "all">;

export interface NotificationOption {
  type: NotificationType;
  enabled: boolean;
}

export interface UserOptions {
  airingNotifications?: boolean;
  notificationOptions?: NotificationOption[];
}

export interface UnreadNotificationCount {
  viewerId: number;
  unreadCount: number;
}

export interface Viewer {
  id: number;
  name: string;
  avatar?: Avatar;
  bannerImage?: string;
  unreadNotificationCount?: number;
  options?: UserOptions;
  mediaListOptions?: MediaListOptions;
  statistics?: UserStatisticTypes;
  favourites?: UserFavouritesData;
}

export interface PageInfo {
  total?: number;
  perPage?: number;
  currentPage?: number;
  lastPage?: number;
  hasNextPage?: boolean;
}

export interface Page<T> {
  pageInfo: PageInfo;
  media?: T[];
}

export interface BasicUser {
  id: number;
  name: string;
  avatar?: Avatar;
}

export interface ActivityMedia {
  id: number;
  title: Title;
  coverImage: CoverImage;
  format?: string;
  type: string;
}

export interface ActivityReply {
  id: number;
  userId: number;
  activityId: number;
  text?: string;
  likeCount: number;
  isLiked: boolean;
  createdAt: number;
  user?: BasicUser;
  likes?: BasicUser[];
}

export interface TextActivity {
  id: number;
  userId: number;
  type: string;
  replyCount: number;
  text?: string;
  siteUrl?: string;
  isLocked: boolean;
  isSubscribed: boolean;
  likeCount: number;
  isLiked: boolean;
  isPinned?: boolean;
  createdAt: number;
  user?: BasicUser;
  replies?: ActivityReply[];
  likes?: BasicUser[];
}

export interface ListActivity {
  id: number;
  userId: number;
  type: string;
  replyCount: number;
  status?: string;
  progress?: string;
  isLocked: boolean;
  isSubscribed: boolean;
  likeCount: number;
  isLiked: boolean;
  isPinned?: boolean;
  siteUrl?: string;
  createdAt: number;
  media?: ActivityMedia;
  user?: BasicUser;
  replies?: ActivityReply[];
  likes?: BasicUser[];
}

export interface MessageActivity {
  id: number;
  recipientId?: number;
  messengerId: number;
  type: string;
  replyCount: number;
  message?: string;
  siteUrl?: string;
  isLocked: boolean;
  isSubscribed: boolean;
  likeCount: number;
  isLiked: boolean;
  isPrivate?: boolean;
  createdAt: number;
  recipient?: BasicUser;
  messenger?: BasicUser;
  replies?: ActivityReply[];
  likes?: BasicUser[];
}

export type ActivityUnion = TextActivity | ListActivity | MessageActivity;

export interface ActivityPage {
  pageInfo: PageInfo;
  activities?: ActivityUnion[];
}

export interface NotificationUser {
  id: number;
  name: string;
  avatar?: Avatar;
  siteUrl?: string;
}

export interface NotificationMedia {
  id: number;
  type?: string;
  title?: Title;
  coverImage?: CoverImage;
  format?: string;
  siteUrl?: string;
}

export interface NotificationActivityPreview {
  id: number;
  type?: string;
  text?: string;
  message?: string;
  status?: string;
  progress?: string;
  siteUrl?: string;
  media?: NotificationMedia;
}

export interface NotificationThread {
  id: number;
  title?: string;
  siteUrl?: string;
}

export interface NotificationThreadComment {
  id: number;
  comment?: string;
  siteUrl?: string;
}

export interface NotificationPerson {
  id: number;
  name?: {
    full?: string;
    userPreferred?: string;
  };
  image?: {
    medium?: string;
    large?: string;
  };
  siteUrl?: string;
}

export interface NotificationItem {
  id: number;
  type: NotificationType;
  createdAt: number;
  context?: string;
  contexts?: string[];
  animeId?: number;
  episode?: number;
  userId?: number;
  activityId?: number;
  commentId?: number;
  threadId?: number;
  mediaId?: number;
  reason?: string;
  status?: string;
  notes?: string;
  submittedTitle?: string;
  deletedMediaTitle?: string;
  deletedMediaTitles?: string[];
  user?: NotificationUser;
  media?: NotificationMedia;
  activity?: NotificationActivityPreview;
  thread?: NotificationThread;
  comment?: NotificationThreadComment;
  staff?: NotificationPerson;
  character?: NotificationPerson;
}

export interface NotificationPage {
  pageInfo: PageInfo;
  notifications: NotificationItem[];
}
