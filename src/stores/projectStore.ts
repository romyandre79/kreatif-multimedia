import { create } from "zustand";
import { generateElevenLabsSpeech } from "../services/elevenlabs";
import { generateSynthesizedVoiceWav } from "../services/localTts";
import { generateNaturalSpeechAudio } from "../services/naturalTts";
import { generateEpicBgmWav, generateHeroVoiceWav } from "../services/demoAudio";

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
  character_id: string;
  script: string;
  audio_url: string;
  duration: number;
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
  volume?: number;
  fade_in?: number;
  fade_out?: number;
  style?: Record<string, unknown>;
}

export interface Track {
  id: string;
  type: "video" | "image" | "audio" | "subtitle";
  name: string;
  clips: Clip[];
}

export interface AiProviderConfig {
  tts: {
    provider: "piper_local" | "elevenlabs" | "openai_tts";
    localModelPath: string;
    apiKey: string;
    elevenLabsVoiceId?: string;
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
}

export interface ProjectMeta {
  title: string;
  resolution: { width: number; height: number };
  aspect_ratio: string;
  fps: number;
  duration: number;
}

export interface TimelineState {
  tracks: Track[];
}

interface ProjectStore {
  meta: ProjectMeta;
  characters: Character[];
  episodes: Episode[];
  timeline: TimelineState;
  aiSettings: AiProviderConfig;
  currentTime: number;
  selectedClipId: string | null;
  zoomLevel: number; // pixels per second

  // History & File I/O Actions
  resetNewProject: () => void;
  setProjectTitle: (title: string) => void;
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
  updateScene: (episodeId: string, sceneId: string, updates: Partial<Scene>) => void;
  deleteScene: (episodeId: string, sceneId: string) => void;
  generateSceneAudio: (episodeId: string, sceneId: string) => Promise<string>;
  insertSceneToTimeline: (episodeId: string, sceneId: string) => void;
  insertEpisodeToTimeline: (episodeId: string) => void;
  addTrack: (type: Track["type"]) => void;
  removeTrack: (trackId: string) => void;

  // Clip Timeline Actions
  addClipToTrack: (trackId: string, clipData: Partial<Clip>) => void;
  updateClipPosition: (clipId: string, newStart: number, targetTrackId?: string) => void;
  trimClip: (clipId: string, edge: "left" | "right", newTime: number) => void;
  splitClipAtTime: (clipId: string, splitTime: number) => void;
  deleteSelectedClip: () => void;
  updateClipProperties: (clipId: string, props: Partial<Clip>) => void;
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

function captureSnapshot(state: {
  timeline: TimelineState;
  characters: Character[];
  episodes: Episode[];
  meta: ProjectMeta;
}): HistorySnapshot {
  return JSON.parse(
    JSON.stringify({
      timeline: state.timeline,
      characters: state.characters,
      episodes: state.episodes,
      meta: state.meta,
    })
  );
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  meta: {
    title: "Petualangan Ksatria Mystica",
    resolution: { width: 1920, height: 1080 },
    aspect_ratio: "16:9",
    fps: 30,
    duration: 15,
  },

  characters: [
    {
      id: "char-1",
      name: "Bima Arya",
      description: "Pendekar muda tangguh berambut perak dan berjubah merah dari Kerajaan Mystica.",
      avatar: "/demo/hero_avatar.svg",
      assets: [
        "/demo/hero_avatar.svg"
      ],
      voice: {
        engine: "piper_local",
        voice_id: "id_ID-bima-medium",
        pitch: 1.0,
        speed: 1.0,
      },
    },
  ],

  episodes: [
    {
      id: "ep-1",
      title: "Episode 1: Perjalanan di Hutan Larangan",
      scenes: [
        {
          scene_id: "sc-1",
          character_id: "char-1",
          script: "Bulan purnama telah terbit sempurna. Kita harus segera tiba di kuil sebelum gerbang tertutup!",
          audio_url: "",
          duration: 6.0,
        },
      ],
    },
  ],

  timeline: {
    tracks: [
      {
        id: "track-video-1",
        type: "video",
        name: "Background Hutan",
        clips: [
          {
            id: "clip-demo-bg",
            trackId: "track-video-1",
            source: "/demo/forest_bg.svg",
            start: 0,
            end: 12,
            source_start: 0,
            source_end: 12,
            crop: { x: 0, y: 0, width: 1920, height: 1080 },
            transform: { scale: 1, x: 0, y: 0, rotation: 0 },
            transition_in: null,
            transition_out: null,
          },
        ],
      },
      {
        id: "track-char-1",
        type: "image",
        name: "Karakter Bima",
        clips: [
          {
            id: "clip-demo-char",
            trackId: "track-char-1",
            characterId: "char-1",
            source: "/demo/hero_avatar.svg",
            start: 1.0,
            end: 9.0,
            source_start: null,
            source_end: null,
            transform: { scale: 0.75, x: -180, y: 60, rotation: 0 },
            transition_in: { type: "fade_in", duration: 0.5 },
            transition_out: { type: "fade_out", duration: 0.5 },
          },
        ],
      },
      {
        id: "track-audio-1",
        type: "audio",
        name: "Voice Bima (TTS)",
        clips: [
          {
            id: "clip-demo-audio",
            trackId: "track-audio-1",
            characterId: "char-1",
            source: generateHeroVoiceWav(),
            start: 1.2,
            end: 7.2,
            source_start: 0,
            source_end: 6.0,
            volume: 1.0,
            fade_in: 0.1,
            fade_out: 0.2,
            transition_in: null,
            transition_out: null,
          },
        ],
      },
      {
        id: "track-audio-bgm",
        type: "audio",
        name: "Musik Latar (MP3 / BGM)",
        clips: [
          {
            id: "clip-demo-bgm",
            trackId: "track-audio-bgm",
            source: generateEpicBgmWav(),
            start: 0,
            end: 15.0,
            source_start: 0,
            source_end: 15.0,
            volume: 0.45,
            fade_in: 1.0,
            fade_out: 1.5,
            transition_in: null,
            transition_out: null,
          },
        ],
      },
      {
        id: "track-sub-1",
        type: "subtitle",
        name: "Subtitle Naskah",
        clips: [
          {
            id: "clip-demo-sub",
            trackId: "track-sub-1",
            characterId: "char-1",
            text: "Bulan purnama telah terbit. Kita harus tiba sebelum gerbang tertutup!",
            start: 1.2,
            end: 7.2,
            source_start: null,
            source_end: null,
            transition_in: null,
            transition_out: null,
            style: {
              font_size: 26,
              color: "#FFFFFF",
              background_color: "rgba(0,0,0,0.8)",
            },
          },
        ],
      },
    ],
  },

  aiSettings: {
    tts: {
      provider: "piper_local",
      localModelPath: "models/piper/id_ID-medium.onnx",
      apiKey: "",
      elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM",
    },
    imageGen: {
      provider: "gemini_flow",
      endpoint: "http://127.0.0.1:8188",
      apiKey: "",
    },
    autoSubtitle: {
      provider: "whisper_local",
      modelSize: "base",
      apiKey: "",
    },
  },

  currentTime: 0,
  selectedClipId: "clip-demo-video",
  zoomLevel: 30, // 30px per detik

  resetNewProject: () => {
    // Simpan snapshot untuk undo jika pengguna tidak sengaja reset
    undoStack.push(captureSnapshot(get()));
    set({
      meta: {
        title: "Proyek Baru",
        resolution: { width: 1920, height: 1080 },
        aspect_ratio: "16:9",
        fps: 30,
        duration: 30,
      },
      characters: [
        {
          id: genId("char"),
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
              character_id: "",
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
            type: "video",
            name: "Video 1",
            clips: [],
          },
          {
            id: genId("track-image"),
            type: "image",
            name: "Gambar 1",
            clips: [],
          },
          {
            id: genId("track-audio"),
            type: "audio",
            name: "Audio 1",
            clips: [],
          },
          {
            id: genId("track-sub"),
            type: "subtitle",
            name: "Subtitle 1",
            clips: [],
          },
        ],
      },
      currentTime: 0,
      selectedClipId: null,
    });
  },

  setProjectTitle: (title) =>
    set((state) => ({
      meta: { ...state.meta, title: title.trim() || "Proyek Tanpa Judul" },
    })),

  setCurrentTime: (time) =>
    set({ currentTime: Math.max(0, Math.min(time, get().meta.duration)) }),

  setSelectedClipId: (clipId) => set({ selectedClipId: clipId }),

  setZoomLevel: (zoom) => set({ zoomLevel: Math.max(10, Math.min(zoom, 120)) }),

  updateAiSettings: (settings) =>
    set((state) => ({
      aiSettings: {
        ...state.aiSettings,
        ...settings,
      },
    })),

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
        };
        return { ...ep, scenes: [...ep.scenes, newScene] };
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

  generateSceneAudio: async (episodeId, sceneId) => {
    const state = get();
    const episode = state.episodes.find((e) => e.id === episodeId);
    const scene = episode?.scenes.find((s) => s.scene_id === sceneId);
    if (!scene) return "";

    const character = state.characters.find((c) => c.id === scene.character_id);

    // Prioritas Voice Engine:
    // Jika AI Setting memilih "elevenlabs", gunakan ElevenLabs secara global kecuali karakter secara eksplisit di-override
    const globalTtsEngine = state.aiSettings.tts.provider || "piper_local";
    const voiceEngine = character?.voice.engine === "inherit" || !character?.voice.engine
      ? globalTtsEngine
      : character.voice.engine || globalTtsEngine;

    const voiceId =
      (character?.voice.engine === "elevenlabs" && character.voice.voice_id) ||
      state.aiSettings.tts.elevenLabsVoiceId ||
      character?.voice.voice_id ||
      "21m00Tcm4TlvDq8ikWAM";

    // 1. JIKA MENGGUNAKAN ELEVENLABS CLOUD API
    if (voiceEngine === "elevenlabs") {
      const apiKey = state.aiSettings.tts.apiKey;
      if (!apiKey) {
        alert("API Key ElevenLabs belum diisi! Silakan buka menu 'AI Engine' di toolbar untuk memasukkan API Key.");
        throw new Error("ElevenLabs API Key belum diisi.");
      }

      try {
        const { audioUrl, duration } = await generateElevenLabsSpeech(
          apiKey,
          voiceId,
          scene.script
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

  insertSceneToTimeline: (episodeId, sceneId) => {
    const state = get();
    const episode = state.episodes.find((e) => e.id === episodeId);
    const scene = episode?.scenes.find((s) => s.scene_id === sceneId);
    if (!scene) return;

    const character = state.characters.find((c) => c.id === scene.character_id);

    // Cari atau buat track
    let subTrack = state.timeline.tracks.find((t) => t.type === "subtitle");
    let audioTrack = state.timeline.tracks.find((t) => t.type === "audio");
    let charTrack = state.timeline.tracks.find((t) => t.type === "image");

    const startTime = state.currentTime;
    const endTime = startTime + scene.duration;

    // 1. Masukkan Subtitle
    if (subTrack) {
      get().addClipToTrack(subTrack.id, {
        characterId: character?.id,
        text: `[${character?.name || "Karakter"}]: ${scene.script}`,
        start: startTime,
        end: endTime,
      });
    }

    // 2. Masukkan Audio
    if (audioTrack && scene.audio_url) {
      get().addClipToTrack(audioTrack.id, {
        characterId: character?.id,
        source: scene.audio_url,
        start: startTime,
        end: endTime,
        volume: 1.0,
      });
    }

    // 3. Masukkan Avatar Karakter jika ada
    if (charTrack && character?.avatar) {
      get().addClipToTrack(charTrack.id, {
        characterId: character?.id,
        source: character.avatar,
        start: startTime,
        end: endTime,
        chroma_key: {
          enabled: true,
          color: "#00FF00",
          similarity: 0.15,
          smoothness: 0.05,
        },
      });
    }

    // Geser playhead ke akhir scene yang baru dimasukkan
    get().setCurrentTime(endTime);
  },

  insertEpisodeToTimeline: (episodeId) => {
    const state = get();
    const episode = state.episodes.find((e) => e.id === episodeId);
    if (!episode || episode.scenes.length === 0) return;

    for (const scene of episode.scenes) {
      get().insertSceneToTimeline(episodeId, scene.scene_id);
    }
  },

  addTrack: (type) =>
    set((state) => {
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
            },
          ],
        },
      };
    }),

  removeTrack: (trackId) =>
    set((state) => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.filter((t) => t.id !== trackId),
      },
    })),

  addClipToTrack: (trackId, clipData) =>
    set((state) => {
      const track = state.timeline.tracks.find((t) => t.id === trackId);
      if (!track) return state;

      const newClip: Clip = {
        id: genId("clip"),
        trackId,
        start: clipData.start ?? state.currentTime,
        end: clipData.end ?? state.currentTime + 5,
        source: clipData.source,
        text: clipData.text,
        source_start: 0,
        source_end: null,
        transition_in: null,
        transition_out: null,
        ...clipData,
      };

      const updatedTracks = state.timeline.tracks.map((t) =>
        t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t
      );

      // Otomatis sesuaikan durasi jika melebihi durasi sekarang
      const maxEnd = Math.max(state.meta.duration, newClip.end + 5);

      return {
        timeline: { ...state.timeline, tracks: updatedTracks },
        selectedClipId: newClip.id,
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

      const duration = movedClip.end - movedClip.start;
      const validStart = Math.max(0, newStart);
      const validEnd = validStart + duration;
      const destTrackId = targetTrackId || currentTrackId;

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

        // Update di track yang sama
        if (track.id === currentTrackId && destTrackId === currentTrackId) {
          return {
            ...track,
            clips: track.clips.map((c) =>
              c.id === clipId ? { ...c, start: validStart, end: validEnd } : c
            ),
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

  trimClip: (clipId, edge, newTime) =>
    set((state) => {
      const updatedTracks = state.timeline.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id !== clipId) return clip;

          if (edge === "left") {
            const validStart = Math.max(0, Math.min(newTime, clip.end - 0.2));
            return { ...clip, start: validStart };
          } else {
            const validEnd = Math.max(clip.start + 0.2, newTime);
            return { ...clip, end: validEnd };
          }
        }),
      }));

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
    const state = get();
    const projectData = {
      version: "1.0.0",
      saved_at: new Date().toISOString(),
      meta: state.meta,
      ai_settings: state.aiSettings,
      characters: state.characters,
      episodes: state.episodes,
      timeline: state.timeline,
    };

    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = state.meta.title.toLowerCase().replace(/[^a-z0-9]/g, "_");
    a.href = url;
    a.download = `${safeTitle}.kreatif.json`;
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
      aiSettings: jsonData.ai_settings || get().aiSettings,
      characters: jsonData.characters || [],
      episodes: jsonData.episodes || [],
      timeline: jsonData.timeline,
      selectedClipId: null,
      currentTime: 0,
    });
  },

  // --- IMPORT MEDIA FILE DIRECTLY TO TIMELINE ---
  importMediaFile: (file) => {
    const state = get();
    undoStack.push(captureSnapshot(state));
    redoStack.length = 0; // Clear redo

    const url = URL.createObjectURL(file);
    const fileType = file.type;

    let targetTrackType: Track["type"] = "video";
    if (fileType.startsWith("image/")) targetTrackType = "image";
    else if (fileType.startsWith("audio/")) targetTrackType = "audio";
    else if (fileType.startsWith("video/")) targetTrackType = "video";

    let track = state.timeline.tracks.find((t) => t.type === targetTrackType);
    if (!track) {
      track = state.timeline.tracks[0];
    }

    if (track) {
      const defaultDuration = targetTrackType === "image" ? 5 : 8;
      const start = state.currentTime;
      const end = start + defaultDuration;

      const newClip: Clip = {
        id: genId("clip"),
        trackId: track.id,
        source: url,
        start,
        end,
        source_start: 0,
        source_end: defaultDuration,
        transform: { scale: 1, x: 0, y: 0, rotation: 0 },
        crop: { x: 0, y: 0, width: 1920, height: 1080 },
        transition_in: null,
        transition_out: null,
      };

      if (targetTrackType === "audio") {
        newClip.volume = 1.0;
      }

      get().addClipToTrack(track.id, newClip);
      get().setCurrentTime(end);
    }
  },
}));
