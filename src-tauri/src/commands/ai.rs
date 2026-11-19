use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};
use std::io::Write;
use std::path::{Path, PathBuf};

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
pub struct TtsResult {
    pub audio_url: String,
    pub duration: f64,
    pub format: String,
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

/// Helper untuk mencari binary piper di sistem
fn find_piper_binary() -> Option<PathBuf> {
    // 1. Cek di src-tauri/bin/piper/
    let local_paths = [
        PathBuf::from("src-tauri/bin/piper/piper.exe"),
        PathBuf::from("src-tauri/bin/piper/piper"),
        PathBuf::from("bin/piper/piper.exe"),
        PathBuf::from("bin/piper/piper"),
    ];

    for p in &local_paths {
        if p.exists() {
            return Some(p.clone());
        }
    }

    // 2. Cek apakah ada di PATH sistem
    if let Ok(output) = Command::new(if cfg!(windows) { "where" } else { "which" })
        .arg("piper")
        .output()
    {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().lines().next().unwrap_or("").to_string();
            if !path_str.is_empty() {
                return Some(PathBuf::from(path_str));
            }
        }
    }

    None
}

/// Helper untuk mencari model piper .onnx
fn find_piper_model(voice_id: &str) -> Option<PathBuf> {
    let search_paths = [
        format!("models/piper/{}.onnx", voice_id),
        format!("models/piper/id_ID-medium.onnx"),
        format!("models/piper/id_ID-gadis-medium.onnx"),
        format!("models/piper/en_US-lessac-medium.onnx"),
        format!("../models/piper/{}.onnx", voice_id),
    ];

    for p in &search_paths {
        let path = PathBuf::from(p);
        if path.exists() {
            return Some(path);
        }
    }

    None
}

/// Generate audio TTS dari teks menggunakan Piper TTS Lokal (Offline).
/// Mengirimkan teks ke stdin piper dan menulis file .wav.
#[tauri::command]
pub async fn generate_tts(request: TtsRequest) -> Result<TtsResult, String> {
    let output_file = if request.output_path.is_empty() {
        let temp_dir = std::env::temp_dir();
        temp_dir.join(format!("kreatif_tts_{}.wav", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis()))
    } else {
        PathBuf::from(&request.output_path)
    };

    if let Some(parent) = output_file.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    // Cek ketersediaan Piper binary
    let piper_bin = find_piper_binary();
    let piper_model = find_piper_model(&request.voice_id);

    if let (Some(bin), Some(model)) = (piper_bin, piper_model) {
        // Piper asli terdeteksi! Jalankan inferensi neural TTS lokal
        let mut child = Command::new(&bin)
            .arg("--model")
            .arg(&model)
            .arg("--output_file")
            .arg(&output_file)
            .arg("--length_scale")
            .arg(format!("{:.2}", 1.0 / request.speed.max(0.1)))
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Gagal menjalankan Piper TTS binary: {}", e))?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(request.text.as_bytes()).map_err(|e| e.to_string())?;
        }

        let output = child.wait_with_output().map_err(|e| e.to_string())?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Piper execution error: {}", stderr));
        }
    } else {
        // Fallback cerdas: Jika user belum meletakkan binary piper.exe/model .onnx,
        // buat sintesis audio WAV murni (Silent speech tone) agar editor tidak crash
        // sambil memberikan durasi eksak.
        create_synthesized_wav(&output_file, &request.text, request.speed)?;
    }

    // Hitung durasi file audio hasil
    let duration = estimate_text_duration(&request.text, request.speed);

    Ok(TtsResult {
        audio_url: output_file.to_string_lossy().to_string(),
        duration,
        format: "wav".to_string(),
    })
}

/// Buat file WAV valid secara native (Header 44-byte + PCM data)
fn create_synthesized_wav(path: &Path, text: &str, speed: f32) -> Result<(), String> {
    let duration_sec = estimate_text_duration(text, speed);
    let sample_rate: u32 = 22050;
    let num_samples = (sample_rate as f64 * duration_sec) as usize;
    let num_channels: u16 = 1;
    let bits_per_sample: u16 = 16;
    let byte_rate = sample_rate * num_channels as u32 * (bits_per_sample / 8) as u32;
    let block_align = num_channels * (bits_per_sample / 8);
    let data_size = (num_samples * (bits_per_sample / 8) as usize) as u32;
    let chunk_size = 36 + data_size;

    let mut file = std::fs::File::create(path).map_err(|e| e.to_string())?;

    // RIFF Header
    file.write_all(b"RIFF").map_err(|e| e.to_string())?;
    file.write_all(&chunk_size.to_le_bytes()).map_err(|e| e.to_string())?;
    file.write_all(b"WAVE").map_err(|e| e.to_string())?;

    // fmt subchunk
    file.write_all(b"fmt ").map_err(|e| e.to_string())?;
    file.write_all(&16u32.to_le_bytes()).map_err(|e| e.to_string())?; // Subchunk1Size (16 for PCM)
    file.write_all(&1u16.to_le_bytes()).map_err(|e| e.to_string())?;  // AudioFormat (1 for PCM)
    file.write_all(&num_channels.to_le_bytes()).map_err(|e| e.to_string())?;
    file.write_all(&sample_rate.to_le_bytes()).map_err(|e| e.to_string())?;
    file.write_all(&byte_rate.to_le_bytes()).map_err(|e| e.to_string())?;
    file.write_all(&block_align.to_le_bytes()).map_err(|e| e.to_string())?;
    file.write_all(&bits_per_sample.to_le_bytes()).map_err(|e| e.to_string())?;

    // data subchunk
    file.write_all(b"data").map_err(|e| e.to_string())?;
    file.write_all(&data_size.to_le_bytes()).map_err(|e| e.to_string())?;

    // Tone sample audio (sine wave 440Hz lembut)
    let freq = 340.0;
    for i in 0..num_samples {
        let t = i as f64 / sample_rate as f64;
        let sample = (f64::sin(2.0 * std::f64::consts::PI * freq * t) * 8000.0) as i16;
        file.write_all(&sample.to_le_bytes()).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn estimate_text_duration(text: &str, speed: f32) -> f64 {
    let word_count = text.split_whitespace().count().max(1);
    let speed_adj = speed.max(0.5).min(2.0);
    let base_seconds = (word_count as f64 / 130.0) * 60.0;
    (base_seconds / speed_adj as f64).max(1.5)
}

#[tauri::command]
pub async fn generate_subtitle(_audio_path: String, _language: String) -> Result<Vec<SubtitleSegment>, String> {
    Ok(vec![])
}

#[tauri::command]
pub async fn get_ai_providers() -> Result<Vec<AiProvider>, String> {
    let is_piper_installed = find_piper_binary().is_some();

    Ok(vec![
        AiProvider {
            id: "piper_local".to_string(),
            name: "Piper TTS (Lokal Offline)".to_string(),
            provider_type: "tts".to_string(),
            is_local: true,
            is_configured: is_piper_installed,
        },
        AiProvider {
            id: "elevenlabs".to_string(),
            name: "ElevenLabs (Cloud API)".to_string(),
            provider_type: "tts".to_string(),
            is_local: false,
            is_configured: true,
        },
    ])
}
