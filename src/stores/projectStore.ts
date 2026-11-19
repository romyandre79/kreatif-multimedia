import { create } from "zustand";

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
  currentTime: number;
  selectedClipId: string | null;
  zoomLevel: number; // pixels per second

  // Actions
  setCurrentTime: (time: number) => void;
  setSelectedClipId: (clipId: string | null) => void;
  setZoomLevel: (zoom: number) => void;
  addCharacter: (charData?: Partial<Character>) => string;
  updateCharacter: (charId: string, updates: Partial<Character>) => void;
  deleteCharacter: (charId: string) => void;
  addCharacterAsset: (charId: string, assetUrl: string) => void;
  removeCharacterAsset: (charId: string, assetIndex: number) => void;
  addEpisode: () => void;
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

export const useProjectStore = create<ProjectStore>((set, get) => ({
  meta: {
    title: "Proyek Baru",
    resolution: { width: 1920, height: 1080 },
    aspect_ratio: "16:9",
    fps: 30,
    duration: 60,
  },

  characters: [
    {
      id: "char-1",
      name: "Bima",
      description: "Prajurit tangguh",
      avatar: "",
      assets: [],
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
      title: "Episode 1: Perjalanan Dimulai",
      scenes: [
        {
          scene_id: "sc-1",
          character_id: "char-1",
          script: "Kita harus bersiap sebelum badai tiba!",
          audio_url: "",
          duration: 4.5,
        },
      ],
    },
  ],

  timeline: {
    tracks: [
      {
        id: "track-video-1",
        type: "video",
        name: "Video 1",
        clips: [
          {
            id: "clip-demo-video",
            trackId: "track-video-1",
            source: "assets/intro_scene.mp4",
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
        name: "Karakter Overlay",
        clips: [
          {
            id: "clip-demo-char",
            trackId: "track-char-1",
            source: "assets/bima_hero.png",
            start: 2,
            end: 8.5,
            source_start: null,
            source_end: null,
            chroma_key: {
              enabled: true,
              color: "#00FF00",
              similarity: 0.15,
              smoothness: 0.05,
            },
            transform: { scale: 0.85, x: 50, y: 20, rotation: 0 },
            transition_in: { type: "fade_in", duration: 0.5 },
            transition_out: { type: "fade_out", duration: 0.5 },
          },
        ],
      },
      {
        id: "track-audio-1",
        type: "audio",
        name: "Voiceover (TTS)",
        clips: [
          {
            id: "clip-demo-audio",
            trackId: "track-audio-1",
            source: "cache/audio/dialog_bima.mp3",
            start: 2.2,
            end: 6.7,
            source_start: 0,
            source_end: 4.5,
            volume: 1.0,
            fade_in: 0.1,
            fade_out: 0.2,
            transition_in: null,
            transition_out: null,
          },
        ],
      },
      {
        id: "track-sub-1",
        type: "subtitle",
        name: "Subtitle",
        clips: [
          {
            id: "clip-demo-sub",
            trackId: "track-sub-1",
            text: "Kita harus bersiap sebelum badai tiba!",
            start: 2.2,
            end: 6.7,
            source_start: null,
            source_end: null,
            transition_in: null,
            transition_out: null,
            style: {
              font_size: 28,
              color: "#FFFFFF",
              background_color: "rgba(0,0,0,0.6)",
            },
          },
        ],
      },
    ],
  },

  currentTime: 0,
  selectedClipId: "clip-demo-video",
  zoomLevel: 30, // 30px per detik

  setCurrentTime: (time) =>
    set({ currentTime: Math.max(0, Math.min(time, get().meta.duration)) }),

  setSelectedClipId: (clipId) => set({ selectedClipId: clipId }),

  setZoomLevel: (zoom) => set({ zoomLevel: Math.max(10, Math.min(zoom, 120)) }),

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
    set((state) => ({
      characters: state.characters.filter((c) => c.id !== charId),
    })),

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

  addEpisode: () =>
    set((state) => ({
      episodes: [
        ...state.episodes,
        {
          id: genId("ep"),
          title: `Episode ${state.episodes.length + 1}`,
          scenes: [],
        },
      ],
    })),

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
}));
