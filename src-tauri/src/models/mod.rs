use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Title {
    pub romaji: Option<String>,
    pub english: Option<String>,
    pub native: Option<String>,
    pub user_preferred: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoverImage {
    #[serde(rename = "extraLarge")]
    pub extra_large: Option<String>,
    pub large: Option<String>,
    pub medium: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Studio {
    pub id: i32,
    pub name: String,
    #[serde(rename = "isAnimationStudio")]
    pub is_animation_studio: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaListEntry {
    pub id: i32,
    #[serde(rename = "mediaId")]
    pub media_id: i32,
    pub status: Option<String>,
    pub score: Option<f64>,
    pub progress: Option<i32>,
    pub repeat: Option<i32>,
    pub priority: Option<String>,
    pub notes: Option<String>,
    #[serde(rename = "startedAt")]
    pub started_at: Option<FuzzyDate>,
    #[serde(rename = "completedAt")]
    pub completed_at: Option<FuzzyDate>,
    #[serde(rename = "updatedAt")]
    pub updated_at: Option<i64>,
    #[serde(rename = "createdAt")]
    pub created_at: Option<i64>,
    pub media: Option<Media>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FuzzyDate {
    pub year: Option<i32>,
    pub month: Option<i32>,
    pub day: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Media {
    pub id: i32,
    pub title: Title,
    #[serde(rename = "coverImage")]
    pub cover_image: CoverImage,
    #[serde(rename = "bannerImage")]
    pub banner_image: Option<String>,
    pub description: Option<String>,
    pub episodes: Option<i32>,
    pub duration: Option<i32>,
    pub chapters: Option<i32>,
    pub volumes: Option<i32>,
    pub status: Option<String>,
    pub genres: Option<Vec<String>>,
    pub studios: Option<StudioConnection>,
    pub season: Option<String>,
    #[serde(rename = "seasonYear")]
    pub season_year: Option<i32>,
    #[serde(rename = "averageScore")]
    pub average_score: Option<i32>,
    #[serde(rename = "meanScore")]
    pub mean_score: Option<i32>,
    pub format: Option<String>,
    pub source: Option<String>,
    #[serde(rename = "countryOfOrigin")]
    pub country_of_origin: Option<String>,
    #[serde(rename = "isAdult")]
    pub is_adult: Option<bool>,
    #[serde(rename = "siteUrl")]
    pub site_url: Option<String>,
    pub relations: Option<MediaRelations>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct MediaRelations {
    pub edges: Vec<RelationEdge>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct RelationEdge {
    #[serde(rename = "relationType")]
    pub relation_type: String, // e.g., "SEQUEL", "PREQUEL", "ADAPTATION"
    pub node: RelatedMediaNode,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct AiringSchedulePage {
    #[serde(rename = "pageInfo")]
    pub page_info: PageInfo,
    #[serde(rename = "airingSchedules")]
    pub airing_schedules: Vec<AiringSchedule>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct AiringSchedule {
    pub id: i32,
    #[serde(rename = "mediaId")]
    pub media_id: i32,
    #[serde(rename = "airingAt")]
    pub airing_at: i64, // Unix timestamp (seconds since epoch)
    pub episode: i32,
    pub media: RelatedMediaNode, // Reuses the lightweight node model
}


#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct RelatedMediaNode {
    pub id: i32,
    pub r#type: String, // "ANIME" or "MANGA"
    pub title: Title,
    #[serde(rename = "coverImage")]
    pub cover_image: CoverImage,
    pub status: Option<String>,
    pub format: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudioConnection {
    pub nodes: Option<Vec<Studio>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Favourites {
    pub anime: Option<MediaConnection>,
    pub manga: Option<MediaConnection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaConnection {
    pub nodes: Option<Vec<Media>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Viewer {
    pub id: i32,
    pub name: String,
    pub avatar: Option<Avatar>,
    #[serde(rename = "bannerImage")]
    pub banner_image: Option<String>,
    pub statistics: Option<UserStatistics>,
    pub favourites: Option<Favourites>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Avatar {
    pub large: Option<String>,
    pub medium: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct MediaListOptions {
    #[serde(rename = "scoreFormat")]
    pub score_format: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserStatistics {
    pub anime: Option<AnimeStatistics>,
    pub manga: Option<MangaStatistics>,
}

/* -------------------------------------------------------------
   UPDATED EXTENDED STATS FIELDS
   ------------------------------------------------------------- */

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimeStatistics {
    pub count: Option<i32>,
    #[serde(rename = "episodesWatched")]
    pub episodes_watched: Option<i32>,
    #[serde(rename = "meanScore")]
    pub mean_score: Option<f64>,
    #[serde(rename = "minutesWatched")]
    pub minutes_watched: Option<i32>,
    pub genres: Option<Vec<UserGenreStatistic>>,
    pub studios: Option<Vec<UserStudioStatistic>>,
    pub scores: Option<Vec<UserScoreStatistic>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MangaStatistics {
    pub count: Option<i32>,
    #[serde(rename = "chaptersRead")]
    pub chapters_read: Option<i32>,
    #[serde(rename = "volumesRead")]
    pub volumes_read: Option<i32>,
    #[serde(rename = "meanScore")]
    pub mean_score: Option<f64>,
    pub genres: Option<Vec<UserGenreStatistic>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserGenreStatistic {
    pub genre: Option<String>,
    pub count: Option<i32>,
    #[serde(rename = "meanScore")]
    pub mean_score: Option<f64>,
    #[serde(rename = "minutesWatched")]
    pub minutes_watched: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserStudioStatistic {
    pub studio: Option<StudioBaseInfo>,
    pub count: Option<i32>,
    #[serde(rename = "meanScore")]
    pub mean_score: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudioBaseInfo {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserScoreStatistic {
    pub score: Option<i32>,
    pub count: Option<i32>,
}

/* -------------------------------------------------------------
   CORE PAGE GENERICS
   ------------------------------------------------------------- */

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageInfo {
    pub total: Option<i32>,
    #[serde(rename = "perPage")]
    pub per_page: Option<i32>,
    #[serde(rename = "currentPage")]
    pub current_page: Option<i32>,
    #[serde(rename = "lastPage")]
    pub last_page: Option<i32>,
    #[serde(rename = "hasNextPage")]
    pub has_next_page: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Page<T> {
    #[serde(rename = "pageInfo")]
    pub page_info: PageInfo,
    pub media: Option<Vec<T>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct MediaList {
    pub entries: Option<Vec<MediaListEntry>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct MediaListCollection {
    pub lists: Option<Vec<MediaList>>,
}