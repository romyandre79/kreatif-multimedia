# Kreatif Multimedia Studio

Aplikasi desktop *Non-Linear Editor (NLE)* modern, ringan, dan cross-platform (Windows, Linux, macOS) yang menggabungkan kemampuan video editor tradisional (seperti CapCut / PowerDirector) dengan fitur *Storyboarding* dan manajemen karakter berbasis AI (Lokal & Cloud).

---

## 🌟 Fitur Utama

### 1. Character & Lore Vault
- Upload aset visual karakter (foto, ilustrasi, variasi ekspresi, pose).
- Profiling & deskripsi karakter (bio, sifat, prompt style untuk konsistensi AI).
- Pemilihan Voice ID / model TTS per karakter.

### 2. Episode, Script Manager & Smart Auto-Importer
- Pembuatan skrip per episode & pembagian beat/scene.
- **Smart Script-to-Video Importer (`Auto Script`)**:
  - Otomatis mem-parsing naskah mentah skenario/cerita utuh (Title Episode, Dialog Karakter, Prolog/Narasi, dan Petunjuk Aksi/Visual).
  - Ekstraksi multi-speaker dan auto-create profil karakter baru yang belum terdaftar.
  - Pemisahan ekspresi akting dalam tanda kurung `(sambil berlagak sombong)` agar tidak dibaca oleh audio TTS.
  - 1-Click Batch Voice Generation dan penyusunan instan seluruh adegan langsung ke Multi-Track Timeline (Audio, Visual, Subtitle).
- Text-to-Speech otomatis (Lokal: Piper TTS/Kokoro, Cloud: ElevenLabs/OpenAI TTS).
- Sinkronisasi instan naskah ke timeline audio & subtitle track.

### 3. Text Studio & Tipografi Lengkap (55+ Preset & Custom Builder)
- **Custom Text Animation Builder**:
  - **20 Pilihan Motion Type Masuk**: Fade, Slide Up/Down/Left/Right/Diagonal, Zoom In/Out, Heavy Bounce Drop, Elastic Spring Pop, Rotate CW/CCW, Flip Horizontal/Vertical, Typewriter, Glitch & Shake, Swing In (Pendulum), Spiral Vortex, Blur Reveal, Slam Zoom.
  - **20 Pilihan Loop Animation Kontinu**: Gentle Pulse, Heartbeat, Floating Bobbing, Horizontal Drift, Slow/Fast Spin, Playful Wiggle, Jelly Squish, Shiver/Tremble, Pendulum, Ocean Wave, Neon Flicker, Strobe Flash, Glitch Twitch, Deep Breathing, Rainbow Cycle, Glow Halo, Circular Orbit, Trampoline Bounce.
  - Live Interactive Preview Screen, penyesuaian kurva easing, kecepatan loop, dan styling glow/bayangan kustom.
- **55 Preset Animasi Teks Bawaan Siap Pakai**: Fade, Slide, Zoom, Bounce, Rotate, Glitch, Cinematic, Typewriter, Pop-up, dll.
- **Dukungan Font Sistem Operasi (OS Fonts)**: Integrasi Web Local Font Access API untuk membaca dan menggunakan seluruh jenis huruf yang terpasang di komputer pengguna (Windows, macOS, Linux).
- **Format Tipografi Lengkap**: Bold (Tebal), Italic (Miring), Underline (Garis Bawah), Font Size, Text Color, Background Banner, & Shadow.
- **Live Preview & Animation Loop**: Pratinjau animasi teks dan loop replay interaktif pada editor modal.

### 4. Audio Vault & SFX Integration
- **Freesound.org Integration**: Pencarian dan unduh jutaan Sound Effect (SFX) / foley langsung dari aplikasi.
- **BGM & Voice Library**: Manajemen suara narasi, background music, dan instan drag-and-drop ke timeline.

### 5. Multi-Track Timeline (NLE) & Keyframe Animation
- Trek multi-layer: Video, Gambar, Teks/Subtitle, dan Audio (Voice, BGM, SFX).
- **Keyframe Animator Terintegrasi (◆ Diamond Points)**:
  - Penambahan & penghapusan titik keyframe dinamis pada detik tertentu di klip.
  - Animasi halus multi-parameter: **Position X, Position Y, Scale (Zoom in/out), Rotation, Opacity (Alpha/Fade), dan Audio Volume (Ducking/Fade)**.
  - Kurva interpolasi halus (Linear, Ease-In, Ease-Out, Ease-InOut).
  - Tampilan visual diamond marker langsung di body klip timeline dan navigator titik di Inspector.
  - Terintegrasi penuh ke Canvas Preview 60 FPS dan Final Video Exporter.
- Trimming (in/out point), cutting, splitting, multi-layer snapping, dan scrubber.
- **Transisi Antar-Klip & Custom Transition Studio (CRUD)**:
  - Preset bawaan: Morph (Warp & Blend), Fade In/Out, Cross Dissolve, Slide Left/Right/Up/Down, Zoom In/Out, Wipe Left/Right.
  - **CRUD Video Transition Manager**:
    - Dialog pembuat transisi kustom dengan **Live 2-Scene Split Preview (Adegan A & B)**.
    - Parameter efek dasar: Fade, Slide, Zoom, Rotate/Spin, Wipe, Morph/Warp, Glitch, Flip 3D, Circle Iris.
    - Kurva Easing presisi: Linear, Ease In, Ease Out, Ease In-Out, Bounce, Elastic.
    - Konfigurasi arah pergerakan, rotasi derajat, rentang skala awal/akhir, dan durasi default.
    - Tersimpan permanen di LocalStorage dan langsung muncul di dropdown *Inspector* (Transisi Masuk & Keluar).
    - Render real-time di Canvas Preview 60 FPS dan hasil export final video.
- **Undo/Redo**: Riwayat perubahan tak terbatas dengan keyboard shortcut (Ctrl+Z / Ctrl+Shift+Z).
- **Auto-Stop Playback**: Playback otomatis berhenti tepat di batas akhir klip terakhir timeline.

### 6. Interactive Canvas Preview
- Preview real-time 60 FPS bertenaga WebGL / Canvas.
- Transformasi visual: Drag, resize, rotate, crop.
- Pilihan rasio aspek canvas: **16:9** (Landscape), **9:16** (Shorts/Reels/TikTok), **1:1** (Instagram), **4:3**, **21:9** (Cinematic).
- **Real-Time Chroma Keying**: Filter green/blue screen langsung di preview menggunakan WebGL shader.

### 7. Media Import
- **Video**: MP4, MOV, WebM, AVI, MKV.
- **Gambar**: PNG, JPG/JPEG, GIF, WebP, SVG, BMP.
- **Audio**: MP3, WAV, OGG, FLAC, AAC — import manual langsung ke track audio timeline (selain dari TTS).

### 8. Hybrid AI Architecture
- **Lokal (Offline/Gratis)**: Whisper.cpp (Auto Subtitle), Piper TTS (Suara), SD WebUI / ComfyUI (Generasi Gambar/Video).
- **Cloud API**: OpenAI, ElevenLabs, Fal.ai, Kling, Runway, Luma.
- **AI Provider Manager**: Panel pengaturan untuk memilih dan mengkonfigurasi engine AI per fitur (TTS, Image Gen, Subtitle) — mudah beralih antara lokal dan cloud.

### 9. Ekspor & Publikasi
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

### 10. Multi-Language System (i18n) & CRUD Kamus Terjemahan
- **Dukungan Multi-Bahasa Bawaan**: Kamus lengkap Bahasa Indonesia (🇮🇩) dan English (🇺🇸).
- **Language Switcher Instan**: Ganti bahasa tampilan aplikasi secara real-time langsung dari toolbar atas.
- **Language Manager (CRUD)**:
  - Menambah bahasa baru (misal: Jepang 🇯🇵, Spanyol 🇪🇸, Jerman 🇩🇪, dll) dengan opsi menyalin terjemahan awal dari bahasa lain.
  - Mengedit nilai terjemahan per kata/frasa secara inline tabel.
  - Menambah dan menghapus kunci terjemahan (keys) secara global di seluruh bahasa.
  - Reset kamus ke pengaturan default.
  - Tersimpan permanen di penyimpanan lokal (`localStorage`).

### 11. Proteksi Data & Kenyamanan
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
│   │   ├── StoryEpisode/          # Manajemen episode, dialog & Smart Script Importer
│   │   ├── TextStudio/            # Studio teks, tipografi font OS & 55+ animasi
│   │   ├── CanvasPreview/         # WebGL canvas preview 60 FPS & player controls
│   │   ├── Timeline/              # Multi-track timeline & keyframe diamond points
│   │   ├── AudioVault/            # SFX Freesound.org & BGM library
│   │   ├── ExportDialog/          # Dialog export video (MP4/WebM/MOV/GIF)
│   │   ├── Inspector/             # Properties, Keyframe, Chroma Key, & Transition Studio
│   │   ├── LanguageManager/       # Multi-language & kamus terjemahan i18n (CRUD)
│   │   ├── AiSettingsModal/       # Pengaturan API AI lokal & cloud provider
│   │   └── GeminiFlow/            # Google Gemini AI video generation flow
│   ├── shaders/                   # GLSL shaders (Chroma key, color balance)
│   ├── services/                  # Business logic (customTransitions, i18n, keyframe, etc.)
│   ├── stores/                    # State management (projectStore, i18nStore)
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
