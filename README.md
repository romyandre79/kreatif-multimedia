# Kreatif Multimedia Studio

Aplikasi desktop *Non-Linear Editor (NLE)* modern, ringan, dan cross-platform (Windows, Linux, macOS) yang menggabungkan kemampuan video editor tradisional (seperti CapCut / PowerDirector) dengan fitur *Storyboarding* dan manajemen karakter berbasis AI (Lokal & Cloud).

---

## 🌟 Fitur Utama

### 1. Character & Lore Vault
- Upload aset visual karakter (foto, ilustrasi, variasi ekspresi, pose).
- Profiling & deskripsi karakter (bio, sifat, prompt style untuk konsistensi AI).
- Pemilihan Voice ID / model TTS per karakter.

### 2. Episode & Script Manager
- Pembuatan skrip per episode & pembagian beat/scene.
- Text-to-Speech otomatis (Lokal: Piper TTS/Kokoro, Cloud: ElevenLabs/OpenAI TTS).
- Sinkronisasi instan naskah ke timeline audio & subtitle track.

### 3. Multi-Track Timeline (NLE)
- Trek multi-layer: Video, Gambar, Teks/Subtitle, dan Audio (Voice, BGM, SFX).
- Trimming (in/out point), cutting, splitting, multi-layer snapping, dan scrubber.
- **Transisi antar-klip**: Fade In/Out, Cross Dissolve, Wipe, Slide, dan custom transition.
- **Undo/Redo**: Riwayat perubahan tak terbatas dengan keyboard shortcut (Ctrl+Z / Ctrl+Shift+Z).

### 4. Interactive Canvas Preview
- Preview real-time 60 FPS bertenaga WebGL / Canvas.
- Transformasi visual: Drag, resize, rotate, crop.
- Pilihan rasio aspek canvas: **16:9** (Landscape), **9:16** (Shorts/Reels/TikTok), **1:1** (Instagram), **4:3**, **21:9** (Cinematic).
- **Real-Time Chroma Keying**: Filter green/blue screen langsung di preview menggunakan WebGL shader.

### 5. Media Import
- **Video**: MP4, MOV, WebM, AVI, MKV.
- **Gambar**: PNG, JPG/JPEG, GIF, WebP, SVG, BMP.
- **Audio**: MP3, WAV, OGG, FLAC, AAC — import manual langsung ke track audio timeline (selain dari TTS).

### 6. Hybrid AI Architecture
- **Lokal (Offline/Gratis)**: Whisper.cpp (Auto Subtitle), Piper TTS (Suara), SD WebUI / ComfyUI (Generasi Gambar/Video).
- **Cloud API**: OpenAI, ElevenLabs, Fal.ai, Kling, Runway, Luma.
- **AI Provider Manager**: Panel pengaturan untuk memilih dan mengkonfigurasi engine AI per fitur (TTS, Image Gen, Subtitle) — mudah beralih antara lokal dan cloud.

### 7. Ekspor & Publikasi
- **Format output yang bisa dipilih**:
  - **MP4** (H.264 / H.265 — paling universal)
  - **WebM** (VP9 — ringan untuk web)
  - **MOV** (ProRes — kualitas tinggi untuk editing lanjutan)
  - **GIF** (animasi pendek / stiker)
- **Resolusi**: 720p, 1080p, 2K, 4K.
- **Orientasi**: Landscape (16:9), Portrait (9:16), Square (1:1).
- **FPS**: 24, 30, 60.
- Akselerasi hardware encoding: NVENC (Nvidia), VAAPI (Linux), VideoToolbox (macOS), QSV (Intel), AMF (AMD).
- **Direct Upload**: YouTube API v3, TikTok Draft API, Google Drive OAuth.

### 8. Proteksi Data & Kenyamanan
- **Auto-Save**: Proyek otomatis tersimpan setiap 60 detik dan saat ada perubahan penting (konfigurabel).
- **Crash Recovery**: Saat aplikasi dibuka ulang setelah crash, proyek dikembalikan ke state terakhir yang tersimpan.
- **Keyboard Shortcuts**: Shortcut standar editor profesional (Space = Play/Pause, S = Split, Delete = Hapus klip, Ctrl+Z = Undo, Ctrl+S = Save, dll.).

---

## 🛠️ Arsitektur & Teknologi

- **Desktop Framework**: [Tauri v2](https://v2.tauri.app/) (Core berbasis Rust — ringan, hemat RAM, binary native).
- **Frontend UI & Timeline**: React 18 / Vite + TypeScript + TailwindCSS.
- **Preview & Shader Engine**: HTML5 Canvas + WebGL Shader (GLSL) untuk chroma keying dan transform real-time.
- **Rendering & Video Processing**: Embedded FFmpeg binary sidecar (per platform).
- **State Management**: Zustand untuk state timeline multi-track.

---

## 📂 Struktur Repositori

```
kreatif-multimedia/
├── .github/
│   └── workflows/
│       └── release.yml            # CI/CD GitHub Actions multi-platform
├── src-tauri/                     # Backend Rust & Tauri
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── src/
│   │   ├── main.rs                # Entrypoint aplikasi
│   │   ├── commands/              # Tauri IPC commands
│   │   │   ├── ffmpeg.rs          # Video export, probe, render filter
│   │   │   ├── ai.rs              # AI local & cloud provider handler
│   │   │   ├── project.rs         # Save, load, auto-save, crash recovery
│   │   │   └── uploader.rs        # YouTube/TikTok/Drive integration
│   └── bin/                       # Binary FFmpeg sidecar per platform
│       ├── ffmpeg-x86_64-pc-windows-msvc.exe
│       ├── ffmpeg-x86_64-unknown-linux-gnu
│       └── ffmpeg-aarch64-apple-darwin
├── src/                           # Frontend React / TypeScript
│   ├── components/
│   │   ├── CharacterVault/        # Manajemen karakter & suara
│   │   ├── StoryEpisode/          # Manajemen episode & naskah dialog
│   │   ├── CanvasPreview/         # WebGL canvas preview & player controls
│   │   ├── Timeline/              # Multi-track timeline editor
│   │   ├── ExportDialog/          # Dialog pilih format, resolusi, orientasi
│   │   └── Inspector/             # Pengaturan properti klip, keying, transisi
│   ├── shaders/                   # GLSL shaders (Chroma key, color balance)
│   ├── stores/                    # State management (Timeline, Project, Assets, Undo)
│   ├── App.tsx
│   └── main.tsx
├── ARCHITECTURE.md                # Dokumentasi detail arsitektur teknis
├── CONTRIBUTING.md                # Panduan kontribusi
├── LICENSE                        # Lisensi proyek
└── README.md                      # Dokumentasi ini
```

---

## 🚀 Panduan Memulai (Development)

### Prasyarat
1. **Node.js** (v18+ atau v20+) dan **npm**.
2. **Rust & Cargo** (install via [rustup.rs](https://rustup.rs/)).
3. Ketergantungan sistem:
   - **Windows**: Microsoft C++ Build Tools & WebView2.
   - **Linux (Ubuntu/Debian)**: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`
   - **macOS**: Xcode Command Line Tools (`xcode-select --install`).

### Instalasi & Menjalankan Mode Dev

```bash
# 1. Install dependencies frontend
npm install

# 2. Jalankan aplikasi dalam mode development
npm run tauri dev
```

---

## 📦 CI/CD GitHub Actions

Alur rilis otomatis dikonfigurasi melalui GitHub Actions pada file `.github/workflows/release.yml`.

### Trigger
- Push tag rilis `v*` (misal `v1.0.0`, `v0.2.0-beta`)
- Push ke branch `main`
- Manual via `workflow_dispatch`

### Build Target (Paralel)
| Platform | Runner | Output Installer |
|----------|--------|-----------------|
| **Windows** | `windows-latest` | `.msi`, `.exe` (NSIS) |
| **Linux** | `ubuntu-22.04` | `.deb`, `.AppImage` |
| **macOS Apple Silicon** | `macos-latest` | `.dmg`, `.app` (aarch64) |
| **macOS Intel** | `macos-13` | `.dmg`, `.app` (x86_64) |

### Versioning
Proyek menggunakan **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`.
- Versi ditulis di `src-tauri/tauri.conf.json` → field `version`.
- Saat membuat rilis, buat tag Git yang sesuai: `git tag v1.0.0 && git push origin v1.0.0`.
- CI/CD otomatis membaca versi dari `tauri.conf.json` dan membuat GitHub Release draft.
