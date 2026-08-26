use std::sync::Mutex;

use ani_lib::{
    relay_stream,
    AnikotoCzClient,
    HlsRelay,
    SearchResult,
    StreamLink,
    TranslationType,
};

pub struct PlaybackState {
    pub relay: Mutex<Option<HlsRelay>>,
}

impl PlaybackState {
    pub fn new() -> Self {
        Self {
            relay: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub async fn playback_search(
    query: String,
    translation: TranslationType,
) -> Result<Vec<SearchResult>, String> {
    let client = AnikotoCzClient::new()
        .map_err(|error| error.to_string())?;

    client
        .search(&query, translation)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn playback_episodes(
    show_id: String,
    translation: TranslationType,
) -> Result<Vec<String>, String> {
    let client = AnikotoCzClient::new()
        .map_err(|error| error.to_string())?;

    client
        .episodes(&show_id, translation)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn playback_streams(
    show_id: String,
    episode: String,
    translation: TranslationType,
) -> Result<Vec<StreamLink>, String> {
    let client = AnikotoCzClient::new()
        .map_err(|error| error.to_string())?;

    client
        .streams(&show_id, &episode, translation)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn playback_prepare_stream(
    state: tauri::State<'_, PlaybackState>,
    stream: StreamLink,
) -> Result<String, String> {
    if !stream.hls {
        return Ok(stream.url);
    }

    let (new_relay, local_stream) = relay_stream(&stream)
        .await
        .map_err(|error| error.to_string())?;

    let url = local_stream.url.clone();

    let mut relay = state
        .relay
        .lock()
        .map_err(|_| "Failed to lock playback state".to_string())?;

    *relay = Some(new_relay);

    Ok(url)
}

#[tauri::command]
pub fn playback_stop(
    state: tauri::State<'_, PlaybackState>,
) -> Result<(), String> {
    let mut relay = state
        .relay
        .lock()
        .map_err(|_| "Failed to lock playback state".to_string())?;

    *relay = None;

    Ok(())
}