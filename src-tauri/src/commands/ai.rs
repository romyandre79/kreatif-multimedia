use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct TtsRequest {
    pub text: String,
    pub provider: String,       // "piper_local", "elevenlabs", "openai_tts"
    pub voice_id: String,
    pub pitch: f32,
    pub speed: f32,
    pub output_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SubtitleSegment {
    pub start: f64,
    pub end: f64,
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiProvider {
    pub id: String,
    pub name: String,
    pub provider_type: String,  // "tts", "image_gen", "auto_subtitle"
    pub is_local: bool,
    pub is_configured: bool,
}

/// Generate audio TTS dari teks menggunakan provider yang dipilih.
#[tauri::command]
pub async fn generate_tts(request: TtsRequest) -> Result<String, String> {
    // TODO: Implementasi routing ke provider TTS
    // - piper_local: jalankan Piper TTS binary lokal
    // - elevenlabs: HTTP request ke ElevenLabs API
    // - openai_tts: HTTP request ke OpenAI TTS API
    Ok(format!("TTS generated: {} -> {}", request.provider, request.output_path))
}

/// Generate subtitle otomatis dari file audio menggunakan Whisper.
#[tauri::command]
pub async fn generate_subtitle(audio_path: String, language: String) -> Result<Vec<SubtitleSegment>, String> {
    // TODO: Implementasi Whisper.cpp lokal atau Cloud API
    Ok(vec![])
}

/// Dapatkan daftar AI provider yang tersedia dan statusnya.
#[tauri::command]
pub async fn get_ai_providers() -> Result<Vec<AiProvider>, String> {
    Ok(vec![
        AiProvider {
            id: "piper_local".to_string(),
            name: "Piper TTS (Lokal)".to_string(),
            provider_type: "tts".to_string(),
            is_local: true,
            is_configured: false,
        },
        AiProvider {
            id: "whisper_local".to_string(),
            name: "Whisper.cpp (Lokal)".to_string(),
            provider_type: "auto_subtitle".to_string(),
            is_local: true,
            is_configured: false,
        },
        AiProvider {
            id: "elevenlabs".to_string(),
            name: "ElevenLabs (Cloud)".to_string(),
            provider_type: "tts".to_string(),
            is_local: false,
            is_configured: false,
        },
    ])
}
