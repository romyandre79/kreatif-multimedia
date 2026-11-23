/**
 * customTransitions.ts
 * Modul layanan CRUD untuk transisi video/gambar kustom (Transitions Manager)
 * Mengizinkan pengguna membuat, mengedit, melihat pratinjau, dan menghapus transisi video:
 * - Tipe efek dasar: Fade, Slide, Zoom, Spin/Rotate, Wipe, Morph/Warp, Glitch, Flip, Iris/Circle
 * - Arah transisi: Masuk (In), Keluar (Out), atau Dua Arah (Both)
 * - Kurva Easing: Linear, Ease-In, Ease-Out, Ease-InOut, Bounce, Elastic
 * - Parameter kustom: Skala awal/akhir, offset X/Y, derajat putaran, blur, dan durasi default
 */

export interface CustomTransitionPreset {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isBuiltIn?: boolean;
  baseEffect:
    | "fade"
    | "slide"
    | "zoom"
    | "rotate"
    | "wipe"
    | "morph"
    | "glitch"
    | "flip"
    | "circle_iris";
  direction?: "up" | "down" | "left" | "right" | "diagonal" | "center";
  startScale?: number;
  endScale?: number;
  rotationDegrees?: number;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut" | "bounce" | "elastic";
  defaultDuration: number; // 0.2 - 2.5s
  blurAmount?: number;
}

export const BUILT_IN_TRANSITIONS: CustomTransitionPreset[] = [
  {
    id: "fade_in",
    name: "Classic Fade",
    icon: "✨",
    baseEffect: "fade",
    description: "Pudar perlahan dari atau menuju transparan",
    defaultDuration: 0.5,
    easing: "easeInOut",
    isBuiltIn: true,
  },
  {
    id: "cross_dissolve",
    name: "Cross Dissolve",
    icon: "🌫️",
    baseEffect: "fade",
    description: "Peleburan halus antara dua adegan",
    defaultDuration: 0.6,
    easing: "easeInOut",
    isBuiltIn: true,
  },
  {
    id: "morph",
    name: "Morph (Warp & Blend)",
    icon: "🌀",
    baseEffect: "morph",
    description: "Perpaduan elastis rotasi dinamis dan zoom morph",
    defaultDuration: 0.6,
    easing: "easeInOut",
    isBuiltIn: true,
  },
  {
    id: "slide_left",
    name: "Slide Left",
    icon: "⬅️",
    baseEffect: "slide",
    direction: "left",
    description: "Meluncur mulus ke arah kiri",
    defaultDuration: 0.5,
    easing: "easeOut",
    isBuiltIn: true,
  },
  {
    id: "slide_right",
    name: "Slide Right",
    icon: "➡️",
    baseEffect: "slide",
    direction: "right",
    description: "Meluncur mulus ke arah kanan",
    defaultDuration: 0.5,
    easing: "easeOut",
    isBuiltIn: true,
  },
  {
    id: "slide_up",
    name: "Slide Up",
    icon: "⬆️",
    baseEffect: "slide",
    direction: "up",
    description: "Meluncur naik ke arah atas",
    defaultDuration: 0.5,
    easing: "easeOut",
    isBuiltIn: true,
  },
  {
    id: "slide_down",
    name: "Slide Down",
    icon: "⬇️",
    baseEffect: "slide",
    direction: "down",
    description: "Meluncur turun ke arah bawah",
    defaultDuration: 0.5,
    easing: "easeOut",
    isBuiltIn: true,
  },
  {
    id: "zoom_in",
    name: "Zoom In Pop",
    icon: "🔍",
    baseEffect: "zoom",
    startScale: 0.3,
    endScale: 1.0,
    description: "Membesar dari ukuran kecil ke normal",
    defaultDuration: 0.5,
    easing: "easeOut",
    isBuiltIn: true,
  },
  {
    id: "zoom_out",
    name: "Zoom Out Dramatic",
    icon: "🔎",
    baseEffect: "zoom",
    startScale: 1.8,
    endScale: 1.0,
    description: "Mengecil tajam dari ukuran raksasa",
    defaultDuration: 0.5,
    easing: "easeOut",
    isBuiltIn: true,
  },
  {
    id: "wipe_left",
    name: "Wipe Left",
    icon: "🧹",
    baseEffect: "wipe",
    direction: "left",
    description: "Usapan tirai mendatar dari samping",
    defaultDuration: 0.5,
    easing: "easeInOut",
    isBuiltIn: true,
  },
];

const STORAGE_KEY = "kreatif_custom_video_transitions";

export function getCustomTransitions(): CustomTransitionPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Gagal membaca custom transitions:", err);
    return [];
  }
}

export function getAllTransitions(): CustomTransitionPreset[] {
  const custom = getCustomTransitions();
  return [...custom, ...BUILT_IN_TRANSITIONS];
}

export function saveCustomTransition(preset: CustomTransitionPreset): CustomTransitionPreset[] {
  const current = getCustomTransitions();
  const existingIdx = current.findIndex((c) => c.id === preset.id);
  let updated: CustomTransitionPreset[];

  if (existingIdx !== -1) {
    updated = current.map((c, i) => (i === existingIdx ? preset : c));
  } else {
    updated = [preset, ...current];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Gagal menyimpan custom transition:", err);
  }
  return updated;
}

export function deleteCustomTransition(id: string): CustomTransitionPreset[] {
  const current = getCustomTransitions();
  const updated = current.filter((c) => c.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Gagal menghapus custom transition:", err);
  }
  return updated;
}

/**
 * Evaluasi transformasi rendering transisi video (In atau Out)
 */
export function evaluateTransitionTransform(
  preset: CustomTransitionPreset,
  isTransitionIn: boolean,
  progress: number, // 0 -> 1
  canvasWidth: number,
  canvasHeight: number
): {
  opacity: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  clipPath?: string;
} {
  // Kurva Easing
  let t = Math.max(0, Math.min(1, progress));
  if (preset.easing === "easeIn") {
    t = t * t;
  } else if (preset.easing === "easeOut") {
    t = 1 - Math.pow(1 - t, 3);
  } else if (preset.easing === "easeInOut") {
    t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  } else if (preset.easing === "bounce") {
    const p = t;
    if (p < 0.3636) t = 7.5625 * p * p;
    else if (p < 0.7272) {
      const p2 = p - 0.5454;
      t = 7.5625 * p2 * p2 + 0.75;
    } else if (p < 0.909) {
      const p2 = p - 0.8181;
      t = 7.5625 * p2 * p2 + 0.9375;
    } else {
      const p2 = p - 0.9545;
      t = 7.5625 * p2 * p2 + 0.984375;
    }
  } else if (preset.easing === "elastic") {
    const c4 = (2 * Math.PI) / 3;
    t = t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  // Jika Transition Out: t berjalan dari 1 menuju 0 seiring adegan berakhir
  const p = isTransitionIn ? t : t;

  let opacity = 1;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let rotation = 0;

  switch (preset.baseEffect) {
    case "fade":
      opacity = isTransitionIn ? p : p;
      break;

    case "slide": {
      const dir = preset.direction || "left";
      if (isTransitionIn) {
        opacity = p;
        if (dir === "left") offsetX = (1 - p) * canvasWidth;
        else if (dir === "right") offsetX = -(1 - p) * canvasWidth;
        else if (dir === "up") offsetY = (1 - p) * canvasHeight;
        else if (dir === "down") offsetY = -(1 - p) * canvasHeight;
        else if (dir === "diagonal") {
          offsetX = (1 - p) * canvasWidth * 0.7;
          offsetY = (1 - p) * canvasHeight * 0.7;
        }
      } else {
        opacity = p;
        if (dir === "left") offsetX = -(1 - p) * canvasWidth;
        else if (dir === "right") offsetX = (1 - p) * canvasWidth;
        else if (dir === "up") offsetY = -(1 - p) * canvasHeight;
        else if (dir === "down") offsetY = (1 - p) * canvasHeight;
        else if (dir === "diagonal") {
          offsetX = -(1 - p) * canvasWidth * 0.7;
          offsetY = -(1 - p) * canvasHeight * 0.7;
        }
      }
      break;
    }

    case "zoom": {
      const startS = preset.startScale !== undefined ? preset.startScale : 0.3;
      const endS = preset.endScale !== undefined ? preset.endScale : 1.0;
      opacity = Math.min(1, p * 1.3);
      if (isTransitionIn) {
        scale = startS + (endS - startS) * p;
      } else {
        scale = endS + (startS - endS) * (1 - p);
      }
      break;
    }

    case "rotate": {
      const deg = preset.rotationDegrees !== undefined ? preset.rotationDegrees : 360;
      opacity = p;
      scale = 0.3 + p * 0.7;
      rotation = isTransitionIn ? (1 - p) * deg : -(1 - p) * deg;
      break;
    }

    case "morph":
      if (isTransitionIn) {
        opacity = Math.min(1, p * 1.4);
        scale = 0.6 + Math.sin(p * Math.PI * 0.5) * 0.4;
        rotation = (1 - p) * 8;
      } else {
        opacity = Math.min(1, p * 1.3);
        scale = 1 + (1 - p) * 0.45;
        rotation = (1 - p) * -8;
      }
      break;

    case "glitch":
      opacity = p;
      if (p < 0.95) {
        offsetX = (Math.random() - 0.5) * 20 * (1 - p);
        offsetY = (Math.random() - 0.5) * 16 * (1 - p);
        scale = 1 + (Math.random() - 0.5) * 0.15 * (1 - p);
      }
      break;

    case "flip":
      opacity = Math.min(1, p * 1.5);
      scale = Math.max(0.05, Math.abs(Math.sin(p * Math.PI * 0.5)));
      break;

    case "wipe":
      opacity = p;
      if (preset.direction === "right") {
        offsetX = (1 - p) * (canvasWidth * 0.5);
      } else {
        offsetX = (1 - p) * (canvasWidth * 0.5);
      }
      break;

    default:
      opacity = p;
      break;
  }

  return {
    opacity: Math.max(0, Math.min(1, opacity)),
    scale,
    offsetX,
    offsetY,
    rotation,
  };
}
