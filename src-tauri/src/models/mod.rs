use serde::{Deserialize, Deserializer, Serialize};

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
    #[serde(rename = "progressVolumes")]
    pub progress_volumes: Option<i32>,
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
    #[serde(rename = "isFavourite")]
    pub is_favourite: Option<bool>,
    #[serde(rename = "siteUrl")]
    pub site_url: Option<String>,
    #[serde(rename = "nextAiringEpisode")]
    pub next_airing_episode: Option<NextAiringEpisode>,
    pub relations: Option<MediaRelations>,
    pub characters: Option<CharacterConnection>,
    pub staff: Option<StaffConnection>,
    pub recommendations: Option<RecommendationConnection>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct NextAiringEpisode {
    #[serde(rename = "airingAt")]
    pub airing_at: i64,
    #[serde(rename = "timeUntilAiring")]
    pub time_until_airing: i64,
    pub episode: i32,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PersonName {
    pub full: Option<String>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PersonImage {
    pub large: Option<String>,
    pub medium: Option<String>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct CharacterNode {
    pub id: i32,
    pub name: Option<PersonName>,
    pub image: Option<PersonImage>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct VoiceActorNode {
    pub id: i32,
    pub name: Option<PersonName>,
    pub image: Option<PersonImage>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct CharacterEdge {
    pub role: Option<String>,
    pub node: Option<CharacterNode>,
    #[serde(rename = "voiceActors")]
    pub voice_actors: Option<Vec<VoiceActorNode>>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct CharacterConnection {
    pub edges: Option<Vec<CharacterEdge>>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct StaffNode {
    pub id: i32,
    pub name: Option<PersonName>,
    pub image: Option<PersonImage>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct StaffEdge {
    pub role: Option<String>,
    pub node: Option<StaffNode>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct StaffConnection {
    pub edges: Option<Vec<StaffEdge>>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct RecommendationMedia {
    pub id: i32,
    pub r#type: Option<String>,
    pub title: Title,
    #[serde(rename = "coverImage")]
    pub cover_image: CoverImage,
    pub format: Option<String>,
    #[serde(rename = "averageScore")]
    pub average_score: Option<i32>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct RecommendationNode {
    #[serde(rename = "mediaRecommendation")]
    pub media_recommendation: Option<RecommendationMedia>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct RecommendationConnection {
    pub nodes: Option<Vec<RecommendationNode>>,
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

#[derive(Deserialize)]
pub struct Response {
    #[serde(rename = "MediaListCollection")]
    pub media_list_collection: MediaListCollection,
}

/* -------------------------------------------------------------
ACTIVITY MODELS
------------------------------------------------------------- */

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityWrapper {
    pub id: i32,
    #[serde(rename = "userId")]
    pub user_id: Option<i32>,
    pub r#type: String,
    #[serde(rename = "replyCount")]
    pub reply_count: i32,
    pub text: Option<String>,
    pub status: Option<String>,
    pub progress: Option<String>,
    #[serde(rename = "siteUrl")]
    pub site_url: Option<String>,
    #[serde(rename = "isLocked")]
    pub is_locked: bool,
    #[serde(rename = "isSubscribed")]
    pub is_subscribed: bool,
    #[serde(rename = "likeCount")]
    pub like_count: i32,
    #[serde(rename = "isLiked")]
    pub is_liked: bool,
    #[serde(rename = "isPinned")]
    pub is_pinned: Option<bool>,
    #[serde(rename = "isPrivate")]
    pub is_private: Option<bool>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    pub user: Option<BasicUser>,
    #[serde(rename = "recipientId")]
    pub recipient_id: Option<i32>,
    #[serde(rename = "messengerId")]
    pub messenger_id: Option<i32>,
    pub media: Option<ActivityMedia>,
    #[serde(rename = "recipient")]
    pub recipient: Option<BasicUser>,
    #[serde(rename = "messenger")]
    pub messenger: Option<BasicUser>,
    pub replies: Option<Vec<ActivityReply>>,
    pub likes: Option<Vec<BasicUser>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(untagged)]
pub enum ActivityUnion {
    Text(TextActivity),
    List(ListActivity),
    Message(MessageActivity),
}

impl<'de> Deserialize<'de> for ActivityUnion {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let wrapper = ActivityWrapper::deserialize(deserializer)?;

        match wrapper.r#type.as_str() {
            "TEXT" => Ok(ActivityUnion::Text(TextActivity {
                id: wrapper.id,
                user_id: wrapper.user_id.unwrap_or(0),
                r#type: wrapper.r#type,
                reply_count: wrapper.reply_count,
                text: wrapper.text,
                site_url: wrapper.site_url,
                is_locked: wrapper.is_locked,
                is_subscribed: wrapper.is_subscribed,
                like_count: wrapper.like_count,
                is_liked: wrapper.is_liked,
                is_pinned: wrapper.is_pinned,
                created_at: wrapper.created_at,
                user: wrapper.user,
                replies: wrapper.replies,
                likes: wrapper.likes,
            })),
            "ANIME_LIST" | "MANGA_LIST" => Ok(ActivityUnion::List(ListActivity {
                id: wrapper.id,
                user_id: wrapper.user_id.unwrap_or(0),
                r#type: wrapper.r#type,
                reply_count: wrapper.reply_count,
                status: wrapper.status,
                progress: wrapper.progress,
                is_locked: wrapper.is_locked,
                is_subscribed: wrapper.is_subscribed,
                like_count: wrapper.like_count,
                is_liked: wrapper.is_liked,
                is_pinned: wrapper.is_pinned,
                site_url: wrapper.site_url,
                created_at: wrapper.created_at,
                media: wrapper.media,
                user: wrapper.user,
                replies: wrapper.replies,
                likes: wrapper.likes,
            })),
            "MESSAGE" => Ok(ActivityUnion::Message(MessageActivity {
                id: wrapper.id,
                recipient_id: wrapper.recipient_id,
                messenger_id: wrapper.messenger_id.unwrap_or(0),
                r#type: wrapper.r#type,
                reply_count: wrapper.reply_count,
                message: wrapper.text,
                site_url: wrapper.site_url,
                is_locked: wrapper.is_locked,
                is_subscribed: wrapper.is_subscribed,
                like_count: wrapper.like_count,
                is_liked: wrapper.is_liked,
                is_private: Some(wrapper.is_private.unwrap_or(false)),
                created_at: wrapper.created_at,
                recipient: wrapper.recipient,
                messenger: wrapper.messenger,
                replies: wrapper.replies,
                likes: wrapper.likes,
            })),
            _ => Err(serde::de::Error::custom(format!(
                "Unknown activity type: {}",
                wrapper.r#type
            ))),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextActivity {
    pub id: i32,
    #[serde(rename = "userId")]
    pub user_id: i32,
    pub r#type: String,
    #[serde(rename = "replyCount")]
    pub reply_count: i32,
    pub text: Option<String>,
    #[serde(rename = "siteUrl")]
    pub site_url: Option<String>,
    #[serde(rename = "isLocked")]
    pub is_locked: bool,
    #[serde(rename = "isSubscribed")]
    pub is_subscribed: bool,
    #[serde(rename = "likeCount")]
    pub like_count: i32,
    #[serde(rename = "isLiked")]
    pub is_liked: bool,
    #[serde(rename = "isPinned")]
    pub is_pinned: Option<bool>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    pub user: Option<BasicUser>,
    pub replies: Option<Vec<ActivityReply>>,
    pub likes: Option<Vec<BasicUser>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListActivity {
    pub id: i32,
    #[serde(rename = "userId")]
    pub user_id: i32,
    pub r#type: String,
    #[serde(rename = "replyCount")]
    pub reply_count: i32,
    pub status: Option<String>,
    pub progress: Option<String>,
    #[serde(rename = "isLocked")]
    pub is_locked: bool,
    #[serde(rename = "isSubscribed")]
    pub is_subscribed: bool,
    #[serde(rename = "likeCount")]
    pub like_count: i32,
    #[serde(rename = "isLiked")]
    pub is_liked: bool,
    #[serde(rename = "isPinned")]
    pub is_pinned: Option<bool>,
    #[serde(rename = "siteUrl")]
    pub site_url: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    pub media: Option<ActivityMedia>,
    pub user: Option<BasicUser>,
    pub replies: Option<Vec<ActivityReply>>,
    pub likes: Option<Vec<BasicUser>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageActivity {
    pub id: i32,
    #[serde(rename = "recipientId")]
    pub recipient_id: Option<i32>,
    #[serde(rename = "messengerId")]
    pub messenger_id: i32,
    pub r#type: String,
    #[serde(rename = "replyCount")]
    pub reply_count: i32,
    pub message: Option<String>,
    #[serde(rename = "siteUrl")]
    pub site_url: Option<String>,
    #[serde(rename = "isLocked")]
    pub is_locked: bool,
    #[serde(rename = "isSubscribed")]
    pub is_subscribed: bool,
    #[serde(rename = "likeCount")]
    pub like_count: i32,
    #[serde(rename = "isLiked")]
    pub is_liked: bool,
    #[serde(rename = "isPrivate")]
    pub is_private: Option<bool>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "recipient")]
    pub recipient: Option<BasicUser>,
    #[serde(rename = "messenger")]
    pub messenger: Option<BasicUser>,
    pub replies: Option<Vec<ActivityReply>>,
    pub likes: Option<Vec<BasicUser>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityReply {
    pub id: i32,
    #[serde(rename = "userId")]
    pub user_id: i32,
    #[serde(rename = "activityId")]
    pub activity_id: i32,
    pub text: Option<String>,
    #[serde(rename = "likeCount")]
    pub like_count: i32,
    #[serde(rename = "isLiked")]
    pub is_liked: bool,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    pub user: Option<BasicUser>,
    pub likes: Option<Vec<BasicUser>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BasicUser {
    pub id: i32,
    pub name: String,
    pub avatar: Option<Avatar>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityMedia {
    pub id: i32,
    pub title: Title,
    #[serde(rename = "coverImage")]
    pub cover_image: CoverImage,
    pub format: Option<String>,
    pub r#type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityPage {
    #[serde(rename = "pageInfo")]
    pub page_info: PageInfo,
    pub activities: Option<Vec<ActivityUnion>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LikeToggleResult {
    pub id: i32,
    #[serde(rename = "likeCount")]
    pub like_count: i32,
    #[serde(rename = "isLiked")]
    pub is_liked: bool,
}
