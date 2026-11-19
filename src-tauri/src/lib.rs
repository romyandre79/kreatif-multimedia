mod commands;

use commands::{ffmpeg, ai, project, uploader};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // FFmpeg commands
            ffmpeg::export_video,
            ffmpeg::probe_media,
            // AI commands
            ai::generate_tts,
            ai::generate_subtitle,
            ai::get_ai_providers,
            // Project commands
            project::save_project,
            project::load_project,
            project::auto_save,
            // Uploader commands
            uploader::upload_youtube,
            uploader::upload_tiktok,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
