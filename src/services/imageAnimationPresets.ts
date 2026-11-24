/**
 * imageAnimationPresets.ts
 * Engine Presets Animasi Gambar / Overlay / Stiker
 * Menyediakan preset animasi Masuk (In), Keluar (Out), dan Loop Kontinu
 * untuk klip gambar di timeline.
 */

export interface ImageAnimationConfig {
  inPreset?: string; // misal: 'fade', 'pop_bounce', 'slide_up', 'slide_down', 'slide_left', 'slide_right', 'zoom_in', 'spin_zoom', 'swing_drop', 'flip_x', 'elastic_snap'
  inDuration?: number; // 0.2 - 2.0s
  outPreset?: string; // misal: 'fade', 'zoom_shrink', 'slide_up', 'slide_down', 'slide_left', 'slide_right', 'spin_out', 'drop_fall'
  outDuration?: number; // 0.2 - 2.0s
  loopPreset?: string; // misal: 'none', 'floating', 'pulse_heartbeat', 'gentle_spin', 'wiggle', 'breathing', 'pendulum', 'bounce_jelly', 'flash'
  loopSpeed?: number; // 0.5x - 3.0x
}

export interface ImageAnimationPresetItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: "in" | "out" | "loop";
}

export const IMAGE_ANIMATION_IN_PRESETS: ImageAnimationPresetItem[] = [
  { id: "none", name: "Tanpa Animasi (Normal)", icon: "⏹️", description: "Muncul langsung tanpa efek", category: "in" },
  { id: "fade", name: "Smooth Fade In", icon: "✨", description: "Pudar halus dari transparan", category: "in" },
  { id: "pop_bounce", name: "Elastic Pop & Bounce", icon: "💥", description: "Membesar elastis lalu memantul ramah", category: "in" },
  { id: "zoom_in", name: "Zoom In Blast", icon: "🔍", description: "Melesat maju dari titik tengah", category: "in" },
  { id: "slide_up", name: "Slide Up In", icon: "⬆️", description: "Meluncur naik dari bawah layar", category: "in" },
  { id: "slide_down", name: "Slide Down Drop", icon: "⬇️", description: "Meluncur turun dari atas layar", category: "in" },
  { id: "slide_left", name: "Slide Left In", icon: "⬅️", description: "Meluncur dari sisi kanan ke kiri", category: "in" },
  { id: "slide_right", name: "Slide Right In", icon: "➡️", description: "Meluncur dari sisi kiri ke kanan", category: "in" },
  { id: "spin_zoom", name: "Twister Spin Zoom", icon: "🌪️", description: "Berputar 360 derajat sambil membesar", category: "in" },
  { id: "swing_drop", name: "Pendulum Swing In", icon: "🎪", description: "Berayun seperti bandul saat masuk", category: "in" },
  { id: "flip_x", name: "Card Flip 3D", icon: "🃏", description: "Membalik horizontal seperti kartu", category: "in" },
  { id: "elastic_snap", name: "Rubber Snap", icon: "🪀", description: "Melesat melar lalu snap ke ukuran asli", category: "in" },
  // CapCut In Trends
  { id: "capcut_zoom_slam", name: "CapCut Zoom Slam", icon: "💥", description: "Melesat kencang dari raksasa lalu membanting ke layar", category: "in" },
  { id: "capcut_shake_land", name: "Earthquake Land", icon: "🫨", description: "Mendarat tegas disertai getaran gempa", category: "in" },
  { id: "capcut_sway_in", name: "Diagonal Sway In", icon: "🛹", description: "Meluncur diagonal dengan lengkungan kurva anggun", category: "in" },
];

export const IMAGE_ANIMATION_OUT_PRESETS: ImageAnimationPresetItem[] = [
  { id: "none", name: "Tanpa Animasi Keluar", icon: "⏹️", description: "Menghilang langsung (cut)", category: "out" },
  { id: "fade", name: "Smooth Fade Out", icon: "🌫️", description: "Pudar perlahan ke transparan", category: "out" },
  { id: "zoom_shrink", name: "Zoom Shrink", icon: "🔎", description: "Mengecil tajam ke titik tengah", category: "out" },
  { id: "slide_up", name: "Fly Up Away", icon: "⬆️", description: "Melayang cepat ke atas layar", category: "out" },
  { id: "slide_down", name: "Gravity Fall Down", icon: "⬇️", description: "Jatuh bebas ke bawah layar", category: "out" },
  { id: "slide_left", name: "Slide Left Out", icon: "⬅️", description: "Meluncur kabur ke arah kiri", category: "out" },
  { id: "slide_right", name: "Slide Right Out", icon: "➡️", description: "Meluncur kabur ke arah kanan", category: "out" },
  { id: "spin_out", name: "Whirlpool Spin Out", icon: "🌀", description: "Berputar mengecil hingga lenyap", category: "out" },
  // CapCut Out Trends
  { id: "capcut_disintegrate", name: "Glitch Disintegrate", icon: "👾", description: "Distorsi sinyal digital acak lalu buyar", category: "out" },
  { id: "capcut_warp_forward", name: "Hyper Warp Forward", icon: "🚀", description: "Melesat membesar tembus kamera", category: "out" },
];

export const IMAGE_ANIMATION_LOOP_PRESETS: ImageAnimationPresetItem[] = [
  { id: "none", name: "Diam (Static)", icon: "⏸️", description: "Tidak ada gerakan berulang", category: "loop" },
  { id: "floating", name: "Floating & Bobbing", icon: "🎈", description: "Melayang-layang naik turun lembut", category: "loop" },
  { id: "pulse_heartbeat", name: "Pulse Heartbeat", icon: "💓", description: "Denyut membesar-mengecil berirama", category: "loop" },
  { id: "gentle_spin", name: "Slow Rotating Spin", icon: "🎡", description: "Berputar halus tanpa henti", category: "loop" },
  { id: "wiggle", name: "Playful Wiggle", icon: "〰️", description: "Goyang miring ke kiri dan kanan", category: "loop" },
  { id: "breathing", name: "Deep Breathing Scale", icon: "🫁", description: "Ekspansi dan kontraksi halus seperti nafas", category: "loop" },
  { id: "pendulum", name: "Clock Pendulum", icon: "🕰️", description: "Ayun bandul presisi", category: "loop" },
  { id: "bounce_jelly", name: "Jelly Squish & Bounce", icon: "🍮", description: "Kenyal memantul elastis", category: "loop" },
  { id: "flash", name: "Shine Flash Glint", icon: "✨", description: "Kedip kecerahan berulang", category: "loop" },
  // CapCut Loop Trends
  { id: "capcut_shiver", name: "TikTok Micro Shiver", icon: "⚡", description: "Getaran mikro cepat ala musik jedag-jedug", category: "loop" },
  { id: "capcut_floating_angle", name: "3D Wobble Float", icon: "🛸", description: "Melayang dengan orientasi sudut dinamis", category: "loop" },
];

/**
 * Evaluasi kalkulasi transformasi animasi gambar
 * Menghasilkan: opacity, scale, offsetX, offsetY, rotation
 */
export function evaluateImageAnimation(
  config: ImageAnimationConfig | undefined,
  timeSinceStart: number,
  clipDuration: number,
  canvasWidth: number,
  canvasHeight: number
): {
  opacity: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
} {
  if (!config) {
    return { opacity: 1, scale: 1, offsetX: 0, offsetY: 0, rotation: 0 };
  }

  const inPreset = config.inPreset || "none";
  const inDur = Math.max(0.1, config.inDuration || 0.5);
  const outPreset = config.outPreset || "none";
  const outDur = Math.max(0.1, config.outDuration || 0.5);
  const loopPreset = config.loopPreset || "none";
  const loopSpeed = config.loopSpeed || 1.0;

  let opacity = 1;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let rotation = 0;

  const timeUntilEnd = clipDuration - timeSinceStart;

  // 1. EVALUASI ANIMASI MASUK (IN)
  if (inPreset !== "none" && timeSinceStart >= 0 && timeSinceStart < inDur) {
    const p = Math.min(1, Math.max(0, timeSinceStart / inDur));
    // Easing Out Cubic
    const easeOut = 1 - Math.pow(1 - p, 3);
    // Elastic easing
    const elasticOut =
      p === 0 ? 0 : p === 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;

    switch (inPreset) {
      case "fade":
        opacity = p;
        break;
      case "pop_bounce":
        opacity = Math.min(1, p * 1.5);
        scale = elasticOut;
        break;
      case "zoom_in":
        opacity = p;
        scale = 0.2 + easeOut * 0.8;
        break;
      case "slide_up":
        opacity = p;
        offsetY = (1 - easeOut) * (canvasHeight * 0.6);
        break;
      case "slide_down":
        opacity = p;
        offsetY = -(1 - easeOut) * (canvasHeight * 0.6);
        break;
      case "slide_left":
        opacity = p;
        offsetX = (1 - easeOut) * (canvasWidth * 0.6);
        break;
      case "slide_right":
        opacity = p;
        offsetX = -(1 - easeOut) * (canvasWidth * 0.6);
        break;
      case "spin_zoom":
        opacity = p;
        scale = 0.2 + easeOut * 0.8;
        rotation = (1 - easeOut) * 360;
        break;
      case "swing_drop":
        opacity = p;
        offsetY = -(1 - easeOut) * (canvasHeight * 0.3);
        rotation = Math.sin((1 - p) * Math.PI * 2) * 30 * (1 - p);
        break;
      case "flip_x":
        opacity = Math.min(1, p * 1.5);
        scale = Math.sin(p * Math.PI * 0.5);
        break;
      case "elastic_snap":
        opacity = p;
        scale = p < 0.6 ? 0.3 + p * 1.8 : 1.38 - (p - 0.6) * 0.95;
        break;
      case "capcut_zoom_slam":
        opacity = Math.min(1, p * 2);
        scale = p < 0.5 ? 2.5 - p * 3.0 : 1.0 + Math.sin((p - 0.5) * Math.PI * 2) * 0.15;
        break;
      case "capcut_shake_land":
        opacity = p;
        scale = 0.5 + easeOut * 0.5;
        if (p > 0.4 && p < 0.9) {
          offsetX = (Math.random() - 0.5) * 16 * (1 - p);
          offsetY = (Math.random() - 0.5) * 16 * (1 - p);
        }
        break;
      case "capcut_sway_in":
        opacity = p;
        offsetX = (1 - easeOut) * (canvasWidth * 0.5);
        offsetY = Math.sin(p * Math.PI) * (canvasHeight * 0.2);
        rotation = (1 - p) * 45;
        break;
      default:
        opacity = p;
        break;
    }
  }

  // 2. EVALUASI ANIMASI KELUAR (OUT)
  if (outPreset !== "none" && timeUntilEnd >= 0 && timeUntilEnd < outDur) {
    const p = Math.min(1, Math.max(0, timeUntilEnd / outDur)); // 1 -> 0 saat mendekati akhir
    const easeIn = Math.pow(p, 2);

    switch (outPreset) {
      case "fade":
        opacity = Math.min(opacity, p);
        break;
      case "zoom_shrink":
        opacity = Math.min(opacity, p);
        scale = scale * Math.max(0.1, p);
        break;
      case "slide_up":
        opacity = Math.min(opacity, p * 1.2);
        offsetY += -(1 - easeIn) * (canvasHeight * 0.6);
        break;
      case "slide_down":
        opacity = Math.min(opacity, p * 1.2);
        offsetY += (1 - easeIn) * (canvasHeight * 0.6);
        break;
      case "slide_left":
        opacity = Math.min(opacity, p * 1.2);
        offsetX += -(1 - easeIn) * (canvasWidth * 0.6);
        break;
      case "slide_right":
        opacity = Math.min(opacity, p * 1.2);
        offsetX += (1 - easeIn) * (canvasWidth * 0.6);
        break;
      case "spin_out":
        opacity = Math.min(opacity, p);
        scale = scale * Math.max(0.1, p);
        rotation += (1 - p) * 360;
        break;
      case "capcut_disintegrate":
        opacity = Math.min(opacity, p * 1.5);
        scale = scale * (1 + (1 - p) * 0.4);
        if (p < 0.8) {
          offsetX += (Math.random() - 0.5) * 24 * (1 - p);
          offsetY += (Math.random() - 0.5) * 24 * (1 - p);
        }
        break;
      case "capcut_warp_forward":
        opacity = Math.min(opacity, p * 1.2);
        scale = scale * (1 + Math.pow(1 - p, 2) * 3.5);
        break;
      default:
        opacity = Math.min(opacity, p);
        break;
    }
  }

  // 3. EVALUASI ANIMASI LOOP KONTINU (Hanya saat klip stabil di antara In dan Out)
  if (loopPreset !== "none") {
    const t = timeSinceStart * loopSpeed;

    switch (loopPreset) {
      case "floating":
        offsetY += Math.sin(t * 3) * 12;
        break;
      case "pulse_heartbeat": {
        const beat = Math.sin(t * 5);
        scale *= 1 + (beat > 0.3 ? beat * 0.08 : 0);
        break;
      }
      case "gentle_spin":
        rotation += (t * 45) % 360;
        break;
      case "wiggle":
        rotation += Math.sin(t * 6) * 6;
        break;
      case "breathing":
        scale *= 1 + Math.sin(t * 2.5) * 0.06;
        break;
      case "pendulum":
        rotation += Math.sin(t * 4) * 15;
        offsetX += Math.sin(t * 4) * 8;
        break;
      case "bounce_jelly":
        offsetY += Math.abs(Math.sin(t * 4)) * -14;
        scale *= 1 + Math.sin(t * 8) * 0.04;
        break;
      case "flash":
        opacity *= 0.85 + Math.abs(Math.sin(t * 5)) * 0.15;
        break;
      case "capcut_shiver":
        offsetX += (Math.sin(t * 25) > 0 ? 1 : -1) * 3;
        offsetY += (Math.cos(t * 25) > 0 ? 1 : -1) * 3;
        break;
      case "capcut_floating_angle":
        offsetY += Math.sin(t * 3.5) * 10;
        rotation += Math.sin(t * 2.5) * 8;
        break;
    }
  }

  return {
    opacity: Math.max(0, Math.min(1, opacity)),
    scale,
    offsetX,
    offsetY,
    rotation,
  };
}
