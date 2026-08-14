use crate::error::{AppError, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

const TOKEN_FILE: &str = "anilist_token.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AniListSession {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: Option<u64>,
}

pub struct AuthManager;

impl AuthManager {
    fn get_token_path(app: &tauri::AppHandle) -> Result<PathBuf> {
        let app_data_dir = app.path()
            .app_data_dir()
            .map_err(|e| AppError::Storage(e.to_string()))?;
        
        fs::create_dir_all(&app_data_dir)
            .map_err(|e| AppError::Storage(format!("Failed to create app data directory: {}", e)))?;
        
        Ok(app_data_dir.join(TOKEN_FILE))
    }

    pub fn store_token(app: &tauri::AppHandle, session: AniListSession) -> Result<()> {
        let token_json = serde_json::to_string(&session)?;
        let token_path = Self::get_token_path(app)?;
        
        eprintln!("Storing token to: {:?}", token_path);
        fs::write(&token_path, token_json)
            .map_err(|e| AppError::Storage(format!("Failed to write token file: {}", e)))?;
        
        // Verify the token was written correctly
        let stored = fs::read_to_string(&token_path)?;
        eprintln!("Token stored successfully, length: {}", stored.len());
        
        Ok(())
    }

    pub fn get_token(app: &tauri::AppHandle) -> Result<Option<AniListSession>> {
        let token_path = Self::get_token_path(app)?;
        
        if !token_path.exists() {
            eprintln!("Token file does not exist: {:?}", token_path);
            return Ok(None);
        }
        
        let token_json = fs::read_to_string(&token_path)
            .map_err(|e| AppError::Storage(format!("Failed to read token file: {}", e)))?;
        
        eprintln!("Token loaded successfully, length: {}", token_json.len());
        
        let session: AniListSession = serde_json::from_str(&token_json)
            .map_err(|e| AppError::Storage(format!("Failed to deserialize token: {}", e)))?;
        
        eprintln!("Token access token length: {}", session.access_token.len());
        Ok(Some(session))
    }

    pub fn clear_token(app: &tauri::AppHandle) -> Result<()> {
        let token_path = Self::get_token_path(app)?;
        
        if token_path.exists() {
            fs::remove_file(&token_path)
                .map_err(|e| AppError::Storage(format!("Failed to remove token file: {}", e)))?;
        }
        
        Ok(())
    }

    pub fn is_authenticated(app: &tauri::AppHandle) -> bool {
        Self::get_token(app).is_ok_and(|session| session.is_some())
    }
}
