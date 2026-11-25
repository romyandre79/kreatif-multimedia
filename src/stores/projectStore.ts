import { create } from "zustand";
import { generateElevenLabsSpeech } from "../services/elevenlabs";
import { generateSynthesizedVoiceWav } from "../services/localTts";
import { generateNaturalSpeechAudio } from "../services/naturalTts";
import { optimizeImageToDataUrl, fileToDataUrl, saveProjectToIndexedDB, loadProjectFromIndexedDB } from "../services/persistentMedia";
import { ImageAnimationConfig } from "../services/imageAnimationPresets";
import { CameraMotionConfig, DEFAULT_CAMERA_MOTION } from "../services/cameraMotion";
import { clampNonOverlappingPosition, clampNonOverlappingTrim, reorderClipsOnTrack } from "../services/timelineCollision";
import { addCustomAudioToStorage, ScrapedAudioItem } from "../services/audioScraper";

// --- Types ---

export interface CharacterVoice {
  engine: string;
  voice_id: string;
  pitch: number;
  speed: number;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  avatar: string;
  assets: string[];
  voice: CharacterVoice;
}

export interface Scene {
  scene_id: string;
  character_id: string; // ID Karakter, "image" (Gambar), "video" (Video), "audio" (Audio), atau "" (Narasi)
  script: string;
  audio_url: string;
  duration: number;
  media_url?: string;
  media_type?: "image" | "video" | "audio";
}

export interface Episode {
  id: string;
  title: string;
  scenes: Scene[];
}

export interface Transition {
  type: string;
  duration: number;
}

export interface TextAnimation {
  preset: string; // ID Preset dari textAnimationPresets.ts (misal: "fade", "pop", "slide_up", "zoom_in", "glow", dll)
  duration: number; // Durasi animasi dalam detik (default 0.3s - 1.5s)
}

export interface KeyframeProperties {
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  volume?: number;
  speed?: number; // Kecepatan playback pada keyframe (0.25x - 8.0x)
}

export interface Keyframe {
  id: string;
  time: number; // detik relatif terhadap durasi klip (0 <= time <= clipDuration)
  properties: KeyframeProperties;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
}

export interface Clip {
  id: string;
  trackId: string;
  characterId?: string; // ID Karakter pemilik klip ini (untuk cascading delete)
  source?: string;
  text?: string;
  start: number;
  end: number;
  source_start: number | null;
  source_end: number | null;
  maxDuration?: number; // Batas durasi maksimal klip (dari file master audio / video / gambar)
  crop?: { x: number; y: number; width: number; height: number };
  transform?: { scale: number; x: number; y: number; rotation: number };
  chroma_key?: {
    enabled: boolean;
    color: string;
    similarity: number;
    smoothness: number;
  };
  transition_in: Transition | null;
  transition_out: Transition | null;
  text_animation?: TextAnimation | null;
  image_animation?: ImageAnimationConfig | null;
  volume?: number;
  muted?: boolean; // Status audio aktif/nonaktif pada video atau audio klip
  opacity?: number;
  playbackSpeed?: number; // Kecepatan putar dasar klip video/audio (misal 1.0, 1.5, 2.0, 4.0)
  keyframes?: Keyframe[];
  fade_in?: number;
  fade_out?: number;
  style?: Record<string, unknown>;
}

export interface Track {
  id: string;
  type: "video" | "image" | "audio" | "subtitle";
  name: string;
  clips: Clip[];
  locked?: boolean;
  muted?: boolean;
  visible?: boolean;
}

export interface AudioProviderWeb {
  id: string;
  name: string;
  url: string;
  category: "free" | "paid" | "freemium";
  description: string;
  apiEndpoint?: string;
  apiKey?: string;
}

export interface AiProviderConfig {
  tts: {
    provider: "piper_local" | "elevenlabs" | "openai_tts";
    localModelPath: string;
    apiKey: string;
    elevenLabsVoiceId?: string;
    elevenLabsModelId?: string;
  };
  imageGen: {
    provider: "gemini_flow" | "comfy_local" | "fal_ai" | "openai_dalle" | "midjourney";
    endpoint: string;
    apiKey: string;
  };
  autoSubtitle: {
    provider: "whisper_local" | "whisper_api";
    modelSize: "tiny" | "base" | "small" | "medium";
    apiKey: string;
  };
  audioProviders?: AudioProviderWeb[];
}

export interface ProjectMeta {
  title: string;
  description?: string;
  resolution: { width: number; height: number };
  aspect_ratio: string;
  fps: number;
  duration: number;
  camera?: CameraMotionConfig;
}

export interface TimelineState {
  tracks: Track[];
}

export interface AutoSaveConfig {
  enabled: boolean;
  intervalMinutes: number; // Interval auto-save dalam menit (1, 2, 5, 10, dll)
  lastSavedAt: string | null;
}

interface ProjectStore {
  meta: ProjectMeta;
  characters: Character[];
  episodes: Episode[];
  timeline: TimelineState;
  aiSettings: AiProviderConfig;
  autoSaveConfig: AutoSaveConfig;
  currentTime: number;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  selectedClipId: string | null;
  zoomLevel: number; // pixels per second

  // History & File I/O Actions
  resetNewProject: (options?: {
    title?: string;
    description?: string;
    aspect_ratio?: string;
    resolution?: { width: number; height: number };
    fps?: number;
  }) => void;
  setProjectTitle: (title: string) => void;
  updateAutoSaveConfig: (config: Partial<AutoSaveConfig>) => void;
  triggerAutoSaveNow: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveProjectToJson: () => void;
  loadProjectFromJson: (jsonData: any) => void;
  importMediaFile: (file: File) => void;
  setCurrentTime: (time: number) => void;
  setSelectedClipId: (clipId: string | null) => void;
  setZoomLevel: (zoom: number) => void;
  updateAiSettings: (settings: Partial<AiProviderConfig>) => void;
  addCharacter: (charData?: Partial<Character>) => string;
  updateCharacter: (charId: string, updates: Partial<Character>) => void;
  deleteCharacter: (charId: string) => void;
  addCharacterAsset: (charId: string, assetUrl: string) => void;
  removeCharacterAsset: (charId: string, assetIndex: number) => void;
  // Episode & Scene CRUD Actions
  addEpisode: (title?: string) => string;
  updateEpisode: (episodeId: string, updates: Partial<Episode>) => void;
  deleteEpisode: (episodeId: string) => void;
  addSceneToEpisode: (episodeId: string, sceneData?: Partial<Scene>) => string;
  insertSceneAfter: (episodeId: string, afterSceneId: string, sceneData?: Partial<Scene>) => string;
  updateScene: (episodeId: string, sceneId: string, updates: Partial<Scene>) => void;
  deleteScene: (episodeId: string, sceneId: string) => void;
  reorderScenes: (episodeId: string, sourceIndex: number, destIndex: number) => void;
  generateSceneAudio: (episodeId: string, sceneId: string) => Promise<string>;
  insertSceneToTimeline: (episodeId: string, sceneId: string, audioOnly?: boolean) => void;
  insertEpisodeToTimeline: (episodeId: string, audioOnly?: boolean) => void;
  addTrack: (type: Track["type"]) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  removeTrack: (trackId: string) => void;
  reorderTracks: (sourceIndex: number, destIndex: number) => void;

  // Clip Timeline Actions
  addClipToTrack: (trackId: string, clipData: Partial<Clip>) => void;
  updateClipPosition: (clipId: string, newStart: number, targetTrackId?: string) => void;
  trimClip: (clipId: string, edge: "left" | "right", newTime: number, initialClipState?: { start: number; end: number; source_start: number }) => void;
  splitClipAtTime: (clipId: string, splitTime: number) => void;
  deleteSelectedClip: () => void;
  updateClipProperties: (clipId: string, props: Partial<Clip>) => void;
  addOrUpdateKeyframe: (clipId: string, time: number, properties: KeyframeProperties, easing?: Keyframe["easing"]) => void;
  removeKeyframe: (clipId: string, keyframeId: string) => void;
  clearAllKeyframes: (clipId: string) => void;
  resetClipTransform: (clipId: string) => void;

  // Camera Motion Actions
  updateCameraMotion: (updates: Partial<CameraMotionConfig>) => void;
  resetCameraMotion: () => void;
}

let _idCounter = 0;
export function genId(prefix: string) {
  _idCounter++;
  return `${prefix}-${Date.now()}-${_idCounter}`;
}

// Snapshot stack untuk Undo / Redo
interface HistorySnapshot {
  timeline: TimelineState;
  characters: Character[];
  episodes: Episode[];
  meta: ProjectMeta;
}

const undoStack: HistorySnapshot[] = [];
const redoStack: HistorySnapshot[] = [];

// Shallow/selective clone snapshot yang tidak menggandakan string base64/media besar berulang kali di RAM
function captureSnapshot(state: {
  timeline: TimelineState;
  characters: Character[];
  episodes: Episode[];
  meta: ProjectMeta;
}): HistorySnapshot {
  return {
    meta: { ...state.meta },
    characters: state.characters.map((c) => ({ ...c, assets: [...c.assets], voice: { ...c.voice } })),
    episodes: state.episodes.map((ep) => ({
      ...ep,
      scenes: ep.scenes.map((sc) => ({ ...sc })),
    })),
    timeline: {
      tracks: state.timeline.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => ({
          ...c,
          transform: c.transform ? { ...c.transform } : undefined,
          chroma_key: c.chroma_key ? { ...c.chroma_key } : undefined,
          transition_in: c.transition_in ? { ...c.transition_in } : null,
          transition_out: c.transition_out ? { ...c.transition_out } : null,
          keyframes: c.keyframes ? c.keyframes.map((kf) => ({ ...kf, properties: { ...kf.properties } })) : undefined,
        })),
      })),
    },
  };
}

export function pushUndoState(state: {
  timeline: TimelineState;
  characters: Character[];
  episodes: Episode[];
  meta: ProjectMeta;
}) {
  undoStack.push(captureSnapshot(state));
  // Batasi maksimal 15 snapshot untuk menghemat memory RAM secara drastis
  if (undoStack.length > 15) {
    undoStack.shift();
  }
  redoStack.length = 0; // Hapus riwayat redo setiap ada perubahan baru
}

// Helper untuk membuat struktur proyek baru yang bersih
export function createEmptyProjectData() {
  const charId = genId("char");
  return {
    meta: {
      title: "Proyek Baru",
      description: "",
      resolution: { width: 1920, height: 1080 },
      aspect_ratio: "16:9",
      fps: 30,
      duration: 30,
      camera: { ...DEFAULT_CAMERA_MOTION },
    },
    characters: [
      {
        id: charId,
        name: "Karakter Utama",
        description: "Deskripsi karakter...",
        avatar: "",
        assets: [],
        voice: {
          engine: "inherit",
          voice_id: "21m00Tcm4TlvDq8ikWAM",
          pitch: 1.0,
          speed: 1.0,
        },
      },
    ],
    episodes: [
      {
        id: genId("ep"),
        title: "Episode 1",
        scenes: [
          {
            scene_id: genId("sc"),
            character_id: charId,
            script: "Tulis naskah dialog pertama di sini...",
            audio_url: "",
            duration: 3.5,
          },
        ],
      },
    ],
    timeline: {
      tracks: [
        {
          id: genId("track-video"),
          type: "video" as const,
          name: "Video 1",
          clips: [],
        },
        {
          id: genId("track-image"),
          type: "image" as const,
          name: "Gambar 1",
          clips: [],
        },
        {
          id: genId("track-audio"),
          type: "audio" as const,
          name: "Audio 1",
          clips: [],
        },
        {
          id: genId("track-sub"),
          type: "subtitle" as const,
          name: "Subtitle 1",
          clips: [],
        },
      ],
    },
  };
}

const LOCAL_STORAGE_KEY = "kreatif_studio_autosave_v1";
const AI_SETTINGS_STORAGE_KEY = "kreatif_studio_ai_settings_v1";

function getSavedAiSettings(): Partial<AiProviderConfig> | undefined {
  try {
    const saved = localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Gagal load AI settings dari localStorage:", e);
  }
  return undefined;
}

// Coba muat proyek yang tersimpan di browser / desktop, atau mulai proyek baru jika belum pernah ada
function getInitialProjectData() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.timeline && parsed.meta) {
        return {
          meta: parsed.meta,
          characters: parsed.characters || [],
          episodes: parsed.episodes || [],
          timeline: parsed.timeline,
          aiSettings: parsed.ai_settings || parsed.aiSettings || undefined,
        };
      }
    }
  } catch (e) {
    console.warn("Gagal load saved project dari storage:", e);
  }
  return createEmptyProjectData();
}

const initialData = getInitialProjectData();

const savedAiCfg = getSavedAiSettings();

export const DEFAULT_AUDIO_PROVIDERS: AudioProviderWeb[] = [
  {
    id: "youtube_audio",
    name: "YouTube Audio Library",
    url: "https://studio.youtube.com/channel/UCIK169Te0HXnijNsrRFExRg/music",
    category: "free",
    description: "Koleksi musik & SFX resmi bebas klaim hak cipta dari YouTube Studio untuk kreator.",
  },
  {
    id: "freesound",
    name: "Freesound.org",
    url: "https://freesound.org",
    category: "free",
    description: "Database 500,000+ efek suara & musik gratis lisensi Creative Commons (Mendukung Freesound API Key).",
    apiKey: "",
  },
  {
    id: "pixabay_music",
    name: "Pixabay Music & SFX",
    url: "https://pixabay.com/music",
    category: "free",
    description: "Musik latar bebas royalti & sound effects untuk konten komersial tanpa atribusi.",
  },
  {
    id: "incompetech",
    name: "Incompetech (Kevin MacLeod)",
    url: "https://incompetech.com/music/royalty-free/music.html",
    category: "free",
    description: "Koleksi musik latar sinematik legendaris bebas royalti.",
  },
  {
    id: "freemusicarchive",
    name: "Free Music Archive (FMA)",
    url: "https://freemusicarchive.org",
    category: "free",
    description: "Kurasi musik berkualitas tinggi dari musisi independen seluruh dunia.",
  },
  {
    id: "artlist",
    name: "Artlist.io",
    url: "https://artlist.io",
    category: "paid",
    description: "Katalog musik & SFX sinematik premium kelas Hollywood untuk kreator pro.",
  },
  {
    id: "epidemic_sound",
    name: "Epidemic Sound",
    url: "https://www.epidemicsound.com",
    category: "paid",
    description: "Pustaka 40,000+ lagu berlisensi bebas klaim hak cipta untuk YouTube/TikTok/Film.",
  },
  {
    id: "audiio",
    name: "Audiio.com",
    url: "https://audiio.com",
    category: "paid",
    description: "Layanan musik latar & SFX sinematik berbayar dengan opsi lisensi lifetime.",
  },
];

export const useProjectStore = create<ProjectStore>((set, get) => ({
  meta: initialData.meta,
  characters: initialData.characters,
  episodes: initialData.episodes,
  timeline: initialData.timeline,

  aiSettings: {
    tts: {
      provider: "elevenlabs",
      localModelPath: "models/piper/id_ID-medium.onnx",
      apiKey: "",
      elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM",
      elevenLabsModelId: "eleven_multilingual_v2",
      ...((initialData as any).aiSettings?.tts || {}),
      ...(savedAiCfg?.tts || {}),
    },
    imageGen: {
      provider: "gemini_flow",
      endpoint: "http://127.0.0.1:8188",
      apiKey: "",
      ...((initialData as any).aiSettings?.imageGen || {}),
      ...(savedAiCfg?.imageGen || {}),
    },
    autoSubtitle: {
      provider: "whisper_local",
      modelSize: "base",
      apiKey: "",
      ...((initialData as any).aiSettings?.autoSubtitle || {}),
      ...(savedAiCfg?.autoSubtitle || {}),
    },
    audioProviders:
      (initialData as any).aiSettings?.audioProviders ||
      savedAiCfg?.audioProviders ||
      DEFAULT_AUDIO_PROVIDERS,
  },

  autoSaveConfig: (initialData as any).autoSaveConfig || {
    enabled: true,
    intervalMinutes: 1, // Default auto-save setiap 1 menit
    lastSavedAt: null,
  },

  currentTime: 0,
  isPlaying: false,
  selectedClipId: null,
  zoomLevel: 30, // 30px per detik

  resetNewProject: (options) => {
    // Simpan snapshot untuk undo jika pengguna tidak sengaja reset
    undoStack.push(captureSnapshot(get()));
    const freshData = createEmptyProjectData();

    if (options) {
      if (options.title) freshData.meta.title = options.title.trim();
      if (options.description !== undefined) freshData.meta.description = options.description.trim();
      if (options.aspect_ratio) freshData.meta.aspect_ratio = options.aspect_ratio;
      if (options.resolution) freshData.meta.resolution = options.resolution;
      if (options.fps) freshData.meta.fps = options.fps;
    }

    localStorage.removeItem(LOCAL_STORAGE_KEY);
    set({
      meta: freshData.meta,
      characters: freshData.characters,
      episodes: freshData.episodes,
      timeline: freshData.timeline,
      currentTime: 0,
      selectedClipId: null,
    });
  },

  updateAutoSaveConfig: (config) =>
    set((state) => ({
      autoSaveConfig: {
        ...state.autoSaveConfig,
        ...config,
      },
    })),

  triggerAutoSaveNow: () => {
    const state = get();
    try {
      const nowStr = new Date().toLocaleTimeString();
      const projectData = {
        version: "1.0.0",
        saved_at: new Date().toISOString(),
        meta: state.meta,
        ai_settings: state.aiSettings,
        auto_save_config: state.autoSaveConfig,
        characters: state.characters,
        episodes: state.episodes,
        timeline: state.timeline,
      };

      // 1. Simpan ke IndexedDB (Kapasitas tidak terbatas, mampu menampung file video/audio base64 ratusan MB)
      saveProjectToIndexedDB(projectData).catch((err) => {
        console.warn("Gagal simpan ke IndexedDB:", err);
      });

      // 2. Coba simpan salinan ke localStorage jika ukuran mencukupi
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projectData));
      } catch (lsErr) {
        // localStorage kuota 5MB biasanya penuh jika ada video, ini normal dan aman karena IndexedDB sudah menyimpan lengkap
        console.info("Ukuran data melampaui kuota 5MB localStorage, data tersimpan aman di IndexedDB.");
      }

      set((s) => ({
        autoSaveConfig: { ...s.autoSaveConfig, lastSavedAt: nowStr },
      }));
    } catch (err) {
      console.warn("Manual/Auto-save error:", err);
    }
  },

  setProjectTitle: (title) =>
    set((state) => ({
      meta: { ...state.meta, title: title.trim() || "Proyek Tanpa Judul" },
    })),

  setCurrentTime: (time) =>
    set({ currentTime: Math.max(0, Math.min(time, get().meta.duration)) }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setSelectedClipId: (clipId) => set({ selectedClipId: clipId }),

  setZoomLevel: (zoom) => set({ zoomLevel: Math.max(10, Math.min(zoom, 120)) }),

  updateAiSettings: (settings) =>
    set((state) => {
      const merged = {
        ...state.aiSettings,
        ...settings,
        tts: {
          ...state.aiSettings.tts,
          ...(settings.tts || {}),
        },
        imageGen: {
          ...state.aiSettings.imageGen,
          ...(settings.imageGen || {}),
        },
        autoSubtitle: {
          ...state.aiSettings.autoSubtitle,
          ...(settings.autoSubtitle || {}),
        },
        audioProviders: settings.audioProviders || state.aiSettings.audioProviders || DEFAULT_AUDIO_PROVIDERS,
      };

      try {
        localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      } catch (e) {
        console.warn("Gagal simpan AI settings ke localStorage:", e);
      }

      return {
        aiSettings: merged,
      };
    }),

  addCharacter: (charData) => {
    const newId = genId("char");
    set((state) => ({
      characters: [
        ...state.characters,
        {
          id: newId,
          name: charData?.name || `Karakter ${state.characters.length + 1}`,
          description: charData?.description || "",
          avatar: charData?.avatar || "",
          assets: charData?.assets || [],
          voice: charData?.voice || {
            engine: "piper_local",
            voice_id: "id_ID-default",
            pitch: 1.0,
            speed: 1.0,
          },
        },
      ],
    }));
    return newId;
  },

  updateCharacter: (charId, updates) =>
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === charId ? { ...c, ...updates } : c
      ),
    })),

  deleteCharacter: (charId) =>
    set((state) => {
      // Cari data karakter yang akan dihapus
      const targetChar = state.characters.find((c) => c.id === charId);
      const charAssets = targetChar ? [targetChar.avatar, ...targetChar.assets].filter(Boolean) : [];

      // 1. Filter tracks di Timeline: Hapus klip yang berhubungan dengan karakter ini
      // (Berdasarkan characterId, aset gambar karakter, atau suara TTS karakter)
      const updatedTracks = state.timeline.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((clip) => {
          // Jika klip punya explicit characterId
          if (clip.characterId === charId) return false;

          // Jika klip gambar menggunakan salah satu aset/avatar karakter ini
          if (track.type === "image" && clip.source && charAssets.includes(clip.source)) {
            return false;
          }

          return true;
        }),
      }));

      // 2. Filter naskah episode: Bersihkan relasi character_id di scenes
      const updatedEpisodes = state.episodes.map((ep) => ({
        ...ep,
        scenes: ep.scenes.map((sc) =>
          sc.character_id === charId ? { ...sc, character_id: "" } : sc
        ),
      }));

      return {
        characters: state.characters.filter((c) => c.id !== charId),
        timeline: {
          ...state.timeline,
          tracks: updatedTracks,
        },
        episodes: updatedEpisodes,
        selectedClipId: null,
      };
    }),

  addCharacterAsset: (charId, assetUrl) =>
    set((state) => ({
      characters: state.characters.map((c) => {
        if (c.id !== charId) return c;
        const assets = [...c.assets, assetUrl];
        // Jika belum ada avatar, jadikan aset pertama sebagai avatar
        const avatar = c.avatar || assetUrl;
        return { ...c, assets, avatar };
      }),
    })),

  removeCharacterAsset: (charId, assetIndex) =>
    set((state) => ({
      characters: state.characters.map((c) => {
        if (c.id !== charId) return c;
        const assets = c.assets.filter((_, idx) => idx !== assetIndex);
        const avatar = c.avatar === c.assets[assetIndex] ? (assets[0] || "") : c.avatar;
        return { ...c, assets, avatar };
      }),
    })),

  addEpisode: (title) => {
    const newId = genId("ep");
    set((state) => ({
      episodes: [
        ...state.episodes,
        {
          id: newId,
          title: title || `Episode ${state.episodes.length + 1}`,
          scenes: [
            {
              scene_id: genId("sc"),
              character_id: state.characters[0]?.id || "",
              script: "Tulis naskah dialog untuk scene pertama di sini...",
              audio_url: "",
              duration: 4.0,
            },
          ],
        },
      ],
    }));
    return newId;
  },

  updateEpisode: (episodeId, updates) =>
    set((state) => ({
      episodes: state.episodes.map((ep) =>
        ep.id === episodeId ? { ...ep, ...updates } : ep
      ),
    })),

  deleteEpisode: (episodeId) =>
    set((state) => ({
      episodes: state.episodes.filter((ep) => ep.id !== episodeId),
    })),

  addSceneToEpisode: (episodeId, sceneData) => {
    const newSceneId = genId("sc");
    set((state) => ({
      episodes: state.episodes.map((ep) => {
        if (ep.id !== episodeId) return ep;
        const newScene: Scene = {
          scene_id: newSceneId,
          character_id: sceneData?.character_id || state.characters[0]?.id || "",
          script: sceneData?.script || `Scene ${ep.scenes.length + 1}: dialog baru...`,
          audio_url: sceneData?.audio_url || "",
          duration: sceneData?.duration || 3.5,
          media_url: sceneData?.media_url || "",
          media_type: sceneData?.media_type,
        };
        return { ...ep, scenes: [...ep.scenes, newScene] };
      }),
    }));
    return newSceneId;
  },

  insertSceneAfter: (episodeId, afterSceneId, sceneData) => {
    const newSceneId = genId("sc");
    set((state) => ({
      episodes: state.episodes.map((ep) => {
        if (ep.id !== episodeId) return ep;
        const newScene: Scene = {
          scene_id: newSceneId,
          character_id: sceneData?.character_id || state.characters[0]?.id || "",
          script: sceneData?.script || `Scene baru...`,
          audio_url: sceneData?.audio_url || "",
          duration: sceneData?.duration || 3.5,
          media_url: sceneData?.media_url || "",
          media_type: sceneData?.media_type,
        };
        const idx = ep.scenes.findIndex((sc) => sc.scene_id === afterSceneId);
        const newScenes = [...ep.scenes];
        if (idx !== -1) {
          newScenes.splice(idx + 1, 0, newScene);
        } else {
          newScenes.push(newScene);
        }
        return { ...ep, scenes: newScenes };
      }),
    }));
    return newSceneId;
  },

  updateScene: (episodeId, sceneId, updates) =>
    set((state) => ({
      episodes: state.episodes.map((ep) => {
        if (ep.id !== episodeId) return ep;
        return {
          ...ep,
          scenes: ep.scenes.map((sc) =>
            sc.scene_id === sceneId ? { ...sc, ...updates } : sc
          ),
        };
      }),
    })),

  deleteScene: (episodeId, sceneId) =>
    set((state) => ({
      episodes: state.episodes.map((ep) => {
        if (ep.id !== episodeId) return ep;
        return {
          ...ep,
          scenes: ep.scenes.filter((sc) => sc.scene_id !== sceneId),
        };
      }),
    })),

  reorderScenes: (episodeId, sourceIndex, destIndex) =>
    set((state) => ({
      episodes: state.episodes.map((ep) => {
        if (ep.id !== episodeId) return ep;
        const newScenes = [...ep.scenes];
        const [moved] = newScenes.splice(sourceIndex, 1);
        newScenes.splice(destIndex, 0, moved);
        return {
          ...ep,
          scenes: newScenes,
        };
      }),
    })),

  generateSceneAudio: async (episodeId, sceneId) => {
    const state = get();
    const episode = state.episodes.find((e) => e.id === episodeId);
    const scene = episode?.scenes.find((s) => s.scene_id === sceneId);
    if (!scene) return "";

    const character = state.characters.find((c) => c.id === scene.character_id);

    // Prioritas Voice Engine:
    // Selalu ambil dari AI Engine setting (elevenlabs / piper_local / dll), kecuali karakter secara spesifik meng-override engine
    const globalTtsEngine = state.aiSettings.tts.provider || "elevenlabs";
    const voiceEngine = character && character.voice.engine && character.voice.engine !== "inherit"
      ? character.voice.engine
      : globalTtsEngine;

    // Pilihan Voice ID:
    // Jika narasi (tanpa karakter) atau karakter inherit, utamakan voice ID dari setting AI Engine
    const voiceId =
      (character?.voice.engine === "elevenlabs" && character.voice.voice_id) ||
      state.aiSettings.tts.elevenLabsVoiceId ||
      character?.voice.voice_id ||
      "21m00Tcm4TlvDq8ikWAM";

    // 1. JIKA MENGGUNAKAN ELEVENLABS CLOUD API
    if (voiceEngine === "elevenlabs") {
      const apiKey = state.aiSettings.tts.apiKey;
      if (!apiKey) {
        alert("API Key ElevenLabs belum diisi! Silakan klik menu 'AI Engine' di toolbar atas untuk memasukkan API Key.");
        throw new Error("ElevenLabs API Key belum diisi.");
      }

      try {
        const { audioUrl, duration } = await generateElevenLabsSpeech(
          apiKey,
          voiceId,
          scene.script,
          0.5,
          0.75,
          state.aiSettings.tts.elevenLabsModelId || "eleven_multilingual_v2"
        );

        get().updateScene(episodeId, sceneId, {
          audio_url: audioUrl,
          duration,
        });

        return audioUrl;
      } catch (err: any) {
        alert(`Gagal generate ElevenLabs: ${err.message}`);
        throw err;
      }
    }

    // 2. PIPER / LOKAL TTS NYATA (DENGAN NATIVE AUDIO & NATURAL SPEECH)
    try {
      // Coba generate natural speech audio URL terlebih dahulu
      let generatedAudioUrl = "";
      let generatedDuration = 3.0;

      try {
        const naturalRes = await generateNaturalSpeechAudio(scene.script, "id");
        if (naturalRes.audioUrl) {
          generatedAudioUrl = naturalRes.audioUrl;
          generatedDuration = naturalRes.duration;
        }
      } catch (e) {
        console.warn("Natural speech online fallback, trying synthesized wav:", e);
      }

      // Jika belum ada URL, gunakan synthesized WAV buffer lokal
      if (!generatedAudioUrl) {
        const wavRes = await generateSynthesizedVoiceWav(
          scene.script,
          character?.voice.speed || 1.0
        );
        generatedAudioUrl = wavRes.audioUrl;
        generatedDuration = wavRes.duration;
      }

      get().updateScene(episodeId, sceneId, {
        audio_url: generatedAudioUrl,
        duration: generatedDuration,
      });

      return generatedAudioUrl;
    } catch (err: any) {
      console.warn("Lokal TTS fallback:", err);
      // Fallback synthesizer WAV murni (100% playable via Blob)
      const wavRes = await generateSynthesizedVoiceWav(scene.script, 1.0);
      get().updateScene(episodeId, sceneId, {
        audio_url: wavRes.audioUrl,
        duration: wavRes.duration,
      });

      return wavRes.audioUrl;
    }
  },

  insertSceneToTimeline: (episodeId, sceneId, audioOnly = false) => {
    const state = get();
    const episode = state.episodes.find((e) => e.id === episodeId);
    const scene = episode?.scenes.find((s) => s.scene_id === sceneId);
    if (!scene) return;

    const character = state.characters.find((c) => c.id === scene.character_id);
    const speakerLabel = character?.name || (scene.character_id === "" ? "Narasi" : "Dialog");

    let audioTrack = state.timeline.tracks.find((t) => t.type === "audio");
    if (!audioTrack) {
      get().addTrack("audio");
      audioTrack = get().timeline.tracks.find((t) => t.type === "audio");
    }
    let subTrack = state.timeline.tracks.find((t) => t.type === "subtitle");
    if (!subTrack) {
      get().addTrack("subtitle");
      subTrack = get().timeline.tracks.find((t) => t.type === "subtitle");
    }

    const startTime = state.currentTime;
    const clipDur = scene.duration || 3.5;
    const endTime = startTime + clipDur;

    // 1. Masukkan Audio TTS / rekaman / audio scene ke Track Audio jika ada
    const effectiveAudioUrl = scene.media_type === "audio" ? (scene.media_url || scene.audio_url) : scene.audio_url;
    if (audioTrack && effectiveAudioUrl) {
      get().addClipToTrack(audioTrack.id, {
        characterId: character?.id,
        source: effectiveAudioUrl,
        text: scene.script || (scene.media_type === "audio" ? "Audio Scene" : undefined),
        start: startTime,
        end: endTime,
        maxDuration: clipDur, // kunci batas durasi master audio
        volume: 1.0,
      });
    }

    // 2. Masukkan Media Visual (Image / Video) jika scene memiliki media visual
    if (scene.media_url && scene.media_type !== "audio") {
      const isVideo = scene.media_type === "video" || scene.media_url.startsWith("data:video/") || scene.media_url.includes(".mp4");
      const targetType = isVideo ? "video" : "image";
      let visualTrack = state.timeline.tracks.find((t) => t.type === targetType);
      if (!visualTrack) {
        get().addTrack(targetType);
        visualTrack = get().timeline.tracks.find((t) => t.type === targetType);
      }
      if (visualTrack) {
        get().addClipToTrack(visualTrack.id, {
          characterId: character?.id,
          source: scene.media_url,
          start: startTime,
          end: endTime,
          maxDuration: clipDur, // kunci batas durasi master visual
        });
      }
    } else if (!audioOnly && character?.avatar) {
      // Jika scene tidak punya media visual spesifik tapi ada karakter dan bukan audioOnly, masukkan avatar karakter ke track gambar
      let charTrack = state.timeline.tracks.find((t) => t.type === "image");
      if (!charTrack) {
        get().addTrack("image");
        charTrack = get().timeline.tracks.find((t) => t.type === "image");
      }
      if (charTrack) {
        get().addClipToTrack(charTrack.id, {
          characterId: character.id,
          source: character.avatar,
          start: startTime,
          end: endTime,
          maxDuration: clipDur,
          chroma_key: {
            enabled: true,
            color: "#00FF00",
            similarity: 0.15,
            smoothness: 0.05,
          },
        });
      }
    }

    // 3. Masukkan Subtitle teks naskah jika ada teks naskah dan BUKAN scene murni media (video/image/audio)
    // Untuk scene video, gambar, atau audio, teks di scene hanyalah prompt/deskripsi/judul media sehingga tidak dikirim ke subtitle
    const isPureMediaScene = scene.media_type === "video" || scene.media_type === "image" || scene.media_type === "audio";
    if (!audioOnly && !isPureMediaScene && subTrack && scene.script && scene.script.trim()) {
      get().addClipToTrack(subTrack.id, {
        characterId: character?.id,
        text: `[${speakerLabel}]: ${scene.script}`,
        start: startTime,
        end: endTime,
        maxDuration: clipDur,
      });
    }

    // Geser playhead ke akhir klip yang baru dimasukkan agar penambahan scene berikutnya menyambung otomatis
    get().setCurrentTime(endTime);
  },

  insertEpisodeToTimeline: (episodeId, audioOnly = false) => {
    const state = get();
    pushUndoState(state);
    const episode = state.episodes.find((e) => e.id === episodeId);
    if (!episode || episode.scenes.length === 0) return;

    for (const scene of episode.scenes) {
      get().insertSceneToTimeline(episodeId, scene.scene_id, audioOnly);
    }
  },

  addTrack: (type) =>
    set((state) => {
      pushUndoState(state);
      const typeNames: Record<string, string> = {
        video: "Video",
        image: "Gambar",
        audio: "Audio",
        subtitle: "Subtitle",
      };
      const count = state.timeline.tracks.filter((t) => t.type === type).length;
      return {
        timeline: {
          ...state.timeline,
          tracks: [
            ...state.timeline.tracks,
            {
              id: genId(`track-${type}`),
              type,
              name: `${typeNames[type]} ${count + 1}`,
              clips: [],
              visible: true,
              locked: false,
              muted: false,
            },
          ],
        },
      };
    }),

  updateTrack: (trackId, updates) =>
    set((state) => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.map((t) =>
          t.id === trackId ? { ...t, ...updates } : t
        ),
      },
    })),

  removeTrack: (trackId) =>
    set((state) => {
      pushUndoState(state);
      return {
        timeline: {
          ...state.timeline,
          tracks: state.timeline.tracks.filter((t) => t.id !== trackId),
        },
      };
    }),

  reorderTracks: (sourceIndex, destIndex) =>
    set((state) => {
      const newTracks = [...state.timeline.tracks];
      const [removed] = newTracks.splice(sourceIndex, 1);
      newTracks.splice(destIndex, 0, removed);
      return {
        timeline: {
          ...state.timeline,
          tracks: newTracks,
        },
      };
    }),

  addClipToTrack: (trackId, clipData) =>
    set((state) => {
      pushUndoState(state);
      const track = state.timeline.tracks.find((t) => t.id === trackId);
      if (!track) return state;

      const duration = (clipData.end ?? 5) - (clipData.start ?? 0);
      const clipDuration = duration > 0 ? duration : 5;

      let start = clipData.start !== undefined ? clipData.start : state.currentTime;
      let end = clipData.end !== undefined ? clipData.end : start + clipDuration;

      // Smart Placement (Anti-Overlap):
      // Jika penempatan klip baru menumpuk klip yang sudah ada di track ini,
      // otomatis cari posisi kosong pertama setelah klip yang bertabrakan.
      if (track.clips.length > 0) {
        // Urutkan klip yang sudah ada berdasarkan waktu mulai
        const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);

        // Periksa apakah waktu saat ini bertabrakan dengan klip yang ada
        let adjustedStart = start;
        for (const existingClip of sortedClips) {
          // Tabrakan terjadi jika interval waktu overlap
          if (adjustedStart < existingClip.end && (adjustedStart + clipDuration) > existingClip.start) {
            // Geser start ke akhir klip yang bertabrakan
            adjustedStart = existingClip.end;
          }
        }
        start = adjustedStart;
        end = start + clipDuration;
      }

      const newClip: Clip = {
        id: genId("clip"),
        trackId,
        source: clipData.source,
        text: clipData.text,
        source_start: 0,
        source_end: null,
        transition_in: null,
        transition_out: null,
        ...clipData,
        // Pastikan start dan end yang sudah bebas tabrakan digunakan
        start,
        end,
      };

      const updatedTracks = state.timeline.tracks.map((t) =>
        t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t
      );

      // Otomatis sesuaikan durasi total timeline jika melebihi durasi sekarang
      const maxEnd = Math.max(state.meta.duration, newClip.end + 5);

      return {
        timeline: { ...state.timeline, tracks: updatedTracks },
        selectedClipId: newClip.id,
        // JANGAN ubah state.currentTime di addClipToTrack agar klip-klip paralel di track lain tetap menggunakan start time yang sama
        meta: { ...state.meta, duration: maxEnd },
      };
    }),

  updateClipPosition: (clipId, newStart, targetTrackId) =>
    set((state) => {
      let movedClip: Clip | null = null;
      let currentTrackId = "";

      // Cari clip yang digeser
      for (const track of state.timeline.tracks) {
        const found = track.clips.find((c) => c.id === clipId);
        if (found) {
          movedClip = found;
          currentTrackId = track.id;
          break;
        }
      }

      if (!movedClip) return state;
      pushUndoState(state);

      const duration = movedClip.end - movedClip.start;
      const destTrackId = targetTrackId || currentTrackId;
      const destTrack = state.timeline.tracks.find((t) => t.id === destTrackId);

      // Kunci posisi start agar TIDAK PERNAH menimpa/menabrak klip lain di track ini
      const nonOverlappingStart = destTrack
        ? clampNonOverlappingPosition(destTrack.clips, clipId, newStart, duration)
        : Math.max(0, newStart);

      const validStart = nonOverlappingStart;
      const validEnd = validStart + duration;

      // Update clips
      const updatedTracks = state.timeline.tracks.map((track) => {
        // Hapus dari track lama jika pindah track
        if (track.id === currentTrackId && destTrackId !== currentTrackId) {
          return {
            ...track,
            clips: track.clips.filter((c) => c.id !== clipId),
          };
        }

        // Tambah ke track baru jika pindah track
        if (track.id === destTrackId && destTrackId !== currentTrackId) {
          return {
            ...track,
            clips: [
              ...track.clips,
              {
                ...movedClip!,
                trackId: destTrackId,
                start: validStart,
                end: validEnd,
              },
            ],
          };
        }

        // Update di track yang sama (gunakan reorderClipsOnTrack agar klip bisa dipindah dan di-reorder urutan posisinya di layer yang sama)
        if (track.id === currentTrackId && destTrackId === currentTrackId) {
          const reorderedClips = reorderClipsOnTrack(track.clips, clipId, newStart);
          return {
            ...track,
            clips: reorderedClips,
          };
        }

        return track;
      });

      const maxEnd = Math.max(state.meta.duration, validEnd + 5);

      return {
        timeline: { ...state.timeline, tracks: updatedTracks },
        meta: { ...state.meta, duration: maxEnd },
      };
    }),

  trimClip: (clipId, edge, newTime, initialClipState) =>
    set((state) => {
      pushUndoState(state);
      const updatedTracks = state.timeline.tracks.map((track) => {
        const containsClip = track.clips.some((c) => c.id === clipId);
        if (!containsClip) return track;

        // Hitung batas aman trim anti-overlap dengan klip tetangga
        const safeTrimmedTime = clampNonOverlappingTrim(track.clips, clipId, edge, newTime);

        return {
          ...track,
          clips: track.clips.map((clip) => {
            if (clip.id !== clipId) return clip;

            const maxAllowed = clip.maxDuration || (clip.end - clip.start);

            if (edge === "left") {
              // Pemotongan dari kiri ke kanan (Trim In):
              // newTime adalah posisi playhead/kursor baru yang bergerak ke kanan memotong klip.
              // Batas: tidak boleh mendahului klip sebelumnya, dan tidak boleh melewati akhir klip (sisakan minimal 0.2s).
              const baseStart = initialClipState ? initialClipState.start : clip.start;
              const baseSourceStart = initialClipState ? initialClipState.source_start : (clip.source_start || 0);

              const minStart = clip.end - maxAllowed;
              const validStart = Math.max(minStart, Math.max(0, Math.min(safeTrimmedTime, clip.end - 0.2)));

              // Selisih berapa detik awal video yang telah dipotong dari titik awal drag
              const deltaTrim = validStart - baseStart;
              const newSourceStart = Math.max(0, baseSourceStart + deltaTrim);

              return {
                ...clip,
                start: validStart,
                source_start: newSourceStart,
                maxDuration: maxAllowed,
              };
            } else {
              // Trim kanan: memperpendek atau memotong akhir klip
              const maxEnd = clip.start + maxAllowed;
              const validEnd = Math.min(maxEnd, Math.max(clip.start + 0.2, safeTrimmedTime));
              return { ...clip, end: validEnd, maxDuration: maxAllowed };
            }
          }),
        };
      });

      return {
        timeline: { ...state.timeline, tracks: updatedTracks },
      };
    }),

  splitClipAtTime: (clipId, splitTime) =>
    set((state) => {
      const updatedTracks = state.timeline.tracks.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === clipId);
        if (clipIdx === -1) return track;

        const original = track.clips[clipIdx];
        if (splitTime <= original.start + 0.1 || splitTime >= original.end - 0.1) {
          return track; // Tidak bisa split jika terlalu dekat ujung
        }
        pushUndoState(state);

        const leftClip: Clip = {
          ...original,
          end: splitTime,
        };

        const rightClip: Clip = {
          ...original,
          id: genId("clip"),
          start: splitTime,
          source_start: original.source_start != null ? original.source_start + (splitTime - original.start) : null,
        };

        const newClips = [...track.clips];
        newClips.splice(clipIdx, 1, leftClip, rightClip);

        return { ...track, clips: newClips };
      });

      return {
        timeline: { ...state.timeline, tracks: updatedTracks },
      };
    }),

  deleteSelectedClip: () =>
    set((state) => {
      if (!state.selectedClipId) return state;
      pushUndoState(state);

      const updatedTracks = state.timeline.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((c) => c.id !== state.selectedClipId),
      }));

      return {
        timeline: { ...state.timeline, tracks: updatedTracks },
        selectedClipId: null,
      };
    }),

  updateClipProperties: (clipId, props) =>
    set((state) => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...props } : c)),
        })),
      },
    })),

  addOrUpdateKeyframe: (clipId, time, properties, easing = "linear") =>
    set((state) => {
      const updatedTracks = state.timeline.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id !== clipId) return clip;
          const keyframes = clip.keyframes ? [...clip.keyframes] : [];
          // Cek apakah sudah ada keyframe pada waktu yang sangat berdekatan (< 0.05 detik)
          const existingIdx = keyframes.findIndex((kf) => Math.abs(kf.time - time) < 0.05);

          if (existingIdx !== -1) {
            keyframes[existingIdx] = {
              ...keyframes[existingIdx],
              time,
              properties: {
                ...keyframes[existingIdx].properties,
                ...properties,
              },
              easing: easing || keyframes[existingIdx].easing,
            };
          } else {
            keyframes.push({
              id: genId("kf"),
              time,
              properties,
              easing,
            });
          }

          // Urutkan keyframe ascending berdasarkan waktu
          keyframes.sort((a, b) => a.time - b.time);

          return { ...clip, keyframes };
        }),
      }));

      return {
        timeline: { ...state.timeline, tracks: updatedTracks },
      };
    }),

  removeKeyframe: (clipId, keyframeId) =>
    set((state) => {
      pushUndoState(state);
      const updatedTracks = state.timeline.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id !== clipId || !clip.keyframes) return clip;
          const remaining = clip.keyframes.filter((kf) => kf.id !== keyframeId);
          // Jika seluruh keyframe sudah dihapus, kembalikan nilai transform & opacity ke posisi default awal
          if (remaining.length === 0) {
            return {
              ...clip,
              keyframes: [],
              transform: { scale: 1, x: 0, y: 0, rotation: 0 },
              opacity: 1,
            };
          }
          return {
            ...clip,
            keyframes: remaining,
          };
        }),
      }));

      return {
        timeline: { ...state.timeline, tracks: updatedTracks },
      };
    }),

  clearAllKeyframes: (clipId) =>
    set((state) => {
      pushUndoState(state);
      const updatedTracks = state.timeline.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id !== clipId) return clip;
          return {
            ...clip,
            keyframes: [],
            transform: { scale: 1, x: 0, y: 0, rotation: 0 },
            opacity: 1,
            volume: clip.volume !== undefined ? 1 : undefined,
          };
        }),
      }));

      return {
        timeline: { ...state.timeline, tracks: updatedTracks },
      };
    }),

  resetClipTransform: (clipId) =>
    set((state) => {
      pushUndoState(state);
      const updatedTracks = state.timeline.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id !== clipId) return clip;
          return {
            ...clip,
            keyframes: [],
            transform: { scale: 1, x: 0, y: 0, rotation: 0 },
            opacity: 1,
            crop: { x: 0, y: 0, width: 1920, height: 1080 },
          };
        }),
      }));

      return {
        timeline: { ...state.timeline, tracks: updatedTracks },
      };
    }),

  // --- UNDO / REDO ---
  undo: () => {
    if (undoStack.length === 0) return;
    const currentState = get();
    // Simpan state saat ini ke redo stack
    redoStack.push(captureSnapshot(currentState));

    const prevSnapshot = undoStack.pop()!;
    set({
      timeline: prevSnapshot.timeline,
      characters: prevSnapshot.characters,
      episodes: prevSnapshot.episodes,
      meta: prevSnapshot.meta,
    });
  },

  redo: () => {
    if (redoStack.length === 0) return;
    const currentState = get();
    // Simpan state saat ini ke undo stack
    undoStack.push(captureSnapshot(currentState));

    const nextSnapshot = redoStack.pop()!;
    set({
      timeline: nextSnapshot.timeline,
      characters: nextSnapshot.characters,
      episodes: nextSnapshot.episodes,
      meta: nextSnapshot.meta,
    });
  },

  canUndo: () => undoStack.length > 0,
  canRedo: () => redoStack.length > 0,

  // --- SAVE PROJECT TO JSON (DOWNLOAD FILE .kreatif.json) ---
  saveProjectToJson: () => {
    // Pastikan input aktif yang belum di-blur tersinkron sebelum diekspor
    if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
      document.activeElement.blur();
    }

    const state = get();
    // Sinkronkan juga ke local storage sebagai checkpoint
    try {
      get().triggerAutoSaveNow();
    } catch {
      // Abaikan jika storage error
    }

    const projectData = {
      version: "1.0.0",
      saved_at: new Date().toISOString(),
      meta: state.meta,
      ai_settings: state.aiSettings,
      auto_save_config: state.autoSaveConfig,
      characters: state.characters,
      episodes: state.episodes,
      timeline: state.timeline,
    };

    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const safeTitle = (state.meta.title || "proyek_kreatif").toLowerCase().replace(/[^a-z0-9]/g, "_");
    a.href = url;
    a.download = `${safeTitle}_${timestamp}.kreatif.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // --- LOAD PROJECT FROM JSON ---
  loadProjectFromJson: (jsonData) => {
    if (!jsonData || !jsonData.timeline) return;
    // Push current to undo
    undoStack.push(captureSnapshot(get()));
    set({
      meta: jsonData.meta || get().meta,
      aiSettings: jsonData.ai_settings || jsonData.aiSettings || get().aiSettings,
      autoSaveConfig: jsonData.auto_save_config || jsonData.autoSaveConfig || get().autoSaveConfig,
      characters: jsonData.characters || [],
      episodes: jsonData.episodes || [],
      timeline: jsonData.timeline,
      selectedClipId: null,
      currentTime: 0,
    });
  },

  // --- IMPORT MEDIA FILE DIRECTLY TO TIMELINE ---
  importMediaFile: async (file) => {
    const state = get();
    undoStack.push(captureSnapshot(state));
    redoStack.length = 0; // Clear redo

    const fileType = file.type;
    let persistentUrl = "";
    try {
      if (fileType.startsWith("image/")) {
        persistentUrl = await optimizeImageToDataUrl(file);
      } else {
        persistentUrl = await fileToDataUrl(file);
      }
    } catch {
      persistentUrl = URL.createObjectURL(file);
    }

    let targetTrackType: Track["type"] = "video";
    if (fileType.startsWith("image/")) targetTrackType = "image";
    else if (fileType.startsWith("audio/")) targetTrackType = "audio";
    else if (fileType.startsWith("video/")) targetTrackType = "video";

    let track = state.timeline.tracks.find((t) => t.type === targetTrackType);
    if (!track) {
      track = state.timeline.tracks[0];
    }

    if (track) {
      let measuredDuration = targetTrackType === "image" ? 5 : 8;

      if (targetTrackType === "audio") {
        measuredDuration = await new Promise<number>((resolve) => {
          const a = new Audio(persistentUrl);
          a.onloadedmetadata = () => {
            const d = isNaN(a.duration) || !isFinite(a.duration) ? 8 : parseFloat(a.duration.toFixed(2));
            resolve(d);
          };
          a.onerror = () => resolve(8);
          setTimeout(() => resolve(8), 2000);
        });
      } else if (targetTrackType === "video") {
        measuredDuration = await new Promise<number>((resolve) => {
          const v = document.createElement("video");
          v.src = persistentUrl;
          v.onloadedmetadata = () => {
            const d = isNaN(v.duration) || !isFinite(v.duration) ? 8 : parseFloat(v.duration.toFixed(2));
            resolve(d);
          };
          v.onerror = () => resolve(8);
          setTimeout(() => resolve(8), 2000);
        });
      }

      const start = state.currentTime;
      const end = start + measuredDuration;

      const newClip: Clip = {
        id: genId("clip"),
        trackId: track.id,
        source: persistentUrl,
        start,
        end,
        maxDuration: measuredDuration, // Kunci durasi master file audio/video saat di-import
        source_start: 0,
        source_end: measuredDuration,
        transform: { scale: 1, x: 0, y: 0, rotation: 0 },
        crop: { x: 0, y: 0, width: 1920, height: 1080 },
        transition_in: null,
        transition_out: null,
      };

      if (targetTrackType === "audio") {
        newClip.volume = 1.0;

        // Simpan juga audio yang di-upload manual ini ke Pustaka Audios / AudioVault
        const audioTitle = file.name.replace(/\.[^/.]+$/, "");
        const newAudioItem: ScrapedAudioItem = {
          id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: audioTitle,
          providerId: "local_upload",
          sourceName: "Upload Lokal",
          category: measuredDuration > 30 ? "bgm" : "sfx",
          durationStr: `${Math.floor(measuredDuration / 60)}:${Math.floor(measuredDuration % 60).toString().padStart(2, "0")}`,
          durationSec: measuredDuration,
          url: persistentUrl,
          license: "free",
          author: "User",
          tags: ["local", "upload"],
          scrapedAt: new Date().toISOString(),
        };
        addCustomAudioToStorage(newAudioItem).catch((err) => {
          console.warn("Gagal auto-simpan audio ke Pustaka Audios:", err);
        });
      }

      get().addClipToTrack(track.id, newClip);
      get().setCurrentTime(end);
    }
  },

  updateCameraMotion: (updates) => {
    pushUndoState(get());
    set((state) => {
      const currentCamera = state.meta.camera || { ...DEFAULT_CAMERA_MOTION };
      return {
        meta: {
          ...state.meta,
          camera: {
            ...currentCamera,
            ...updates,
          },
        },
      };
    });
  },

  resetCameraMotion: () => {
    pushUndoState(get());
    set((state) => ({
      meta: {
        ...state.meta,
        camera: { ...DEFAULT_CAMERA_MOTION },
      },
    }));
  },
}));

// Secara asinkron muat data dari IndexedDB saat inisialisasi awal
// Ini memastikan file video/audio besar yang tersimpan di IndexedDB langsung terisi ke store setelah refresh
setTimeout(async () => {
  try {
    const idbData = await loadProjectFromIndexedDB();
    if (idbData && idbData.timeline && idbData.meta) {
      useProjectStore.setState({
        meta: idbData.meta,
        characters: idbData.characters || [],
        episodes: idbData.episodes || [],
        timeline: idbData.timeline,
        ...(idbData.ai_settings ? { aiSettings: idbData.ai_settings } : {}),
      });
    }
  } catch (e) {
    console.warn("Init load from IndexedDB error:", e);
  }
}, 20);

// Auto-save timer interval dinamis tanpa perlu mendownload/membuat file baru
let _autoSaveTimer: ReturnType<typeof setInterval> | null = null;

function setupAutoSaveTimer(intervalMinutes: number, enabled: boolean) {
  if (_autoSaveTimer) {
    clearInterval(_autoSaveTimer);
    _autoSaveTimer = null;
  }

  if (!enabled || intervalMinutes <= 0) return;

  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
  _autoSaveTimer = setInterval(() => {
    useProjectStore.getState().triggerAutoSaveNow();
  }, intervalMs);
}

// Inisialisasi timer awal
setupAutoSaveTimer(
  initialData && (initialData as any).autoSaveConfig?.intervalMinutes
    ? (initialData as any).autoSaveConfig.intervalMinutes
    : 1,
  initialData && (initialData as any).autoSaveConfig?.enabled !== false
);

// Listener perubahan pengaturan auto-save
useProjectStore.subscribe((state, prevState) => {
  if (
    state.autoSaveConfig.enabled !== prevState.autoSaveConfig.enabled ||
    state.autoSaveConfig.intervalMinutes !== prevState.autoSaveConfig.intervalMinutes
  ) {
    setupAutoSaveTimer(
      state.autoSaveConfig.intervalMinutes,
      state.autoSaveConfig.enabled
    );
  }
});
