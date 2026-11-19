use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadConfig {
    pub file_path: String,
    pub title: String,
    pub description: String,
    pub tags: Vec<String>,
    pub visibility: String,  // "public", "unlisted", "private"
}

/// Upload video ke YouTube via YouTube Data API v3
#[tauri::command]
pub async fn upload_youtube(config: UploadConfig) -> Result<String, String> {
    // TODO: Implementasi YouTube OAuth2 + upload
    // 1. Autentikasi OAuth2 (buka browser untuk consent)
    // 2. Upload video via resumable upload API
    // 3. Set metadata (title, description, tags, visibility)
    Ok(format!("YouTube upload initiated: {}", config.title))
}

/// Upload video ke TikTok via TikTok Content API
#[tauri::command]
pub async fn upload_tiktok(config: UploadConfig) -> Result<String, String> {
    // TODO: Implementasi TikTok OAuth2 + upload to drafts
    Ok(format!("TikTok upload initiated: {}", config.title))
}
