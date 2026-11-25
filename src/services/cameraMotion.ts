// Service & Presets Gerakan Kamera (Camera Motion / Dynamic Cinematic Pan, Tilt, Zoom, Shake, Orbit)
// Memungkinkan pengguna mengarahkan atau menggeser kamera ke video/gambar secara otomatis maupun manual

export type CameraPresetType =
  | "static"
  | "pan_left"
  | "pan_right"
  | "tilt_up"
  | "tilt_down"
  | "zoom_in_slow"
  | "zoom_out_slow"
  | "dolly_zoom"
  | "shake_handheld"
  | "action_quake"
  | "cinematic_orbit";

export interface CameraMotionConfig {
  enabled: boolean;
  preset: CameraPresetType;
  // Manual / Custom Camera Offset & Zoom
  panX: number; // Geser horizontal (-100% sampai +100%)
  panY: number; // Geser vertikal (-100% sampai +100%)
  zoom: number; // Zoom kamera (1.0x - 3.0x)
  rotation: number; // Rotasi roll kamera (-45 sampai +45 derajat)
  speed: number; // Kecepatan pergerakan kamera (0.5x - 3.0x)
  shakeIntensity: number; // Intensitas getaran kamera (0 = off, 1 - 10)
}

export const DEFAULT_CAMERA_MOTION: CameraMotionConfig = {
  enabled: false,
  preset: "static",
  panX: 0,
  panY: 0,
  zoom: 1.0,
  rotation: 0,
  speed: 1.0,
  shakeIntensity: 0,
};

export interface CameraPresetDefinition {
  id: CameraPresetType;
  name: string;
  category: "pan" | "tilt" | "zoom" | "dynamic";
  icon: string;
  description: string;
}

export const CAMERA_PRESETS: CameraPresetDefinition[] = [
  {
    id: "static",
    name: "Static (Manual)",
    category: "dynamic",
    icon: "📹",
    description: "Kamera diam atau mengikuti geser manual (Pan X, Y & Zoom).",
  },
  {
    id: "pan_left",
    name: "Pan Left (Geser Kiri)",
    category: "pan",
    icon: "⬅️",
    description: "Kamera menggeser pandangan secara mulus dari kanan ke kiri.",
  },
  {
    id: "pan_right",
    name: "Pan Right (Geser Kanan)",
    category: "pan",
    icon: "➡️",
    description: "Kamera menggeser pandangan secara sinematik dari kiri ke kanan.",
  },
  {
    id: "tilt_up",
    name: "Tilt Up (Arah Atas)",
    category: "tilt",
    icon: "⬆️",
    description: "Kamera mendongak ke atas menyorot subjek atau pemandangan.",
  },
  {
    id: "tilt_down",
    name: "Tilt Down (Arah Bawah)",
    category: "tilt",
    icon: "⬇️",
    description: "Kamera menunduk ke bawah dari langit ke objek utama.",
  },
  {
    id: "zoom_in_slow",
    name: "Slow Zoom In (Push In)",
    category: "zoom",
    icon: "🔍",
    description: "Mendekat perlahan ke subjek utama untuk efek dramatis & fokus.",
  },
  {
    id: "zoom_out_slow",
    name: "Slow Zoom Out (Pull Out)",
    category: "zoom",
    icon: "🔎",
    description: "Menjauh perlahan memperlihatkan latar belakang yang lebih luas.",
  },
  {
    id: "dolly_zoom",
    name: "Dolly Zoom (Vertigo Effect)",
    category: "zoom",
    icon: "🌀",
    description: "Efek vertigo kombinasi zoom dan kontra-pergerakan dramatis.",
  },
  {
    id: "shake_handheld",
    name: "Handheld Camera (Natural)",
    category: "dynamic",
    icon: "🎬",
    description: "Gerakan genggaman tangan alami ala kamera dokumenter / vlogger.",
  },
  {
    id: "action_quake",
    name: "Action Quake (Guncangan Aksi)",
    category: "dynamic",
    icon: "💥",
    description: "Getaran hentakan dinamis untuk adegan aksi, musik beat, atau gempa.",
  },
  {
    id: "cinematic_orbit",
    name: "Cinematic Orbit Sway",
    category: "dynamic",
    icon: "🪐",
    description: "Kamera berayun melingkar lembut mengitari objek di tengah.",
  },
];

export interface CameraEvaluatedTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
}

/**
 * Menghitung pergeseran koordinat kamera saat ini (currentTime)
 * @param config Konfigurasi kamera
 * @param currentTime Detik playhead saat ini
 * @param canvasWidth Lebar kanvas video (misal 1920)
 * @param canvasHeight Tinggi kanvas video (misal 1080)
 */
export function evaluateCameraTransform(
  config: CameraMotionConfig | undefined,
  currentTime: number,
  canvasWidth: number,
  canvasHeight: number
): CameraEvaluatedTransform {
  if (!config || !config.enabled) {
    return { offsetX: 0, offsetY: 0, scale: 1, rotation: 0 };
  }

  const speed = config.speed || 1.0;
  const time = currentTime * speed;

  let calcPanX = (config.panX || 0) * (canvasWidth * 0.01);
  let calcPanY = (config.panY || 0) * (canvasHeight * 0.01);
  let calcZoom = config.zoom || 1.0;
  let calcRotation = config.rotation || 0;

  switch (config.preset) {
    case "pan_left": {
      // Geser kamera terus ke kiri secara berulang / mulus
      const travel = ((time * 60) % (canvasWidth * 0.6)) - canvasWidth * 0.3;
      calcPanX += travel;
      calcZoom = Math.max(calcZoom, 1.15); // Sedikit zoom agar tidak terlihat black border
      break;
    }
    case "pan_right": {
      const travel = canvasWidth * 0.3 - ((time * 60) % (canvasWidth * 0.6));
      calcPanX += travel;
      calcZoom = Math.max(calcZoom, 1.15);
      break;
    }
    case "tilt_up": {
      const travel = ((time * 40) % (canvasHeight * 0.5)) - canvasHeight * 0.25;
      calcPanY += travel;
      calcZoom = Math.max(calcZoom, 1.15);
      break;
    }
    case "tilt_down": {
      const travel = canvasHeight * 0.25 - ((time * 40) % (canvasHeight * 0.5));
      calcPanY += travel;
      calcZoom = Math.max(calcZoom, 1.15);
      break;
    }
    case "zoom_in_slow": {
      const cycle = (time * 0.2) % 1;
      calcZoom = calcZoom * (1.0 + cycle * 0.4);
      break;
    }
    case "zoom_out_slow": {
      const cycle = (time * 0.2) % 1;
      calcZoom = calcZoom * (1.4 - cycle * 0.4);
      break;
    }
    case "dolly_zoom": {
      const cycle = Math.sin(time * 1.5);
      calcZoom = calcZoom * (1.15 + cycle * 0.25);
      calcPanY += cycle * 30;
      break;
    }
    case "shake_handheld": {
      calcZoom = Math.max(calcZoom, 1.08);
      const intensity = config.shakeIntensity > 0 ? config.shakeIntensity : 3;
      const shX = (Math.sin(time * 2.3) + Math.cos(time * 4.1)) * (intensity * 2.5);
      const shY = (Math.cos(time * 2.7) + Math.sin(time * 3.8)) * (intensity * 2.2);
      const shRot = Math.sin(time * 1.8) * (intensity * 0.15);
      calcPanX += shX;
      calcPanY += shY;
      calcRotation += shRot;
      break;
    }
    case "action_quake": {
      calcZoom = Math.max(calcZoom, 1.15);
      const intensity = config.shakeIntensity > 0 ? config.shakeIntensity : 7;
      const shX = (Math.sin(time * 18.0) * Math.cos(time * 12.0)) * (intensity * 3.5);
      const shY = (Math.cos(time * 22.0) * Math.sin(time * 14.0)) * (intensity * 3.5);
      const shRot = Math.sin(time * 16.0) * (intensity * 0.35);
      calcPanX += shX;
      calcPanY += shY;
      calcRotation += shRot;
      break;
    }
    case "cinematic_orbit": {
      calcZoom = Math.max(calcZoom, 1.12);
      const orbitRadiusX = canvasWidth * 0.04;
      const orbitRadiusY = canvasHeight * 0.04;
      calcPanX += Math.cos(time * 0.8) * orbitRadiusX;
      calcPanY += Math.sin(time * 0.8) * orbitRadiusY;
      calcRotation += Math.sin(time * 0.8) * 1.2;
      break;
    }
    case "static":
    default:
      break;
  }

  return {
    offsetX: calcPanX,
    offsetY: calcPanY,
    scale: calcZoom,
    rotation: calcRotation,
  };
}
