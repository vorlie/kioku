use crate::auth::AuthManager;
use crate::error::{AppError, Result};
use crate::models::{ActivityPage, AiringSchedulePage, Media, MediaListEntry, Page, Response, Viewer};
use reqwest::Client;
use serde::Deserialize;
use std::sync::Arc;

const ANILIST_API_URL: &str = "https://graphql.anilist.co";

pub struct AniListClient {
    client: Client,
    app_handle: Arc<tauri::AppHandle>,
}

impl AniListClient {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        Self {
            client: Client::new(),
            app_handle: Arc::new(app_handle),
        }
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
        let mut request = self.client
            .post(ANILIST_API_URL)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .json(&serde_json::json!({
                "query": query,
                "variables": variables
            }));

        if let Ok(token) = self.get_auth_token().await {
            request = request.header("Authorization", format!("Bearer {}", token));
        }

        let response = request.send().await?;
        
        // Debug logging
        let status = response.status();
        eprintln!("AniList API request status: {}", status);
        
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unable to read error".to_string());
            eprintln!("AniList API error response: {}", error_text);
            return Err(AppError::AniList(format!(
                "API request failed with status: {} - {}",
                status,
                error_text
            )));
        }

        let response_json: serde_json::Value = response.json().await?;
        
        if let Some(errors) = response_json.get("errors") {
            eprintln!("GraphQL errors: {}", errors);
            return Err(AppError::AniList(format!(
                "GraphQL errors: {}",
                errors
            )));
        }

        serde_json::from_value(response_json["data"].clone())
            .map_err(|e| AppError::Serialization(e))
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

    pub async fn search_anime(&self, search: &str, page: Option<i32>, per_page: Option<i32>) -> Result<Page<Media>> {
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

    pub async fn search_manga(&self, search: &str, page: Option<i32>, per_page: Option<i32>) -> Result<Page<Media>> {
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

    pub async fn airing_schedule(&self, start_time: i64, end_time: i64, page: Option<i32>) -> Result<AiringSchedulePage> {
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

    pub async fn user_list(&self, media_type: &str, status: Option<&str>) -> Result<Vec<MediaListEntry>> {
        let viewer = self.viewer().await?;
        let viewer_id = viewer.id;

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
        let query:  &str  = if anilist_status.is_some() {
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
        let all_entries: Vec<MediaListEntry> = response.media_list_collection.lists
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
                repeat: entry.repeat,
                priority: None,
                notes: entry.notes,
                started_at: None,
                completed_at: None,
                updated_at: entry.updated_at,
                created_at: None,
                media: entry.media,
            })
            .collect();

        Ok(all_entries)
    }

    pub async fn update_entry_by_media(
        &self,
        media_id: i32,
        status: Option<&str>,
        score: Option<f64>,
        progress: Option<i32>,
        notes_val: Option<&str>,
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
        if let Some(n) = notes_val {
            variables["notes"] = serde_json::Value::String(n.to_string());
        }

        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        Ok(response.save_media_list_entry)
    }

    pub async fn trending_anime(&self, page: Option<i32>, per_page: Option<i32>) -> Result<Page<Media>> {
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

    pub async fn popular_anime(&self, page: Option<i32>, per_page: Option<i32>) -> Result<Page<Media>> {
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

    pub async fn user_activities(&self, page: Option<i32>, per_page: Option<i32>) -> Result<ActivityPage> {
        // First get the viewer ID
        let viewer = self.viewer().await?;
        let viewer_id = viewer.id;

        const QUERY: &str = include_str!("../../graphql/user_activities.graphql");

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "Page")]
            page: ActivityPage,
        }

        let variables = serde_json::json!({
            "userId": viewer_id,
            "page": page.unwrap_or(1),
            "perPage": per_page.unwrap_or(20)
        });

        eprintln!("Fetching activities for user ID: {}", viewer_id);
        let response: Response = self.execute_query(QUERY, Some(&variables)).await?;
        eprintln!("Fetched activities: {:?}", response.page);
        Ok(response.page)
    }
}
