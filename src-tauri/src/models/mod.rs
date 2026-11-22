use serde::{Deserialize, Deserializer, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Title {
    pub romaji: Option<String>,
    pub english: Option<String>,
    pub native: Option<String>,
    #[serde(rename = "userPreferred", alias = "user_preferred")]
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
    pub priority: Option<i32>,
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

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UserOptions {
    #[serde(rename = "airingNotifications", default)]
    pub airing_notifications: Option<bool>,
    #[serde(rename = "notificationOptions", default)]
    pub notification_options: Option<Vec<NotificationOption>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NotificationOption {
    #[serde(rename = "type")]
    pub r#type: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnreadNotificationCount {
    #[serde(rename = "viewerId")]
    pub viewer_id: i32,
    #[serde(rename = "unreadCount")]
    pub unread_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Viewer {
    pub id: i32,
    pub name: String,
    pub avatar: Option<Avatar>,
    #[serde(rename = "bannerImage")]
    pub banner_image: Option<String>,
    #[serde(rename = "unreadNotificationCount", default)]
    pub unread_notification_count: Option<i32>,
    #[serde(default)]
    pub options: Option<UserOptions>,
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

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
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

/* -------------------------------------------------------------
NOTIFICATION MODELS
------------------------------------------------------------- */

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationUser {
    pub id: i32,
    pub name: String,
    #[serde(default)]
    pub avatar: Option<Avatar>,
    #[serde(rename = "siteUrl", default)]
    pub site_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationMedia {
    pub id: i32,
    #[serde(rename = "type", default)]
    pub r#type: Option<String>,
    #[serde(default)]
    pub title: Option<Title>,
    #[serde(rename = "coverImage", default)]
    pub cover_image: Option<CoverImage>,
    #[serde(default)]
    pub format: Option<String>,
    #[serde(rename = "siteUrl", default)]
    pub site_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationActivityPreview {
    pub id: i32,
    #[serde(rename = "type", default)]
    pub r#type: Option<String>,
    #[serde(default)]
    pub text: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub progress: Option<String>,
    #[serde(rename = "siteUrl", default)]
    pub site_url: Option<String>,
    #[serde(default)]
    pub media: Option<NotificationMedia>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationThread {
    pub id: i32,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(rename = "siteUrl", default)]
    pub site_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationThreadComment {
    pub id: i32,
    #[serde(default)]
    pub comment: Option<String>,
    #[serde(rename = "siteUrl", default)]
    pub site_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationPersonName {
    #[serde(default)]
    pub full: Option<String>,
    #[serde(rename = "userPreferred", default)]
    pub user_preferred: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationPersonImage {
    #[serde(default)]
    pub medium: Option<String>,
    #[serde(default)]
    pub large: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationPerson {
    pub id: i32,
    #[serde(default)]
    pub name: Option<NotificationPersonName>,
    #[serde(default)]
    pub image: Option<NotificationPersonImage>,
    #[serde(rename = "siteUrl", default)]
    pub site_url: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct NotificationItem {
    pub id: i32,
    #[serde(rename = "type")]
    pub r#type: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    pub context: Option<String>,
    pub contexts: Option<Vec<String>>,
    #[serde(rename = "animeId")]
    pub anime_id: Option<i32>,
    pub episode: Option<i32>,
    #[serde(rename = "userId")]
    pub user_id: Option<i32>,
    #[serde(rename = "activityId")]
    pub activity_id: Option<i32>,
    #[serde(rename = "commentId")]
    pub comment_id: Option<i32>,
    #[serde(rename = "threadId")]
    pub thread_id: Option<i32>,
    #[serde(rename = "mediaId")]
    pub media_id: Option<i32>,
    pub reason: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
    #[serde(rename = "submittedTitle")]
    pub submitted_title: Option<String>,
    #[serde(rename = "deletedMediaTitle")]
    pub deleted_media_title: Option<String>,
    #[serde(rename = "deletedMediaTitles")]
    pub deleted_media_titles: Option<Vec<String>>,
    pub user: Option<NotificationUser>,
    pub media: Option<NotificationMedia>,
    pub activity: Option<NotificationActivityPreview>,
    pub thread: Option<NotificationThread>,
    pub comment: Option<NotificationThreadComment>,
    pub staff: Option<NotificationPerson>,
    pub character: Option<NotificationPerson>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
struct NotificationWrapper {
    pub id: Option<i32>,
    #[serde(rename = "type")]
    pub r#type: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: Option<i64>,
    pub context: Option<String>,
    pub contexts: Option<Vec<Option<String>>>,
    #[serde(rename = "animeId")]
    pub anime_id: Option<i32>,
    pub episode: Option<i32>,
    #[serde(rename = "userId")]
    pub user_id: Option<i32>,
    #[serde(rename = "activityId")]
    pub activity_id: Option<i32>,
    #[serde(rename = "commentId")]
    pub comment_id: Option<i32>,
    #[serde(rename = "threadId")]
    pub thread_id: Option<i32>,
    #[serde(rename = "mediaId")]
    pub media_id: Option<i32>,
    pub reason: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
    #[serde(rename = "submittedTitle")]
    pub submitted_title: Option<String>,
    #[serde(rename = "deletedMediaTitle")]
    pub deleted_media_title: Option<String>,
    #[serde(rename = "deletedMediaTitles")]
    pub deleted_media_titles: Option<Vec<Option<String>>>,
    pub user: Option<NotificationUser>,
    pub media: Option<NotificationMedia>,
    pub activity: Option<NotificationActivityPreview>,
    pub message: Option<NotificationActivityPreview>,
    pub thread: Option<NotificationThread>,
    pub comment: Option<NotificationThreadComment>,
    pub staff: Option<NotificationPerson>,
    pub character: Option<NotificationPerson>,
}

impl From<NotificationWrapper> for Option<NotificationItem> {
    fn from(wrapper: NotificationWrapper) -> Self {
        let id = wrapper.id?;
        let contexts = wrapper
            .contexts
            .map(|items| items.into_iter().flatten().collect());
        let deleted_media_titles = wrapper
            .deleted_media_titles
            .map(|items| items.into_iter().flatten().collect());

        Some(NotificationItem {
            id,
            r#type: wrapper.r#type.unwrap_or_else(|| "UNKNOWN".to_string()),
            created_at: wrapper.created_at.unwrap_or(0),
            context: wrapper.context,
            contexts,
            anime_id: wrapper.anime_id,
            episode: wrapper.episode,
            user_id: wrapper.user_id,
            activity_id: wrapper.activity_id,
            comment_id: wrapper.comment_id,
            thread_id: wrapper.thread_id,
            media_id: wrapper.media_id,
            reason: wrapper.reason,
            status: wrapper.status,
            notes: wrapper.notes,
            submitted_title: wrapper.submitted_title,
            deleted_media_title: wrapper.deleted_media_title,
            deleted_media_titles,
            user: wrapper.user,
            media: wrapper.media,
            activity: wrapper.activity.or(wrapper.message),
            thread: wrapper.thread,
            comment: wrapper.comment,
            staff: wrapper.staff,
            character: wrapper.character,
        })
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct NotificationPage {
    #[serde(rename = "pageInfo")]
    pub page_info: PageInfo,
    pub notifications: Vec<NotificationItem>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
struct NotificationPageRaw {
    #[serde(rename = "pageInfo")]
    page_info: Option<PageInfo>,
    notifications: Option<Vec<Option<NotificationWrapper>>>,
}

impl<'de> Deserialize<'de> for NotificationPage {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let raw = NotificationPageRaw::deserialize(deserializer)?;
        let notifications = raw
            .notifications
            .unwrap_or_default()
            .into_iter()
            .flatten()
            .filter_map(Option::<NotificationItem>::from)
            .collect();

        Ok(NotificationPage {
            page_info: raw.page_info.unwrap_or_default(),
            notifications,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserializes_all_notification_shapes_and_tolerates_nulls_and_unknown_types() {
        let payload = serde_json::json!({
            "pageInfo": {
                "total": 10,
                "perPage": 25,
                "currentPage": 1,
                "lastPage": 1,
                "hasNextPage": false
            },
            "notifications": [
                null,
                {
                    "id": 101,
                    "type": "AIRING",
                    "animeId": 21,
                    "episode": 7,
                    "contexts": ["Episode ", " of ", null, " aired."],
                    "createdAt": 1700000100,
                    "media": {
                        "id": 21,
                        "type": "ANIME",
                        "title": {
                            "userPreferred": "Frieren",
                            "english": "Frieren: Beyond Journey's End",
                            "romaji": "Sousou no Frieren",
                            "native": "葬送のフリーレン"
                        },
                        "coverImage": {
                            "medium": "https://img.example/m.jpg",
                            "large": "https://img.example/l.jpg",
                            "color": "#5ab8ff"
                        },
                        "format": "TV",
                        "siteUrl": "https://anilist.co/anime/21"
                    }
                },
                {
                    "id": 102,
                    "type": "ACTIVITY_MESSAGE",
                    "userId": 42,
                    "activityId": 9901,
                    "context": " sent you a message.",
                    "createdAt": 1700000200,
                    "user": {
                        "id": 42,
                        "name": "Himmel",
                        "avatar": { "medium": "https://img.example/u.jpg" },
                        "siteUrl": "https://anilist.co/user/Himmel"
                    },
                    "message": {
                        "id": 9901,
                        "type": "MESSAGE",
                        "message": "Watch tonight?",
                        "siteUrl": "https://anilist.co/activity/9901"
                    }
                },
                {
                    "id": 103,
                    "type": "ACTIVITY_REPLY",
                    "userId": 43,
                    "activityId": 9902,
                    "context": " replied to your activity.",
                    "createdAt": 1700000300,
                    "user": {
                        "id": 43,
                        "name": "Fern"
                    },
                    "activity": {
                        "id": 9902,
                        "type": "ANIME_LIST",
                        "status": "watched episode",
                        "progress": "7",
                        "siteUrl": "https://anilist.co/activity/9902",
                        "media": {
                            "id": 21,
                            "type": "ANIME",
                            "title": { "userPreferred": "Frieren" }
                        }
                    }
                },
                {
                    "id": 104,
                    "type": "ACTIVITY_MENTION",
                    "userId": 44,
                    "activityId": 9903,
                    "context": " mentioned you in their activity.",
                    "createdAt": 1700000350,
                    "user": null,
                    "activity": {
                        "id": 9903,
                        "type": "TEXT",
                        "text": "Hey @user check this out",
                        "siteUrl": "https://anilist.co/activity/9903"
                    }
                },
                {
                    "id": 105,
                    "type": "THREAD_COMMENT_MENTION",
                    "userId": 45,
                    "commentId": 8801,
                    "context": " mentioned you, in a forum comment.",
                    "createdAt": 1700000400,
                    "user": { "id": 45, "name": "Stark" },
                    "thread": {
                        "id": 77,
                        "title": "Seasonal Episode 7 Discussion",
                        "siteUrl": "https://anilist.co/forum/thread/77"
                    },
                    "comment": {
                        "id": 8801,
                        "comment": "Great animation in ep 7!",
                        "siteUrl": "https://anilist.co/forum/thread/77/comment/8801"
                    }
                },
                {
                    "id": 106,
                    "type": "THREAD_LIKE",
                    "userId": 46,
                    "threadId": 77,
                    "context": " liked your thread.",
                    "createdAt": 1700000450,
                    "thread": { "id": 77, "title": "Discussion" }
                },
                {
                    "id": 107,
                    "type": "MEDIA_MERGE",
                    "mediaId": 300,
                    "deletedMediaTitles": ["Old Duplicate", null],
                    "context": " has been merged into ",
                    "reason": "Duplicate entry",
                    "createdAt": 1700000500,
                    "media": null
                },
                {
                    "id": 108,
                    "type": "MEDIA_DELETION",
                    "deletedMediaTitle": "Removed Title",
                    "context": " was deleted from the site.",
                    "reason": "Did not meet guidelines",
                    "createdAt": 1700000550
                },
                {
                    "id": 109,
                    "type": "MEDIA_SUBMISSION_UPDATE",
                    "contexts": ["Your submission for ", " was accepted."],
                    "status": "ACCEPTED",
                    "notes": "Thanks for contributing",
                    "submittedTitle": "Fallback Title",
                    "createdAt": 1700000600,
                    "media": null
                },
                {
                    "id": 110,
                    "type": "STAFF_SUBMISSION_UPDATE",
                    "contexts": ["Your staff submission was rejected."],
                    "status": "REJECTED",
                    "notes": "Duplicate",
                    "createdAt": 1700000650,
                    "staff": {
                        "id": 95001,
                        "name": { "full": "Keiichiro Saito", "userPreferred": "Keiichiro Saito" },
                        "image": { "medium": "https://img.example/s.jpg" },
                        "siteUrl": "https://anilist.co/staff/95001"
                    }
                },
                {
                    "id": 111,
                    "type": "CHARACTER_SUBMISSION_UPDATE",
                    "contexts": ["Your character submission was accepted."],
                    "status": "ACCEPTED",
                    "createdAt": 1700000700,
                    "character": {
                        "id": 176754,
                        "name": { "full": "Frieren" },
                        "image": { "large": "https://img.example/c.jpg" },
                        "siteUrl": "https://anilist.co/character/176754"
                    }
                },
                {
                    "id": 112,
                    "type": "FUTURE_NEW_ANILIST_TYPE",
                    "createdAt": 1700000800,
                    "unknownNestedObject": { "foo": "bar" }
                },
                {
                    "type": "AIRING"
                }
            ]
        });

        let page: NotificationPage =
            serde_json::from_value(payload).expect("notification page should deserialize");

        // null row and id-less row should be skipped safely (14 entries -> 12 valid)
        assert_eq!(page.notifications.len(), 12);

        let airing = &page.notifications[0];
        assert_eq!(airing.r#type, "AIRING");
        assert_eq!(airing.episode, Some(7));
        assert_eq!(
            airing.contexts.as_ref().map(|c| c.len()),
            Some(3),
            "null elements inside contexts should be stripped"
        );
        let serialized_media = serde_json::to_value(&airing.media).unwrap();
        assert_eq!(serialized_media["title"]["userPreferred"], "Frieren");

        let msg = &page.notifications[1];
        assert_eq!(msg.r#type, "ACTIVITY_MESSAGE");
        assert_eq!(
            msg.activity.as_ref().and_then(|a| a.message.as_deref()),
            Some("Watch tonight?")
        );

        let reply = &page.notifications[2];
        assert_eq!(
            reply
                .activity
                .as_ref()
                .and_then(|a| a.media.as_ref())
                .map(|m| m.id),
            Some(21)
        );

        let mention = &page.notifications[3];
        assert!(mention.user.is_none());
        assert_eq!(
            mention.activity.as_ref().and_then(|a| a.text.as_deref()),
            Some("Hey @user check this out")
        );

        let forum_mention = &page.notifications[4];
        assert_eq!(
            forum_mention
                .thread
                .as_ref()
                .and_then(|t| t.title.as_deref()),
            Some("Seasonal Episode 7 Discussion")
        );
        assert_eq!(
            forum_mention
                .comment
                .as_ref()
                .and_then(|c| c.comment.as_deref()),
            Some("Great animation in ep 7!")
        );

        let thread_like = &page.notifications[5];
        assert_eq!(thread_like.thread_id, Some(77));

        let merge = &page.notifications[6];
        assert_eq!(
            merge.deleted_media_titles,
            Some(vec!["Old Duplicate".to_string()])
        );

        let deletion = &page.notifications[7];
        assert_eq!(
            deletion.deleted_media_title.as_deref(),
            Some("Removed Title")
        );

        let sub_media = &page.notifications[8];
        assert_eq!(sub_media.submitted_title.as_deref(), Some("Fallback Title"));

        let sub_staff = &page.notifications[9];
        assert_eq!(
            sub_staff
                .staff
                .as_ref()
                .and_then(|s| s.name.as_ref())
                .and_then(|n| n.full.as_deref()),
            Some("Keiichiro Saito")
        );

        let sub_char = &page.notifications[10];
        assert_eq!(sub_char.character.as_ref().map(|c| c.id), Some(176754));

        let future = &page.notifications[11];
        assert_eq!(future.r#type, "FUTURE_NEW_ANILIST_TYPE");
    }

    #[test]
    fn deserializes_viewer_options_and_unread_count() {
        let viewer_json = serde_json::json!({
            "id": 7,
            "name": "KiokuUser",
            "unreadNotificationCount": 14,
            "options": {
                "airingNotifications": true,
                "notificationOptions": [
                    { "type": "ACTIVITY_REPLY", "enabled": true },
                    { "type": "FOLLOWING", "enabled": false }
                ]
            }
        });

        let viewer: Viewer = serde_json::from_value(viewer_json).unwrap();
        assert_eq!(viewer.unread_notification_count, Some(14));
        let options = viewer.options.unwrap();
        assert_eq!(options.airing_notifications, Some(true));
        let items = options.notification_options.unwrap();
        assert_eq!(items.len(), 2);
        assert_eq!(
            items[1],
            NotificationOption {
                r#type: "FOLLOWING".to_string(),
                enabled: false
            }
        );
    }
}
