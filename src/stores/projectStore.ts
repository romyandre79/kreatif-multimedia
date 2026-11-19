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

  // Actions
  setCurrentTime: (time: number) => void;
  addCharacter: () => void;
  addEpisode: () => void;
  addTrack: (type: Track["type"]) => void;
}

// --- Helpers ---

let _idCounter = 0;
function genId(prefix: string) {
  _idCounter++;
  return `${prefix}-${Date.now()}-${_idCounter}`;
}

// --- Store ---

export const useProjectStore = create<ProjectStore>((set) => ({
  meta: {
    title: "Proyek Baru",
    resolution: { width: 1920, height: 1080 },
    aspect_ratio: "16:9",
    fps: 30,
    duration: 60,
  },

  characters: [],
  episodes: [],

  timeline: {
    tracks: [
      {
        id: "track-video-1",
        type: "video",
        name: "Video 1",
        clips: [],
      },
      {
        id: "track-audio-1",
        type: "audio",
        name: "Audio 1",
        clips: [],
      },
    ],
  },

  currentTime: 0,

  setCurrentTime: (time) => set({ currentTime: time }),

  addCharacter: () =>
    set((state) => ({
      characters: [
        ...state.characters,
        {
          id: genId("char"),
          name: `Karakter ${state.characters.length + 1}`,
          description: "",
          avatar: "",
          assets: [],
          voice: {
            engine: "piper_local",
            voice_id: "id_ID-default",
            pitch: 1.0,
            speed: 1.0,
          },
        },
      ],
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
}));
