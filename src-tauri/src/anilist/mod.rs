use crate::auth::AuthManager;
use crate::error::{AppError, Result};
use crate::models::{
    ActivityPage, ActivityReply, ActivityUnion, AiringSchedulePage, FuzzyDate, LikeToggleResult,
    Media, MediaListEntry, NotificationOption, NotificationPage, Page, Response,
    UnreadNotificationCount, UserOptions, Viewer,
};
use reqwest::{Client, StatusCode};
use serde::Deserialize;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::Manager;

const ANILIST_API_URL: &str = "https://graphql.anilist.co";

pub struct AniListState {
    pub client: Client,
    pub viewer_id: Mutex<Option<i32>>,
}

impl AniListState {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            viewer_id: Mutex::new(None),
        }
    }

    pub fn clear_viewer_id(&self) {
        if let Ok(mut guard) = self.viewer_id.lock() {
            *guard = None;
        }
    }
}

pub struct AniListClient {
    client: Client,
    app_handle: Arc<tauri::AppHandle>,
}

impl AniListClient {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        let client = app_handle
            .try_state::<AniListState>()
            .map(|state| state.client.clone())
            .unwrap_or_else(Client::new);
        Self {
            client,
            app_handle: Arc::new(app_handle),
        }
    }

    pub async fn get_viewer_id(&self) -> Result<i32> {
        if let Some(state) = self.app_handle.try_state::<AniListState>() {
            if let Ok(guard) = state.viewer_id.lock() {
                if let Some(id) = *guard {
                    return Ok(id);
                }
            }
        }

        let viewer = self.viewer().await?;
        if let Some(state) = self.app_handle.try_state::<AniListState>() {
            if let Ok(mut guard) = state.viewer_id.lock() {
                *guard = Some(viewer.id);
            }
        }
        Ok(viewer.id)
    }

    async fn get_auth_token(&self) -> Result<String> {
        let session = AuthManager::get_token(&self.app_handle)?
            .ok_or_else(|| AppError::Auth("Not authenticated".to_string()))?;
        Ok(session.access_token)
    }

    async fn execute_query<T: for<'de> Deserialize<'de>>(
        &self,
        query: &str,
        variables: Option<&serde_json::Value>,
    ) -> Result<T> {
        let token = self.get_auth_token().await.ok();
        let body = serde_json::json!({
            "query": query,
            "variables": variables
        });

        for attempt in 0..=1 {
            let mut request = self
                .client
                .post(ANILIST_API_URL)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .json(&body);

            if let Some(ref t) = token {
                request = request.header("Authorization", format!("Bearer {}", t));
            }

            let response = request.send().await?;
            let status = response.status();

            if let Some(remaining) = response
                .headers()
                .get("x-ratelimit-remaining")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<u32>().ok())
            {
                if remaining <= 10 {
                    eprintln!("AniList rate limit low: {} remaining", remaining);
                }
            }

            if status == StatusCode::TOO_MANY_REQUESTS {
                let retry_after = response
                    .headers()
                    .get("retry-after")
                    .and_then(|v| v.to_str().ok())
                    .and_then(|v| v.parse::<u64>().ok())
                    .unwrap_or(2)
                    .min(10);

                if attempt == 0 {
                    eprintln!("AniList 429 rate limit; retrying after {}s", retry_after);
                    tokio::time::sleep(Duration::from_secs(retry_after)).await;
                    continue;
                }

                return Err(AppError::AniList(format!(
                    "AniList rate limit reached. Please wait {} seconds and try again.",
                    retry_after
                )));
            }

            if !status.is_success() {
                let error_text = response
                    .text()
                    .await
                    .unwrap_or_else(|_| "Unable to read error".to_string());
                eprintln!("AniList API error response: {}", error_text);
                return Err(AppError::AniList(format!(
                    "API request failed with status: {} - {}",
                    status, error_text
                )));
            }

            let response_json: serde_json::Value = response.json().await?;

            if let Some(errors) = response_json.get("errors") {
                eprintln!("GraphQL errors: {}", errors);
                return Err(AppError::AniList(format!("GraphQL errors: {}", errors)));
            }

            return serde_json::from_value(response_json["data"].clone())
                .map_err(AppError::Serialization);
        }

        Err(AppError::AniList("AniList request failed".to_string()))
    }

    pub async fn viewer(&self) -> Result<Viewer> {
        const QUERY: &str = include_str!("../../graphql/viewer.graphql");

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "Viewer")]
            viewer: Viewer,
        }

        eprintln!("Fetching viewer data");
        let response: Response = self.execute_query(QUERY, None).await?;

        Ok(response.viewer)
    }

    pub async fn search_anime(
        &self,
        search: &str,
        page: Option<i32>,
        per_page: Option<i32>,
    ) -> Result<Page<Media>> {
        const QUERY: &str = include_str!("../../graphql/search_anime.graphql");

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "Page")]
            page: Page<Media>,
        }

        let variables = serde_json::json!({
            "search": search,
            "page": page.unwrap_or(1),
            "perPage": per_page.unwrap_or(20)
        });

        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.page)
    }

    pub async fn search_manga(
        &self,
        search: &str,
        page: Option<i32>,
        per_page: Option<i32>,
    ) -> Result<Page<Media>> {
        const QUERY: &str = include_str!("../../graphql/search_manga.graphql");

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "Page")]
            page: Page<Media>,
        }

        let variables = serde_json::json!({
            "search": search,
            "page": page.unwrap_or(1),
            "perPage": per_page.unwrap_or(20)
        });

        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.page)
    }
    //include_str!("../../graphql/.graphql");
    pub async fn anime(&self, id: i32) -> Result<Media> {
        const QUERY: &str = include_str!("../../graphql/anime.graphql");

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "Media")]
            media: Media,
        }

        let variables = serde_json::json!({ "id": id });
        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.media)
    }

    pub async fn manga(&self, id: i32) -> Result<Media> {
        const QUERY: &str = include_str!("../../graphql/manga.graphql");

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "Media")]
            media: Media,
        }

        let variables = serde_json::json!({ "id": id });
        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.media)
    }

    pub async fn airing_schedule(
        &self,
        start_time: i64,
        end_time: i64,
        page: Option<i32>,
    ) -> Result<AiringSchedulePage> {
        const QUERY: &str = include_str!("../../graphql/airing_schedules.graphql");

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "Page")]
            page: AiringSchedulePage,
        }

        let variables = serde_json::json!({
            "startTime": start_time,
            "endTime": end_time,
            "page": page.unwrap_or(1)
        });

        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        eprintln!("Fetched schedules: {:?}", response.page);
        Ok(response.page)
    }

    pub async fn user_list(
        &self,
        media_type: &str,
        status: Option<&str>,
    ) -> Result<Vec<MediaListEntry>> {
        let viewer_id = self.get_viewer_id().await?;

        // Map our status values to AniList enum values
        let anilist_status = match status {
            Some("CURRENT") => Some("CURRENT"),
            Some("COMPLETED") => Some("COMPLETED"),
            Some("PLANNING") => Some("PLANNING"),
            Some("PAUSED") => Some("PAUSED"),
            Some("DROPPED") => Some("DROPPED"),
            Some("REPEATING") => Some("REPEATING"),
            _ => None,
        };

        // Use the correct AniList GraphQL structure with user ID
        let query: &str = if anilist_status.is_some() {
            include_str!("../../graphql/user_list_1.graphql")
        } else {
            include_str!("../../graphql/user_list_2.graphql")
        };

        let mut variables = serde_json::json!({
            "userId": viewer_id,
            "type": media_type
        });
        if let Some(s) = anilist_status {
            variables["status"] = serde_json::json!(s);
        }

        eprintln!("Fetching user list with variables: {}", variables);
        let response: Response = self.execute_query(query, Some(&variables)).await?;

        // Flatten the list structure and convert to our MediaListEntry format
        let all_entries: Vec<MediaListEntry> = response
            .media_list_collection
            .lists
            .unwrap_or_default()
            .into_iter()
            .filter_map(|list| list.entries)
            .flatten()
            .map(|entry| MediaListEntry {
                id: entry.id,
                media_id: entry.media_id,
                status: entry.status,
                score: entry.score,
                progress: entry.progress,
                progress_volumes: entry.progress_volumes,
                repeat: entry.repeat,
                priority: None,
                notes: entry.notes,
                started_at: entry.started_at,
                completed_at: entry.completed_at,
                updated_at: entry.updated_at,
                created_at: None,
                media: entry.media,
            })
            .collect();

        Ok(all_entries)
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn update_entry_by_media(
        &self,
        media_id: i32,
        status: Option<&str>,
        score: Option<f64>,
        progress: Option<i32>,
        progress_volumes: Option<i32>,
        repeat: Option<i32>,
        notes_val: Option<&str>,
        started_at: Option<FuzzyDate>,
        completed_at: Option<FuzzyDate>,
    ) -> Result<MediaListEntry> {
        const QUERY: &str = include_str!("../../graphql/update_entry_by_media.graphql");

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "SaveMediaListEntry")]
            save_media_list_entry: MediaListEntry,
        }

        let mut variables = serde_json::json!({ "mediaId": media_id });
        if let Some(s) = status {
            variables["status"] = serde_json::Value::String(s.to_string());
        }
        if let Some(s) = score {
            variables["score"] = serde_json::json!(s);
        }
        if let Some(p) = progress {
            variables["progress"] = serde_json::json!(p);
        }
        if let Some(pv) = progress_volumes {
            variables["progressVolumes"] = serde_json::json!(pv);
        }
        if let Some(r) = repeat {
            variables["repeat"] = serde_json::json!(r);
        }
        if let Some(n) = notes_val {
            variables["notes"] = serde_json::Value::String(n.to_string());
        }
        if let Some(d) = started_at {
            variables["startedAt"] = serde_json::json!(d);
        }
        if let Some(d) = completed_at {
            variables["completedAt"] = serde_json::json!(d);
        }

        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.save_media_list_entry)
    }

    pub async fn trending_anime(
        &self,
        page: Option<i32>,
        per_page: Option<i32>,
    ) -> Result<Page<Media>> {
        const QUERY: &str = include_str!("../../graphql/trending_anime.graphql");

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "Page")]
            page: Page<Media>,
        }

        let variables = serde_json::json!({
            "page": page.unwrap_or(1),
            "perPage": per_page.unwrap_or(20)
        });

        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.page)
    }

    pub async fn popular_anime(
        &self,
        page: Option<i32>,
        per_page: Option<i32>,
    ) -> Result<Page<Media>> {
        const QUERY: &str = include_str!("../../graphql/popular_anime.graphql");

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "Page")]
            page: Page<Media>,
        }

        let variables = serde_json::json!({
            "page": page.unwrap_or(1),
            "perPage": per_page.unwrap_or(20)
        });

        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.page)
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn discover_media(
        &self,
        media_type: &str,
        search: Option<&str>,
        genre: Option<&str>,
        season_year: Option<i32>,
        season: Option<&str>,
        format: Option<&str>,
        status: Option<&str>,
        sort: Option<&str>,
        page: Option<i32>,
        per_page: Option<i32>,
    ) -> Result<Page<Media>> {
        const QUERY: &str = include_str!("../../graphql/discover_media.graphql");

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "Page")]
            page: Page<Media>,
        }

        let mut variables = serde_json::json!({
            "type": media_type,
            "page": page.unwrap_or(1),
            "perPage": per_page.unwrap_or(20),
        });

        if let Some(s) = search.filter(|v| !v.trim().is_empty()) {
            variables["search"] = serde_json::Value::String(s.to_string());
        }
        if let Some(g) = genre.filter(|v| !v.trim().is_empty()) {
            variables["genre"] = serde_json::Value::String(g.to_string());
        }
        if let Some(y) = season_year {
            variables["seasonYear"] = serde_json::json!(y);
        }
        if let Some(se) = season.filter(|v| !v.trim().is_empty()) {
            variables["season"] = serde_json::Value::String(se.to_string());
        }
        if let Some(f) = format.filter(|v| !v.trim().is_empty()) {
            variables["format"] = serde_json::Value::String(f.to_string());
        }
        if let Some(st) = status.filter(|v| !v.trim().is_empty()) {
            variables["status"] = serde_json::Value::String(st.to_string());
        }
        if let Some(so) = sort.filter(|v| !v.trim().is_empty()) {
            variables["sort"] = serde_json::json!([so]);
        }

        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.page)
    }

    pub async fn toggle_favourite(&self, media_id: i32, media_type: &str) -> Result<bool> {
        const QUERY: &str = include_str!("../../graphql/toggle_favourite.graphql");

        #[derive(Deserialize)]
        struct FavouritesPayload {
            anime: Option<FavouriteNodes>,
            manga: Option<FavouriteNodes>,
        }

        #[derive(Deserialize)]
        struct FavouriteNodes {
            nodes: Option<Vec<IdOnly>>,
        }

        #[derive(Deserialize)]
        struct IdOnly {
            id: i32,
        }

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "ToggleFavourite")]
            toggle_favourite: FavouritesPayload,
        }

        let variables = if media_type.eq_ignore_ascii_case("MANGA") {
            serde_json::json!({ "mangaId": media_id })
        } else {
            serde_json::json!({ "animeId": media_id })
        };

        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        let nodes = if media_type.eq_ignore_ascii_case("MANGA") {
            response.toggle_favourite.manga.and_then(|m| m.nodes)
        } else {
            response.toggle_favourite.anime.and_then(|a| a.nodes)
        };
        Ok(nodes.unwrap_or_default().iter().any(|n| n.id == media_id))
    }

    pub async fn delete_entry(&self, entry_id: i32) -> Result<bool> {
        const QUERY: &str = include_str!("../../graphql/delete_entry.graphql");

        #[derive(Deserialize)]
        struct DeleteResponse {
            deleted: bool,
        }

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "DeleteMediaListEntry")]
            delete_media_list_entry: DeleteResponse,
        }

        let variables = serde_json::json!({ "id": entry_id });
        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.delete_media_list_entry.deleted)
    }

    pub async fn user_activities(
        &self,
        scope: Option<&str>,
        type_in: Option<Vec<String>>,
        page: Option<i32>,
        per_page: Option<i32>,
    ) -> Result<ActivityPage> {
        const QUERY: &str = include_str!("../../graphql/user_activities.graphql");

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "Page")]
            page: ActivityPage,
        }

        let mut variables = serde_json::json!({
            "page": page.unwrap_or(1),
            "perPage": per_page.unwrap_or(20)
        });

        match scope.unwrap_or("personal") {
            "following" => {
                variables["isFollowing"] = serde_json::json!(true);
            }
            "global" => {}
            _ => {
                let viewer_id = self.get_viewer_id().await?;
                variables["userId"] = serde_json::json!(viewer_id);
            }
        }

        if let Some(types) = type_in.filter(|t| !t.is_empty()) {
            variables["typeIn"] = serde_json::json!(types);
        }

        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.page)
    }

    pub async fn activity_replies(
        &self,
        activity_id: i32,
        page: Option<i32>,
        per_page: Option<i32>,
    ) -> Result<Vec<ActivityReply>> {
        const QUERY: &str = include_str!("../../graphql/activity_replies.graphql");

        #[derive(Deserialize)]
        struct RepliesPage {
            #[serde(rename = "activityReplies")]
            activity_replies: Option<Vec<ActivityReply>>,
        }

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "Page")]
            page: RepliesPage,
        }

        let variables = serde_json::json!({
            "activityId": activity_id,
            "page": page.unwrap_or(1),
            "perPage": per_page.unwrap_or(25),
        });

        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.page.activity_replies.unwrap_or_default())
    }

    pub async fn toggle_like(&self, id: i32, like_type: &str) -> Result<LikeToggleResult> {
        const QUERY: &str = include_str!("../../graphql/toggle_like.graphql");

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "ToggleLikeV2")]
            toggle_like: LikeToggleResult,
        }

        let variables = serde_json::json!({
            "id": id,
            "type": like_type,
        });

        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.toggle_like)
    }

    pub async fn save_text_activity(&self, text: &str) -> Result<ActivityUnion> {
        const QUERY: &str = include_str!("../../graphql/save_text_activity.graphql");

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "SaveTextActivity")]
            save_text_activity: ActivityUnion,
        }

        let variables = serde_json::json!({ "text": text });
        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.save_text_activity)
    }

    pub async fn save_activity_reply(&self, activity_id: i32, text: &str) -> Result<ActivityReply> {
        const QUERY: &str = include_str!("../../graphql/save_activity_reply.graphql");

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "SaveActivityReply")]
            save_activity_reply: ActivityReply,
        }

        let variables = serde_json::json!({
            "activityId": activity_id,
            "text": text,
        });
        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.save_activity_reply)
    }

    pub async fn delete_activity(&self, id: i32) -> Result<bool> {
        const QUERY: &str = include_str!("../../graphql/delete_activity.graphql");

        #[derive(Deserialize)]
        struct DeletePayload {
            deleted: bool,
        }

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "DeleteActivity")]
            delete_activity: DeletePayload,
        }

        let variables = serde_json::json!({ "id": id });
        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.delete_activity.deleted)
    }

    pub async fn delete_activity_reply(&self, id: i32) -> Result<bool> {
        const QUERY: &str = include_str!("../../graphql/delete_activity_reply.graphql");

        #[derive(Deserialize)]
        struct DeletePayload {
            deleted: bool,
        }

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "DeleteActivityReply")]
            delete_activity_reply: DeletePayload,
        }

        let variables = serde_json::json!({ "id": id });
        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.delete_activity_reply.deleted)
    }

    pub async fn unread_notification_count(&self) -> Result<UnreadNotificationCount> {
        const QUERY: &str = include_str!("../../graphql/unread_notification_count.graphql");
        self.get_auth_token().await?;

        #[derive(Deserialize)]
        struct ViewerUnread {
            id: i32,
            #[serde(rename = "unreadNotificationCount", default)]
            unread_notification_count: Option<i32>,
        }

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "Viewer")]
            viewer: ViewerUnread,
        }

        let response: Response = self.execute_query(QUERY, None).await?;
        if let Some(state) = self.app_handle.try_state::<AniListState>() {
            if let Ok(mut guard) = state.viewer_id.lock() {
                *guard = Some(response.viewer.id);
            }
        }

        Ok(UnreadNotificationCount {
            viewer_id: response.viewer.id,
            unread_count: response.viewer.unread_notification_count.unwrap_or(0),
        })
    }

    pub async fn notifications(
        &self,
        type_in: Option<Vec<String>>,
        reset_notification_count: Option<bool>,
        page: Option<i32>,
        per_page: Option<i32>,
    ) -> Result<NotificationPage> {
        const QUERY: &str = include_str!("../../graphql/notifications.graphql");
        self.get_auth_token().await?;

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "Page")]
            page: NotificationPage,
        }

        let mut variables = serde_json::json!({
            "page": page.unwrap_or(1),
            "perPage": per_page.unwrap_or(25),
            "resetNotificationCount": reset_notification_count.unwrap_or(false),
        });

        if let Some(types) = type_in.filter(|t| !t.is_empty()) {
            variables["typeIn"] = serde_json::json!(types);
        }

        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.page)
    }

    pub async fn update_notification_options(
        &self,
        airing_notifications: Option<bool>,
        notification_options: Option<Vec<NotificationOption>>,
    ) -> Result<UserOptions> {
        const QUERY: &str = include_str!("../../graphql/update_notification_options.graphql");
        self.get_auth_token().await?;

        #[derive(Deserialize)]
        struct UpdateUserPayload {
            #[serde(default)]
            options: Option<UserOptions>,
        }

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "UpdateUser")]
            update_user: UpdateUserPayload,
        }

        let mut variables = serde_json::Map::new();
        if let Some(airing) = airing_notifications {
            variables.insert("airingNotifications".to_string(), serde_json::json!(airing));
        }
        if let Some(options) = notification_options {
            variables.insert(
                "notificationOptions".to_string(),
                serde_json::json!(options),
            );
        }

        let variables_value = serde_json::Value::Object(variables);
        let response: Response = self.execute_query(QUERY, Some(&variables_value)).await?;
        Ok(response.update_user.options.unwrap_or_default())
    }
}
