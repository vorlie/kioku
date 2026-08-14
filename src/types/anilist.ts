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
  repeat?: number;
  priority?: string;
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
  siteUrl?: string;
  relations?: MediaRelationConnection;
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

export interface Viewer {
  id: number;
  name: string;
  avatar?: Avatar;
  bannerImage?: string;
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
