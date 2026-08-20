mod anilist;
mod auth;
mod auth_server;
mod error;
mod models;

use anilist::AniListClient;
use auth::AuthManager;
use auth_server::AuthServer;
use models::{ActivityPage, Media, MediaListEntry, Page, Viewer, AiringSchedulePage};
use std::sync::Mutex;

// Global state for auth server
struct AuthServerState(Mutex<Option<AuthServer>>);

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn start_auth_server(state: tauri::State<'_, AuthServerState>) -> Result<String, error::AppError> {
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
async fn check_auth_token(state: tauri::State<'_, AuthServerState>) -> Result<Option<String>, error::AppError> {
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
    eprintln!("Login command called with token length: {}", access_token.len());
    eprintln!("Token prefix: {}", &access_token[..access_token.len().min(10)]);
    
    let session = auth::AniListSession {
        access_token,
        token_type: "Bearer".to_string(),
        expires_in: None,
    };
    
    AuthManager::store_token(&app, session)?;
    eprintln!("Login successful");
    Ok(())
}

#[tauri::command]
async fn logout(app: tauri::AppHandle) -> Result<(), error::AppError> {
    AuthManager::clear_token(&app)?;
    Ok(())
}

#[tauri::command]
async fn is_authenticated(app: tauri::AppHandle) -> Result<bool, error::AppError> {
    Ok(AuthManager::is_authenticated(&app))
}

#[tauri::command]
async fn get_viewer(app: tauri::AppHandle) -> Result<Viewer, error::AppError> {
    let client = AniListClient::new(app);
    Ok(client.viewer().await?)
}

#[tauri::command]
async fn search_anime(
    app: tauri::AppHandle,
    search: String,
    page: Option<i32>,
    per_page: Option<i32>,
) -> Result<Page<Media>, error::AppError> {
    let client = AniListClient::new(app);
    Ok(client.search_anime(&search, page, per_page).await?)
}

#[tauri::command]
async fn search_manga(
    app: tauri::AppHandle,
    search: String,
    page: Option<i32>,
    per_page: Option<i32>,
) -> Result<Page<Media>, error::AppError> {
    let client = AniListClient::new(app);
    Ok(client.search_manga(&search, page, per_page).await?)
}

#[tauri::command]
async fn get_anime(app: tauri::AppHandle, id: i32) -> Result<Media, error::AppError> {
    let client = AniListClient::new(app);
    Ok(client.anime(id).await?)
}

#[tauri::command]
async fn get_manga(app: tauri::AppHandle, id: i32) -> Result<Media, error::AppError> {
    let client = AniListClient::new(app);
    Ok(client.manga(id).await?)
}

#[tauri::command]
async fn get_user_list(
    app: tauri::AppHandle,
    media_type: String,
    status: Option<String>,
) -> Result<Vec<MediaListEntry>, error::AppError> {
    let client = AniListClient::new(app);
    Ok(client.user_list(&media_type, status.as_deref()).await?)
}

#[tauri::command]
async fn update_entry(
    app: tauri::AppHandle,
    media_id: i32,
    status: Option<String>,
    score: Option<f64>,
    progress: Option<i32>,
) -> Result<MediaListEntry, error::AppError> {
    let client = AniListClient::new(app);
    Ok(client
        .update_entry_by_media(media_id, status.as_deref(), score, progress, None)
        .await?)
}

#[tauri::command]
async fn delete_entry(app: tauri::AppHandle, entry_id: i32) -> Result<bool, error::AppError> {
    let client = AniListClient::new(app);
    Ok(client.delete_entry(entry_id).await?)
}

#[tauri::command]
async fn trending_anime(
    app: tauri::AppHandle,
    page: Option<i32>,
    per_page: Option<i32>,
) -> Result<Page<Media>, error::AppError> {
    let client = AniListClient::new(app);
    Ok(client.trending_anime(page, per_page).await?)
}

#[tauri::command]
async fn fetch_airing_calendar(
    app: tauri::AppHandle,
    start_time: i64,
    end_time: i64,
    page: Option<i32>,
) -> Result<AiringSchedulePage, error::AppError> {
    let client = AniListClient::new(app);
    Ok(client.airing_schedule(start_time, end_time, page).await?)
}

#[tauri::command]
async fn popular_anime(
    app: tauri::AppHandle,
    page: Option<i32>,
    per_page: Option<i32>,
) -> Result<Page<Media>, error::AppError> {
    let client = AniListClient::new(app);
    Ok(client.popular_anime(page, per_page).await?)
}

#[tauri::command]
async fn get_user_activities(
    app: tauri::AppHandle,
    page: Option<i32>,
    per_page: Option<i32>,
) -> Result<ActivityPage, error::AppError> {
    let client = AniListClient::new(app);
    Ok(client.user_activities(page, per_page).await?)
}

#[cfg(target_os = "windows")]
#[tauri::command]
fn is_aniplay_installed() -> bool {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    hkcu.open_subkey(
        r"Software\Classes\aniplay\shell\open\command"
    )
    .is_ok()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AuthServerState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            greet,
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
            get_user_activities,
            is_aniplay_installed
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
