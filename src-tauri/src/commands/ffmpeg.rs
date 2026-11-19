use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportConfig {
    pub format: String,       // "mp4", "webm", "mov", "gif"
    pub codec: String,        // "h264", "hevc", "vp9", "prores_ks", "gif"
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub bitrate: String,
    pub audio_codec: Option<String>,
    pub audio_bitrate: Option<String>,
    pub output_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MediaInfo {
    pub duration: f64,
    pub width: u32,
    pub height: u32,
    pub codec: String,
    pub fps: f64,
    pub has_audio: bool,
}

/// Export video project ke file menggunakan FFmpeg sidecar binary.
/// Membangun filter complex berdasarkan timeline tracks & clips.
#[tauri::command]
pub async fn export_video(config: ExportConfig) -> Result<String, String> {
    // TODO: Implementasi pipeline FFmpeg
    // 1. Deteksi hardware encoder yang tersedia (NVENC, VideoToolbox, VAAPI, QSV)
    // 2. Bangun filter_complex dari timeline state
    // 3. Jalankan FFmpeg sidecar binary via tauri_plugin_shell
    // 4. Stream progress ke frontend via Tauri events
    Ok(format!(
        "Export berhasil diinisiasi: {} ({}x{} @ {} FPS)",
        config.format, config.width, config.height, config.fps
    ))
}

/// Baca metadata media file (durasi, resolusi, codec) menggunakan FFprobe.
#[tauri::command]
pub async fn probe_media(file_path: String) -> Result<MediaInfo, String> {
    // TODO: Jalankan ffprobe dan parse JSON output
    Ok(MediaInfo {
        duration: 0.0,
        width: 0,
        height: 0,
        codec: String::new(),
        fps: 0.0,
        has_audio: false,
    })
}
