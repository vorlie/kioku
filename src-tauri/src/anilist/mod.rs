use crate::auth::AuthManager;
use crate::error::{AppError, Result};
use crate::models::{ActivityPage, ActivityUnion, AiringSchedulePage, Media, MediaListEntry, Page, Viewer};
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
        const QUERY: &str = r#"
            query {
                Viewer {
                    id
                    name
                    avatar {
                        large
                        medium
                    }
                    bannerImage
                    statistics {
                        anime {
                            count
                            episodesWatched
                            meanScore
                            minutesWatched
                            genres(limit: 12, sort: COUNT_DESC) { 
                                genre 
                                count 
                                meanScore 
                                minutesWatched 
                            }
                            studios(limit: 6, sort: COUNT_DESC) {
                                studio { id name }
                                count
                                meanScore
                            }
                            scores(sort: ID) {
                                score
                                count
                            }
                        }
                        manga {
                            count
                            chaptersRead
                            volumesRead
                            meanScore
                            genres(limit: 12, sort: COUNT_DESC) { 
                                genre 
                                count 
                                meanScore 
                            }
                        }
                    }
                    favourites { 
                        anime(page: 1, perPage: 8) { 
                            nodes { 
                                id
                                title {
                                    english
                                    romaji
                                    native
                                }
                                coverImage {
                                    large
                                    medium
                                }
                                bannerImage
                                format
                                status
                                seasonYear
                                averageScore
                            } 
                        }
                        manga(page: 1, perPage: 8) { 
                            nodes { 
                                id
                                title {
                                    english
                                    romaji
                                    native
                                }
                                coverImage {
                                    large
                                    medium
                                }
                                bannerImage
                                format
                                status
                                seasonYear
                                averageScore
                            } 
                        }
                    }
                }
            }
        "#;

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "Viewer")]
            viewer: Viewer,
        }

        eprintln!("Fetching viewer data");
        let response: Response = self.execute_query(QUERY, None).await?;
        //eprintln!("Fetched viewer data: {:?}", response.viewer);
        Ok(response.viewer)
    }

    pub async fn search_anime(&self, search: &str, page: Option<i32>, per_page: Option<i32>) -> Result<Page<Media>> {
        const QUERY: &str = r#"
            query($search: String, $page: Int, $perPage: Int) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo {
                        total
                        perPage
                        currentPage
                        lastPage
                        hasNextPage
                    }
                    media(search: $search, type: ANIME) {
                        id
                        title {
                            romaji
                            english
                            native
                            userPreferred
                        }
                        coverImage {
                            extraLarge
                            large
                            medium
                            color
                        }
                        bannerImage
                        description
                        episodes
                        duration
                        status
                        genres
                        studios {
                            nodes {
                                id
                                name
                                isAnimationStudio
                            }
                        }
                        season
                        seasonYear
                        averageScore
                        meanScore
                        format
                        source
                        countryOfOrigin
                        isAdult
                        siteUrl
                    }
                }
            }
        "#;

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
        const QUERY: &str = r#"
            query($search: String, $page: Int, $perPage: Int) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo {
                        total
                        perPage
                        currentPage
                        lastPage
                        hasNextPage
                    }
                    media(search: $search, type: MANGA) {
                        id
                        title {
                            romaji
                            english
                            native
                            userPreferred
                        }
                        coverImage {
                            extraLarge
                            large
                            medium
                            color
                        }
                        bannerImage
                        description
                        chapters
                        volumes
                        status
                        genres
                        averageScore
                        meanScore
                        format
                        source
                        countryOfOrigin
                        isAdult
                        siteUrl
                    }
                }
            }
        "#;

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

    pub async fn anime(&self, id: i32) -> Result<Media> {
        const QUERY: &str = r#"
            query($id: Int) {
                Media(id: $id, type: ANIME) {
                    id
                    title {
                        romaji
                        english
                        native
                        userPreferred
                    }
                    coverImage {
                        extraLarge
                        large
                        medium
                        color
                    }
                    bannerImage
                    description
                    episodes
                    duration
                    status
                    genres
                    studios {
                        nodes {
                            id
                            name
                            isAnimationStudio
                        }
                    }
                    season
                    seasonYear
                    averageScore
                    meanScore
                    format
                    source
                    countryOfOrigin
                    isAdult
                    siteUrl
                    relations {
                        edges {
                            relationType
                            node {
                                id
                                type
                                title {
                                    romaji
                                    english
                                    native
                                    userPreferred
                                }
                                coverImage {
                                    large
                                    medium
                                    color
                                }
                                status
                                format
                            }
                        }
                    }
                }
            }
        "#;

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
        const QUERY: &str = r#"
            query($id: Int) {
                Media(id: $id, type: MANGA) {
                    id
                    title {
                        romaji
                        english
                        native
                        userPreferred
                    }
                    coverImage {
                        extraLarge
                        large
                        medium
                        color
                    }
                    bannerImage
                    description
                    chapters
                    volumes
                    status
                    genres
                    averageScore
                    meanScore
                    format
                    source
                    countryOfOrigin
                    isAdult
                    siteUrl
                    relations {
                        edges {
                            relationType
                            node {
                                id
                                type
                                title {
                                    romaji
                                    english
                                    native
                                    userPreferred
                                }
                                coverImage {
                                    large
                                    medium
                                    color
                                }
                                status
                                format
                            }
                        }
                    }
                }
            }
        "#;

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
        const QUERY: &str = r#"
            query($startTime: Int, $endTime: Int, $page: Int) {
                Page(page: $page, perPage: 50) {
                    pageInfo {
                        total
                        perPage
                        currentPage
                        lastPage
                        hasNextPage
                    }
                    airingSchedules(airingAt_greater: $startTime, airingAt_lesser: $endTime, sort: TIME) {
                        id
                        airingAt
                        episode
                        mediaId
                        media {
                            id
                            type
                            title {
                                romaji
                                english
                                native
                                userPreferred
                            }
                            coverImage {
                                large
                                medium
                                color
                            }
                            
                            format
                        }
                    }
                }
            }
        "#;

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
        // First get the viewer ID
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
        let query = if anilist_status.is_some() {
            r#"
                query($userId: Int, $type: MediaType, $status: MediaListStatus) {
                    MediaListCollection(userId: $userId, type: $type, status: $status, sort: UPDATED_TIME_DESC) {
                        lists {
                            name
                            isCustomList
                            entries {
                                id
                                mediaId
                                status
                                score
                                progress
                                repeat
                                notes
                                updatedAt
                                media {
                                    id
                                    title {
                                        romaji
                                        english
                                        userPreferred
                                    }
                                    coverImage {
                                        large
                                        medium
                                    }
                                    episodes
                                    status
                                    averageScore
                                    format
                                }
                            }
                        }
                    }
                }
            "#
        } else {
            r#"
                query($userId: Int, $type: MediaType) {
                    MediaListCollection(userId: $userId, type: $type, sort: UPDATED_TIME_DESC) {
                        lists {
                            name
                            isCustomList
                            entries {
                                id
                                mediaId
                                status
                                score
                                progress
                                repeat
                                notes
                                updatedAt
                                media {
                                    id
                                    title {
                                        romaji
                                        english
                                        userPreferred
                                    }
                                    coverImage {
                                        large
                                        medium
                                    }
                                    episodes
                                    status
                                    averageScore
                                    format
                                }
                            }
                        }
                    }
                }
            "#
        };

        #[derive(Deserialize)]
        struct MediaListEntryWrapper {
            id: i32,
            #[serde(rename = "mediaId")]
            media_id: i32,
            status: Option<String>,
            score: Option<f64>,
            progress: Option<i32>,
            repeat: Option<i32>,
            notes: Option<String>,
            #[serde(rename = "updatedAt")]
            updated_at: Option<i64>,
            media: Option<Media>,
        }

        #[derive(Deserialize)]
        struct MediaList {
            entries: Option<Vec<MediaListEntryWrapper>>,
        }

        #[derive(Deserialize)]
        struct MediaListCollection {
            lists: Option<Vec<MediaList>>,
        }

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "MediaListCollection")]
            media_list_collection: MediaListCollection,
        }

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

    pub async fn update_entry(
        &self,
        entry_id: i32,
        status: Option<&str>,
        score: Option<f64>,
        progress: Option<i32>,
        notes_val: Option<&str>,
    ) -> Result<MediaListEntry> {
        const QUERY: &str = r#"
            mutation($id: Int, $status: MediaListStatus, $score: Float, $progress: Int, $notes: String) {
                SaveMediaListEntry(id: $id, status: $status, score: $score, progress: $progress, notes: $notes) {
                    id
                    mediaId
                    status
                    score
                    progress
                    repeat
                    priority
                    notes
                    startedAt {
                        year
                        month
                        day
                    }
                    completedAt {
                        year
                        month
                        day
                    }
                    updatedAt
                    createdAt
                    media {
                        id
                        title {
                            romaji
                            english
                            native
                            userPreferred
                        }
                        coverImage {
                            extraLarge
                            large
                            medium
                            color
                        }
                        episodes
                        chapters
                        volumes
                        status
                        genres
                        averageScore
                        meanScore
                        format
                        season
                        seasonYear
                    }
                }
            }
        "#;

        #[derive(Deserialize)]
        struct Response {
            #[serde(rename = "SaveMediaListEntry")]
            save_media_list_entry: MediaListEntry,
        }

        let mut variables = serde_json::json!({ "id": entry_id });
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

    pub async fn update_entry_by_media(
        &self,
        media_id: i32,
        status: Option<&str>,
        score: Option<f64>,
        progress: Option<i32>,
        notes_val: Option<&str>,
    ) -> Result<MediaListEntry> {
        const QUERY: &str = r#"
            mutation($mediaId: Int, $status: MediaListStatus, $score: Float, $progress: Int, $notes: String) {
                SaveMediaListEntry(mediaId: $mediaId, status: $status, score: $score, progress: $progress, notes: $notes) {
                    id
                    mediaId
                    status
                    score
                    progress
                    repeat
                    priority
                    notes
                    startedAt {
                        year
                        month
                        day
                    }
                    completedAt {
                        year
                        month
                        day
                    }
                    updatedAt
                    createdAt
                    media {
                        id
                        title {
                            romaji
                            english
                            native
                            userPreferred
                        }
                        coverImage {
                            extraLarge
                            large
                            medium
                            color
                        }
                        episodes
                        chapters
                        volumes
                        status
                        genres
                        averageScore
                        meanScore
                        format
                        season
                        seasonYear
                    }
                }
            }
        "#;

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
        const QUERY: &str = r#"
            query($page: Int, $perPage: Int) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo {
                        total
                        perPage
                        currentPage
                        lastPage
                        hasNextPage
                    }
                    media(type: ANIME, sort: TRENDING_DESC) {
                        id
                        title {
                            romaji
                            english
                            native
                            userPreferred
                        }
                        coverImage {
                            extraLarge
                            large
                            medium
                            color
                        }
                        bannerImage
                        description
                        episodes
                        duration
                        status
                        genres
                        averageScore
                        meanScore
                        format
                        season
                        seasonYear
                        studios {
                            nodes {
                                id
                                name
                                isAnimationStudio
                            }
                        }
                    }
                }
            }
        "#;

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
        const QUERY: &str = r#"
            query($page: Int, $perPage: Int) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo {
                        total
                        perPage
                        currentPage
                        lastPage
                        hasNextPage
                    }
                    media(type: ANIME, sort: POPULARITY_DESC) {
                        id
                        title {
                            romaji
                            english
                            native
                            userPreferred
                        }
                        coverImage {
                            extraLarge
                            large
                            medium
                            color
                        }
                        bannerImage
                        description
                        episodes
                        duration
                        status
                        genres
                        averageScore
                        meanScore
                        format
                        season
                        seasonYear
                        studios {
                            nodes {
                                id
                                name
                                isAnimationStudio
                            }
                        }
                    }
                }
            }
        "#;

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
        const QUERY: &str = r#"
            mutation($id: Int) {
                DeleteMediaListEntry(id: $id) {
                    deleted
                }
            }
        "#;

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

        const QUERY: &str = r#"
            query($userId: Int, $page: Int, $perPage: Int) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo {
                        total
                        perPage
                        currentPage
                        lastPage
                        hasNextPage
                    }
                    activities(userId: $userId, sort: ID_DESC) {
                        ... on TextActivity {
                            id
                            userId
                            type
                            replyCount
                            text
                            siteUrl
                            isLocked
                            isSubscribed
                            likeCount
                            isLiked
                            isPinned
                            createdAt
                            user {
                                id
                                name
                                avatar {
                                    large
                                    medium
                                }
                            }
                        }
                        ... on ListActivity {
                            id
                            userId
                            type
                            replyCount
                            status
                            progress
                            isLocked
                            isSubscribed
                            likeCount
                            isLiked
                            isPinned
                            siteUrl
                            createdAt
                            user {
                                id
                                name
                                avatar {
                                    large
                                    medium
                                }
                            }
                            media {
                                id
                                title {
                                    romaji
                                    english
                                    native
                                    userPreferred
                                }
                                coverImage {
                                    large
                                    medium
                                    color
                                }
                                type
                                format
                            }
                        }
                        ... on MessageActivity {
                            id
                            recipientId
                            messengerId
                            type
                            replyCount
                            message
                            siteUrl
                            isLocked
                            isSubscribed
                            likeCount
                            isLiked
                            isPrivate
                            createdAt
                            recipient {
                                id
                                name
                                avatar {
                                    large
                                    medium
                                }
                            }
                            messenger {
                                id
                                name
                                avatar {
                                    large
                                    medium
                                }
                            }
                        }
                    }
                }
            }
        "#;

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
