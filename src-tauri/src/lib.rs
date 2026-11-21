mod anilist;
mod auth;
mod auth_server;
mod error;
mod models;
mod playback;

use anilist::{AniListClient, AniListState};
use auth::AuthManager;
use auth_server::AuthServer;
use models::{
    ActivityPage, ActivityReply, ActivityUnion, AiringSchedulePage, LikeToggleResult, Media,
    MediaListEntry, NotificationOption, NotificationPage, Page, UnreadNotificationCount,
    UserOptions, Viewer,
};
use std::sync::Mutex;
use tauri::Manager;

// Global state for auth server
struct AuthServerState(Mutex<Option<AuthServer>>);

#[tauri::command]
async fn start_auth_server(
    state: tauri::State<'_, AuthServerState>,
) -> Result<String, error::AppError> {
    eprintln!("start_auth_server command called");
    let mut auth_state = state.0.lock().unwrap();
    let mut server = AuthServer::new();
    eprintln!("Creating new AuthServer");
    let auth_url = server.start().map_err(|e| {
        eprintln!("AuthServer::start failed: {}", e);
        error::AppError::Auth(e)
    })?;
    eprintln!("AuthServer started successfully, URL: {}", auth_url);
    *auth_state = Some(server);
    Ok(auth_url)
}

#[tauri::command]
async fn check_auth_token(
    state: tauri::State<'_, AuthServerState>,
) -> Result<Option<String>, error::AppError> {
    let auth_state = state.0.lock().unwrap();
    if let Some(ref server) = *auth_state {
        Ok(server.get_token())
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn stop_auth_server(state: tauri::State<'_, AuthServerState>) -> Result<(), error::AppError> {
    let mut auth_state = state.0.lock().unwrap();
    if let Some(ref mut server) = *auth_state {
        server.stop();
    }
    *auth_state = None;
    Ok(())
}

#[tauri::command]
async fn login(app: tauri::AppHandle, access_token: String) -> Result<(), error::AppError> {
    eprintln!(
        "Login command called with token length: {}",
        access_token.len()
    );

    let session = auth::AniListSession {
        access_token,
        token_type: "Bearer".to_string(),
        expires_in: None,
    };

    AuthManager::store_token(&app, session)?;
    if let Some(state) = app.try_state::<AniListState>() {
        state.clear_viewer_id();
    }
    eprintln!("Login successful");
    Ok(())
}

#[tauri::command]
async fn logout(app: tauri::AppHandle) -> Result<(), error::AppError> {
    AuthManager::clear_token(&app)?;
    if let Some(state) = app.try_state::<AniListState>() {
        state.clear_viewer_id();
    }
    Ok(())
}

#[tauri::command]
async fn is_authenticated(app: tauri::AppHandle) -> Result<bool, error::AppError> {
    Ok(AuthManager::is_authenticated(&app))
}

#[tauri::command]
async fn get_viewer(app: tauri::AppHandle) -> Result<Viewer, error::AppError> {
    let client = AniListClient::new(app);
    client.viewer().await
}

#[tauri::command]
async fn search_anime(
    app: tauri::AppHandle,
    search: String,
    page: Option<i32>,
    per_page: Option<i32>,
) -> Result<Page<Media>, error::AppError> {
    let client = AniListClient::new(app);
    client.search_anime(&search, page, per_page).await
}

#[tauri::command]
async fn search_manga(
    app: tauri::AppHandle,
    search: String,
    page: Option<i32>,
    per_page: Option<i32>,
) -> Result<Page<Media>, error::AppError> {
    let client = AniListClient::new(app);
    client.search_manga(&search, page, per_page).await
}

#[tauri::command]
async fn get_anime(app: tauri::AppHandle, id: i32) -> Result<Media, error::AppError> {
    let client = AniListClient::new(app);
    client.anime(id).await
}

#[tauri::command]
async fn get_manga(app: tauri::AppHandle, id: i32) -> Result<Media, error::AppError> {
    let client = AniListClient::new(app);
    client.manga(id).await
}

#[tauri::command]
async fn get_user_list(
    app: tauri::AppHandle,
    media_type: String,
    status: Option<String>,
) -> Result<Vec<MediaListEntry>, error::AppError> {
    let client = AniListClient::new(app);
    client.user_list(&media_type, status.as_deref()).await
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
async fn update_entry(
    app: tauri::AppHandle,
    media_id: i32,
    status: Option<String>,
    score: Option<f64>,
    progress: Option<i32>,
    progress_volumes: Option<i32>,
    repeat: Option<i32>,
    notes: Option<String>,
    started_at: Option<models::FuzzyDate>,
    completed_at: Option<models::FuzzyDate>,
) -> Result<MediaListEntry, error::AppError> {
    let client = AniListClient::new(app);
    client
        .update_entry_by_media(
            media_id,
            status.as_deref(),
            score,
            progress,
            progress_volumes,
            repeat,
            notes.as_deref(),
            started_at,
            completed_at,
        )
        .await
}

#[tauri::command]
async fn delete_entry(app: tauri::AppHandle, entry_id: i32) -> Result<bool, error::AppError> {
    let client = AniListClient::new(app);
    client.delete_entry(entry_id).await
}

#[tauri::command]
async fn trending_anime(
    app: tauri::AppHandle,
    page: Option<i32>,
    per_page: Option<i32>,
) -> Result<Page<Media>, error::AppError> {
    let client = AniListClient::new(app);
    client.trending_anime(page, per_page).await
}

#[tauri::command]
async fn fetch_airing_calendar(
    app: tauri::AppHandle,
    start_time: i64,
    end_time: i64,
    page: Option<i32>,
) -> Result<AiringSchedulePage, error::AppError> {
    let client = AniListClient::new(app);
    client.airing_schedule(start_time, end_time, page).await
}

#[tauri::command]
async fn popular_anime(
    app: tauri::AppHandle,
    page: Option<i32>,
    per_page: Option<i32>,
) -> Result<Page<Media>, error::AppError> {
    let client = AniListClient::new(app);
    client.popular_anime(page, per_page).await
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
async fn discover_media(
    app: tauri::AppHandle,
    media_type: String,
    search: Option<String>,
    genre: Option<String>,
    season_year: Option<i32>,
    season: Option<String>,
    format: Option<String>,
    status: Option<String>,
    sort: Option<String>,
    page: Option<i32>,
    per_page: Option<i32>,
) -> Result<Page<Media>, error::AppError> {
    let client = AniListClient::new(app);
    client
        .discover_media(
            &media_type,
            search.as_deref(),
            genre.as_deref(),
            season_year,
            season.as_deref(),
            format.as_deref(),
            status.as_deref(),
            sort.as_deref(),
            page,
            per_page,
        )
        .await
}

#[tauri::command]
async fn toggle_favourite(
    app: tauri::AppHandle,
    media_id: i32,
    media_type: String,
) -> Result<bool, error::AppError> {
    let client = AniListClient::new(app);
    client.toggle_favourite(media_id, &media_type).await
}

#[tauri::command]
async fn get_user_activities(
    app: tauri::AppHandle,
    scope: Option<String>,
    type_in: Option<Vec<String>>,
    page: Option<i32>,
    per_page: Option<i32>,
) -> Result<ActivityPage, error::AppError> {
    let client = AniListClient::new(app);
    client
        .user_activities(scope.as_deref(), type_in, page, per_page)
        .await
}

#[tauri::command]
async fn get_activity_replies(
    app: tauri::AppHandle,
    activity_id: i32,
    page: Option<i32>,
    per_page: Option<i32>,
) -> Result<Vec<ActivityReply>, error::AppError> {
    let client = AniListClient::new(app);
    client.activity_replies(activity_id, page, per_page).await
}

#[tauri::command]
async fn toggle_like(
    app: tauri::AppHandle,
    id: i32,
    like_type: String,
) -> Result<LikeToggleResult, error::AppError> {
    let client = AniListClient::new(app);
    client.toggle_like(id, &like_type).await
}

#[tauri::command]
async fn save_text_activity(
    app: tauri::AppHandle,
    text: String,
) -> Result<ActivityUnion, error::AppError> {
    let client = AniListClient::new(app);
    client.save_text_activity(&text).await
}

#[tauri::command]
async fn save_activity_reply(
    app: tauri::AppHandle,
    activity_id: i32,
    text: String,
) -> Result<ActivityReply, error::AppError> {
    let client = AniListClient::new(app);
    client.save_activity_reply(activity_id, &text).await
}

#[tauri::command]
async fn delete_activity(app: tauri::AppHandle, id: i32) -> Result<bool, error::AppError> {
    let client = AniListClient::new(app);
    client.delete_activity(id).await
}

#[tauri::command]
async fn delete_activity_reply(app: tauri::AppHandle, id: i32) -> Result<bool, error::AppError> {
    let client = AniListClient::new(app);
    client.delete_activity_reply(id).await
}

#[tauri::command]
async fn get_unread_notification_count(
    app: tauri::AppHandle,
) -> Result<UnreadNotificationCount, error::AppError> {
    let client = AniListClient::new(app);
    client.unread_notification_count().await
}

#[tauri::command]
async fn get_notifications(
    app: tauri::AppHandle,
    type_in: Option<Vec<String>>,
    reset_notification_count: Option<bool>,
    page: Option<i32>,
    per_page: Option<i32>,
) -> Result<NotificationPage, error::AppError> {
    let client = AniListClient::new(app);
    client
        .notifications(type_in, reset_notification_count, page, per_page)
        .await
}

#[tauri::command]
async fn update_notification_options(
    app: tauri::AppHandle,
    airing_notifications: Option<bool>,
    notification_options: Option<Vec<NotificationOption>>,
) -> Result<UserOptions, error::AppError> {
    let client = AniListClient::new(app);
    client
        .update_notification_options(airing_notifications, notification_options)
        .await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AuthServerState(Mutex::new(None)))
        .manage(AniListState::new())
        .manage(playback::PlaybackState::new())
        .invoke_handler(tauri::generate_handler![
            start_auth_server,
            check_auth_token,
            stop_auth_server,
            login,
            logout,
            is_authenticated,
            get_viewer,
            search_anime,
            search_manga,
            get_anime,
            get_manga,
            get_user_list,
            update_entry,
            delete_entry,
            trending_anime,
            fetch_airing_calendar,
            popular_anime,
            discover_media,
            toggle_favourite,
            get_user_activities,
            get_activity_replies,
            toggle_like,
            save_text_activity,
            save_activity_reply,
            delete_activity,
            delete_activity_reply,
            get_unread_notification_count,
            get_notifications,
            update_notification_options,
            playback::playback_search,
            playback::playback_episodes,
            playback::playback_streams,
            playback::playback_prepare_stream,
            playback::playback_stop,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
