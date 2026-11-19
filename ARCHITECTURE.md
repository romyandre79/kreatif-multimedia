# Arsitektur & Spesifikasi Desain Sistem

Dokumen ini menjelaskan rancangan arsitektur teknis dari **Kreatif Multimedia Studio**, mencakup alur data, skema proyek, integrasi AI, rendering engine, mekanisme auto-save, dan strategi cross-platform.

---

## 1. Diagram Arsitektur Tingkat Tinggi

```
+---------------------------------------------------------------------------------+
|                                 FRONTEND (WEB)                                  |
|  [Character Vault]   [Story/Script]   [Timeline Editor]   [Inspector/Props]     |
|                                |              |                                 |
|                       Zustand State Store     |                                 |
|              (+ Undo/Redo History Stack)      |                                 |
|                                |              v                                 |
|                       +----------------------------------+                      |
|                       |  Interactive WebGL / Canvas      |                      |
|                       |  - Real-time Chroma Key Shader   |                      |
|                       |  - Crop, Masking, Transform      |                      |
|                       |  - Transition Blending Preview   |                      |
|                       |  - Audio Sync Playhead           |                      |
|                       +----------------------------------+                      |
+----------------------------------------|----------------------------------------+
                                         | Tauri IPC (invoke / event)
+----------------------------------------v----------------------------------------+
|                               TAURI V2 (RUST CORE)                              |
|  +--------------------+  +----------------------+  +-------------------------+  |
|  |   AI Router Core   |  |   FFmpeg Pipeline    |  |  Direct Uploader Hub    |  |
|  | - Local Whisper    |  | - Hardware Encoding  |  | - YouTube API v3        |  |
|  | - Local Piper TTS  |  |   (NVENC, VideoTbx,  |  | - TikTok Draft API      |  |
|  | - Cloud API Client |  |    VAAPI, QSV, AMF)  |  | - Google Drive OAuth    |  |
|  | - Provider Config  |  | - Transitions Render |  | - Cloud Storage         |  |
|  +--------------------+  +----------------------+  +-------------------------+  |
|  +--------------------+                                                         |
|  |  Project I/O       |                                                         |
|  | - Save / Load      |                                                         |
|  | - Auto-Save Timer  |                                                         |
|  | - Crash Recovery   |                                                         |
|  +--------------------+                                                         |
+---------------------------------------------------------------------------------+
```

---

## 2. Format Skema Data Proyek (`project.kreatif.json`)

Semua state proyek disimpan dalam format JSON terstruktur. Skema lengkap mencakup metadata proyek, konfigurasi AI, karakter, episode/naskah, dan data timeline multi-track:

```json
{
  "version": "1.0.0",
  "meta": {
    "title": "Petualangan Legenda Ep 1",
    "resolution": { "width": 1920, "height": 1080 },
    "aspect_ratio": "16:9",
    "fps": 30,
    "duration": 65.0,
    "created_at": "2026-11-19T15:00:00+07:00",
    "updated_at": "2026-11-19T15:30:00+07:00"
  },
  "ai_settings": {
    "tts": {
      "provider": "piper_local",
      "config": {
        "model_path": "models/piper/id_ID-medium.onnx"
      }
    },
    "image_generation": {
      "provider": "cloud_fal",
      "config": {
        "api_key_env": "FAL_API_KEY",
        "model": "flux-pro"
      }
    },
    "auto_subtitle": {
      "provider": "whisper_local",
      "config": {
        "model_size": "base",
        "language": "id"
      }
    }
  },
  "characters": [
    {
      "id": "char-hero-01",
      "name": "Bima",
      "description": "Ksatria pemberani, bersuara tegas dan tenang. Selalu memakai armor emas.",
      "avatar": "assets/characters/bima_default.png",
      "assets": [
        "assets/characters/bima_default.png",
        "assets/characters/bima_senyum.png",
        "assets/characters/bima_marah.png"
      ],
      "voice": {
        "engine": "piper_local",
        "voice_id": "id_ID-bima-medium",
        "pitch": 1.0,
        "speed": 1.0
      }
    }
  ],
  "episodes": [
    {
      "id": "ep-01",
      "title": "Awal Mula Perjalanan",
      "scenes": [
        {
          "scene_id": "sc-01",
          "character_id": "char-hero-01",
          "script": "Kita harus segera bergegas sebelum fajar menyingsing.",
          "audio_url": "cache/audio/sc01_bima.wav",
          "duration": 3.8
        }
      ]
    }
  ],
  "timeline": {
    "tracks": [
      {
        "id": "track-bg-video",
        "type": "video",
        "name": "Background",
        "clips": [
          {
            "id": "clip-bg-1",
            "source": "assets/footage/forest.mp4",
            "start": 0.0,
            "end": 15.0,
            "source_start": 2.0,
            "source_end": 17.0,
            "crop": { "x": 0, "y": 0, "width": 1920, "height": 1080 },
            "transform": { "scale": 1.0, "x": 0, "y": 0, "rotation": 0 },
            "transition_in": null,
            "transition_out": {
              "type": "cross_dissolve",
              "duration": 0.5
            }
          },
          {
            "id": "clip-bg-2",
            "source": "assets/footage/mountain.mp4",
            "start": 14.5,
            "end": 30.0,
            "source_start": 0.0,
            "source_end": 15.5,
            "crop": { "x": 0, "y": 0, "width": 1920, "height": 1080 },
            "transform": { "scale": 1.0, "x": 0, "y": 0, "rotation": 0 },
            "transition_in": {
              "type": "cross_dissolve",
              "duration": 0.5
            },
            "transition_out": null
          }
        ]
      },
      {
        "id": "track-character",
        "type": "image",
        "name": "Character Overlay",
        "clips": [
          {
            "id": "clip-char-1",
            "source": "assets/characters/bima_default.png",
            "start": 0.5,
            "end": 5.0,
            "source_start": null,
            "source_end": null,
            "chroma_key": {
              "enabled": true,
              "color": "#00FF00",
              "similarity": 0.15,
              "smoothness": 0.05
            },
            "transform": { "scale": 0.8, "x": -200, "y": 50, "rotation": 0 },
            "transition_in": {
              "type": "fade_in",
              "duration": 0.3
            },
            "transition_out": {
              "type": "fade_out",
              "duration": 0.3
            }
          }
        ]
      },
      {
        "id": "track-subtitle",
        "type": "subtitle",
        "name": "Subtitle",
        "clips": [
          {
            "id": "clip-sub-1",
            "start": 0.5,
            "end": 4.3,
            "text": "Kita harus segera bergegas sebelum fajar menyingsing.",
            "style": {
              "font_family": "Noto Sans",
              "font_size": 32,
              "font_weight": "bold",
              "color": "#FFFFFF",
              "background_color": "rgba(0,0,0,0.6)",
              "border_radius": 8,
              "position": "bottom_center",
              "offset_y": -60
            }
          }
        ]
      },
      {
        "id": "track-voice",
        "type": "audio",
        "name": "Voiceover (TTS)",
        "clips": [
          {
            "id": "clip-audio-tts-1",
            "source": "cache/audio/sc01_bima.wav",
            "start": 0.5,
            "end": 4.3,
            "source_start": 0.0,
            "source_end": 3.8,
            "volume": 1.0,
            "fade_in": 0.0,
            "fade_out": 0.1
          }
        ]
      },
      {
        "id": "track-bgm",
        "type": "audio",
        "name": "BGM (Manual Import)",
        "clips": [
          {
            "id": "clip-audio-bgm-1",
            "source": "assets/audio/epic_adventure.mp3",
            "start": 0.0,
            "end": 65.0,
            "source_start": 0.0,
            "source_end": 65.0,
            "volume": 0.3,
            "fade_in": 2.0,
            "fade_out": 3.0
          }
        ]
      }
    ]
  },
  "export_presets": {
    "default": "mp4_1080p",
    "presets": [
      {
        "id": "mp4_1080p",
        "label": "MP4 1080p (H.264)",
        "format": "mp4",
        "codec": "h264",
        "width": 1920,
        "height": 1080,
        "fps": 30,
        "bitrate": "8M",
        "audio_codec": "aac",
        "audio_bitrate": "192k"
      },
      {
        "id": "mp4_4k",
        "label": "MP4 4K (H.265)",
        "format": "mp4",
        "codec": "hevc",
        "width": 3840,
        "height": 2160,
        "fps": 30,
        "bitrate": "25M",
        "audio_codec": "aac",
        "audio_bitrate": "320k"
      },
      {
        "id": "webm_1080p",
        "label": "WebM 1080p (VP9)",
        "format": "webm",
        "codec": "vp9",
        "width": 1920,
        "height": 1080,
        "fps": 30,
        "bitrate": "6M",
        "audio_codec": "opus",
        "audio_bitrate": "128k"
      },
      {
        "id": "mov_prores",
        "label": "MOV ProRes (High Quality)",
        "format": "mov",
        "codec": "prores_ks",
        "width": 1920,
        "height": 1080,
        "fps": 30,
        "bitrate": "auto",
        "audio_codec": "pcm_s16le",
        "audio_bitrate": "auto"
      },
      {
        "id": "gif_480p",
        "label": "GIF 480p (Animasi Pendek)",
        "format": "gif",
        "codec": "gif",
        "width": 854,
        "height": 480,
        "fps": 15,
        "bitrate": "auto",
        "audio_codec": null,
        "audio_bitrate": null
      },
      {
        "id": "mp4_shorts_1080",
        "label": "MP4 Shorts/Reels 9:16 1080p",
        "format": "mp4",
        "codec": "h264",
        "width": 1080,
        "height": 1920,
        "fps": 30,
        "bitrate": "8M",
        "audio_codec": "aac",
        "audio_bitrate": "192k"
      }
    ]
  }
}
```

### Penjelasan Field Penting

| Field | Keterangan |
|-------|-----------|
| `meta.aspect_ratio` | Rasio aspek canvas proyek: `16:9`, `9:16`, `1:1`, `4:3`, `21:9` |
| `ai_settings` | Konfigurasi global engine AI per fitur (TTS, Image Gen, Auto Subtitle). Setiap provider memiliki `config` sendiri (path model lokal atau API key env). |
| `clips[].source_start` / `source_end` | **Trim in/out point** — titik awal/akhir yang dipakai dari file sumber asli. Berbeda dengan `start`/`end` yang merupakan posisi clip di timeline. Misal: file video 60 detik, tapi hanya dipakai detik ke-2 sampai ke-17. |
| `clips[].transition_in` / `transition_out` | Efek transisi masuk/keluar klip. Tipe: `fade_in`, `fade_out`, `cross_dissolve`, `wipe_left`, `wipe_right`, `slide_up`, `slide_down`. |
| `clips[].chroma_key` | Pengaturan chroma keying per klip (warna kunci, toleransi, kehalusan). |
| Track `type: "subtitle"` | Track khusus teks/subtitle dengan styling (font, warna, posisi, background). |
| Track `type: "audio"` (BGM) | Audio yang di-import manual oleh user (bukan dari TTS). Mendukung `fade_in`/`fade_out` per klip. |
| `export_presets` | Daftar preset export yang bisa dipilih user (MP4/WebM/MOV/GIF, berbagai resolusi & orientasi). |

---

## 3. Real-Time Chroma Keying Shader (GLSL)

Untuk menjaga preview tetap ringan (60 FPS) tanpa merender ulang video dengan CPU, digunakan fragment shader WebGL berikut pada canvas preview:

```glsl
precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec3 uKeyColor;     // misal: vec3(0.0, 1.0, 0.0) untuk hijau
uniform float uSimilarity;  // rentang toleransi warna (misal: 0.2)
uniform float uSmoothness;  // kehalusan tepian (misal: 0.1)

void main(void) {
    vec4 texColor = texture2D(uSampler, vTextureCoord);
    float diff = distance(texColor.rgb, uKeyColor);
    float alpha = smoothstep(uSimilarity, uSimilarity + uSmoothness, diff);
    gl_FragColor = vec4(texColor.rgb, texColor.a * alpha);
}
```

---

## 4. Transition Blending Shader (GLSL)

Shader untuk preview transisi antar-klip secara real-time:

```glsl
precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uTextureFrom;  // klip sebelumnya
uniform sampler2D uTextureTo;    // klip berikutnya
uniform float uProgress;         // 0.0 → 1.0 (dari awal ke akhir transisi)
uniform int uTransitionType;     // 0=dissolve, 1=wipe_left, 2=fade

void main(void) {
    vec4 colorFrom = texture2D(uTextureFrom, vTextureCoord);
    vec4 colorTo   = texture2D(uTextureTo, vTextureCoord);

    if (uTransitionType == 0) {
        // Cross Dissolve
        gl_FragColor = mix(colorFrom, colorTo, uProgress);
    } else if (uTransitionType == 1) {
        // Wipe Left
        float edge = step(vTextureCoord.x, uProgress);
        gl_FragColor = mix(colorFrom, colorTo, edge);
    } else {
        // Fade through black
        float mid = 0.5;
        if (uProgress < mid) {
            gl_FragColor = mix(colorFrom, vec4(0.0, 0.0, 0.0, 1.0), uProgress / mid);
        } else {
            gl_FragColor = mix(vec4(0.0, 0.0, 0.0, 1.0), colorTo, (uProgress - mid) / mid);
        }
    }
}
```

---

## 5. Pipeline Rendering FFmpeg (Final Export)

Saat tombol **Export Video** ditekan, Rust membaca `export_presets` dan menyusun filter complex FFmpeg:

### Contoh Command untuk Export MP4 1080p dengan Chroma Key + Transisi + Subtitle

```bash
ffmpeg \
  -i assets/footage/forest.mp4 \
  -i assets/characters/bima_default.png \
  -i assets/audio/epic_adventure.mp3 \
  -filter_complex "
    [0:v]trim=start=2:end=17,setpts=PTS-STARTPTS,crop=1920:1080:0:0[bg];
    [1:v]chromakey=color=0x00FF00:similarity=0.15:blend=0.05,
         scale=iw*0.8:ih*0.8[char];
    [bg][char]overlay=x=760:y=490,
         drawtext=text='Kita harus segera bergegas':
         fontsize=32:fontcolor=white:
         x=(w-text_w)/2:y=h-100:
         enable='between(t,0.5,4.3)'[outv]
  " \
  -map "[outv]" -map 2:a \
  -c:v h264 -b:v 8M -r 30 \
  -c:a aac -b:a 192k \
  -t 65 output.mp4
```

### Matriks Akselerasi Hardware (Auto-Detect di Rust)

| Platform | Encoder Utama | Fallback |
|----------|--------------|----------|
| **Windows** | `h264_nvenc` (Nvidia), `h264_qsv` (Intel), `h264_amf` (AMD) | `libx264` |
| **macOS** | `h264_videotoolbox` (Apple Silicon & Intel) | `libx264` |
| **Linux** | `h264_nvenc`, `h264_vaapi` | `libx264` |

---

## 6. Mekanisme Auto-Save & Crash Recovery

### Alur Auto-Save
1. **Timer Periodic**: Setiap 60 detik (konfigurabel), state proyek lengkap ditulis ke `~/.kreatif-studio/autosave/<project-id>.autosave.json`.
2. **Event-Triggered Save**: Selain timer, auto-save juga dipicu oleh aksi penting: menambah/menghapus klip, mengubah urutan track, mengubah pengaturan karakter/episode.
3. **Lock File**: Saat proyek dibuka, dibuat file `.lock` untuk mencegah double-open.

### Alur Crash Recovery
```
Aplikasi dibuka
       |
       v
Cek apakah ada file .autosave.json yang lebih baru dari .kreatif.json utama?
       |
   Ya -+-> Tampilkan dialog: "Ditemukan sesi sebelumnya yang belum tersimpan.
       |    Pulihkan atau abaikan?"
       |       |
       |   [Pulihkan] -> Muat .autosave.json ke state
       |   [Abaikan]  -> Hapus .autosave.json, muat file utama
       |
  Tidak -> Muat file proyek utama seperti biasa
```

---

## 7. Undo/Redo System

Menggunakan **Command Pattern** pada state timeline:

1. Setiap aksi user (add clip, move clip, trim, delete, change property) dicatat sebagai sebuah `Command` object yang memiliki method `execute()` dan `undo()`.
2. Riwayat disimpan dalam dua stack: `undoStack` dan `redoStack`.
3. `Ctrl+Z` → pop dari `undoStack`, panggil `undo()`, push ke `redoStack`.
4. `Ctrl+Shift+Z` / `Ctrl+Y` → pop dari `redoStack`, panggil `execute()`, push ke `undoStack`.
5. Saat user melakukan aksi baru, `redoStack` dikosongkan.
