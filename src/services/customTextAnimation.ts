/**
 * customTextAnimation.ts
 * Layanan untuk mengelola preset animasi teks buatan pengguna secara manual
 * Dilengkapi dengan:
 * - 20 Pilihan Motion Type (Animasi Masuk)
 * - 20 Pilihan Loop Animation (Animasi Berulang / Kontinu Selama Klip Tayang)
 * - Kurva Easing, Durasi, dan Preset Styling
 */

export type MotionType =
  | "none"
  | "fade"              // 1. Classic Fade In
  | "slide_up"          // 2. Slide Up (Bawah ke Atas)
  | "slide_down"        // 3. Slide Down (Atas ke Bawah)
  | "slide_left"        // 4. Slide Left (Kanan ke Kiri)
  | "slide_right"       // 5. Slide Right (Kiri ke Kanan)
  | "slide_diagonal"    // 6. Slide Diagonal
  | "zoom_in"           // 7. Zoom In (Kecil ke Normal)
  | "zoom_out"          // 8. Zoom Out (Besar ke Normal)
  | "bounce_drop"       // 9. Heavy Bounce Drop
  | "elastic_pop"       // 10. Elastic Spring Pop
  | "rotate_cw"         // 11. Rotate Clockwise (Putar Searah Jarum Jam)
  | "rotate_ccw"        // 12. Rotate Counter-Clockwise (Putar Berlawanan)
  | "flip_horizontal"   // 13. Flip Horizontal (Efek Pintu Terbuka)
  | "flip_vertical"     // 14. Flip Vertical
  | "typewriter"        // 15. Typewriter (Ketik Per Huruf)
  | "glitch_shake"      // 16. Glitch & Shake Jitter
  | "swing_pendulum"    // 17. Swing In (Bandul Ayun Masuk)
  | "spiral_vortex"     // 18. Spiral Vortex (Pusaran Masuk)
  | "blur_reveal"       // 19. Blur to Sharp Reveal
  | "slam_zoom";        // 20. Rebound Slam Zoom

export type LoopAnimationType =
  | "none"              // 1. Diam Statis
  | "pulse"             // 2. Gentle Pulse (Denyut Halus)
  | "heartbeat"         // 3. Fast Heartbeat (Detak Cepat)
  | "float"             // 4. Floating Bobbing (Mengambang Naik-Turun)
  | "drift_horizontal"  // 5. Horizontal Drift (Goyang Kanan-Kiri)
  | "spin_slow"         // 6. Slow Rotation (Putar Lambat 360)
  | "spin_fast"         // 7. Turbo Spin (Putar Cepat)
  | "wiggle"            // 8. Wiggle (Goyang Miring Ceria)
  | "jelly_squish"      // 9. Jelly / Squish Bounce (Kenyal Seperti Agar-agar)
  | "shiver_tremble"    // 10. Shiver / Tremble (Getar Halus Ketakutan/Dingin)
  | "pendulum_swing"    // 11. Continuous Pendulum (Ayun Bandul Terus Menerus)
  | "wave_bob"          // 12. Ocean Wave (Gelombang Ombak Berirama)
  | "neon_flicker"      // 13. Neon Light Flicker (Kelap-Kelip Lampu Rusak)
  | "strobe_flash"      // 14. Strobe Flash (Kilatan Terang-Gelap Berirama)
  | "glitch_twitch"     // 15. Glitch Twitch (Kedutan Digital)
  | "breathe"           // 16. Slow Breathe (Pernapasan Rileks)
  | "rainbow_cycle"     // 17. Color Hue Cycle (Pergeseran Spektrum Warna)
  | "glow_pulse"        // 18. Glow Pulse (Pendar Cahaya Bayangan)
  | "orbit_circle"      // 19. Circular Orbit (Mengelilingi Titik Pusat)
  | "bounce_ground";    // 20. Ground Trampoline Bounce (Pantul Lantai)

export interface CustomTextAnimationConfig {
  id: string;
  name: string;
  description?: string;
  category: "custom" | "fade" | "slide" | "zoom" | "bounce" | "rotate" | "creative" | "glow" | "cinema";
  previewIcon?: string;
  // Motion Type & Parameter
  motion: MotionType;
  slideDirection?: "up" | "down" | "left" | "right" | "diagonal";
  slideDistance?: number;
  startScale?: number;
  endScale?: number;
  rotationDegrees?: number;
  easing?: "linear" | "easeOut" | "easeInOut" | "bounce" | "elastic";
  duration: number; // 0.2s - 2.5s
  // Loop Animation
  loop: LoopAnimationType;
  loopSpeed?: number; // 0.5x - 2.5x
  // Preset Style Tampilan
  style?: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    shadowColor?: string;
    shadowBlur?: number;
    isBold?: boolean;
    isItalic?: boolean;
    isUnderline?: boolean;
  };
}

export const MOTION_TYPE_OPTIONS: { id: MotionType; label: string; icon: string; desc: string }[] = [
  { id: "none", label: "Tanpa Motion Masuk", icon: "⏹️", desc: "Teks langsung tampil normal" },
  { id: "fade", label: "Classic Fade In", icon: "🌫️", desc: "Transparan perlahan menuju pekat" },
  { id: "slide_up", label: "Slide Up (Bawah ke Atas)", icon: "⬆️", desc: "Meluncur naik dari arah bawah" },
  { id: "slide_down", label: "Slide Down (Atas ke Bawah)", icon: "⬇️", desc: "Meluncur turun dari arah atas" },
  { id: "slide_left", label: "Slide Left (Kanan ke Kiri)", icon: "⬅️", desc: "Meluncur masuk dari sisi kanan" },
  { id: "slide_right", label: "Slide Right (Kiri ke Kanan)", icon: "➡️", desc: "Meluncur masuk dari sisi kiri" },
  { id: "slide_diagonal", label: "Slide Diagonal", icon: "↗️", desc: "Meluncur miring menyudut" },
  { id: "zoom_in", label: "Zoom In (Pop Membesar)", icon: "🔍", desc: "Mulai dari titik kecil membesar normal" },
  { id: "zoom_out", label: "Zoom Out (Mengecil Tajam)", icon: "🔎", desc: "Mulai dari raksasa mengecil presisi" },
  { id: "bounce_drop", label: "Heavy Bounce Drop", icon: "🏀", desc: "Jatuh berbobot lalu memantul beberapa kali" },
  { id: "elastic_pop", label: "Elastic Spring Pop", icon: "🪀", desc: "Melesat kenyal pegas melampaui batas" },
  { id: "rotate_cw", label: "Rotate Clockwise", icon: "🌪️", desc: "Berputar 360° searah jarum jam" },
  { id: "rotate_ccw", label: "Rotate Counter-Clockwise", icon: "🔄", desc: "Berputar 360° berlawanan arah" },
  { id: "flip_horizontal", label: "Flip Horizontal (3D Card)", icon: "🃏", desc: "Membalik seperti kartu dari samping" },
  { id: "flip_vertical", label: "Flip Vertical (Coin Flip)", icon: "🪙", desc: "Membalik seperti koin dari atas" },
  { id: "typewriter", label: "Typewriter Text", icon: "⌨️", desc: "Mengetik huruf per huruf secara berurutan" },
  { id: "glitch_shake", label: "Glitch & Shake", icon: "⚡", desc: "Goncangan acak digital cepat" },
  { id: "swing_pendulum", label: "Swing In (Bandul)", icon: "🕰️", desc: "Mengayun dari sudut miring seperti pendulum" },
  { id: "spiral_vortex", label: "Spiral Vortex", icon: "🌀", desc: "Pusaran memutar sambil membesar" },
  { id: "blur_reveal", label: "Blur to Sharp Reveal", icon: "👓", desc: "Dari kabur tidak fokus menjadi sangat tajam" },
  { id: "slam_zoom", label: "Rebound Slam Zoom", icon: "💥", desc: "Membanting keras ke layar lalu stabil" },
];

export const LOOP_ANIMATION_OPTIONS: { id: LoopAnimationType; label: string; icon: string; desc: string }[] = [
  { id: "none", label: "Tanpa Loop (Diam Statis)", icon: "⏹️", desc: "Teks diam setelah animasi masuk selesai" },
  { id: "pulse", label: "Gentle Pulse", icon: "💓", desc: "Denyut halus membesar dan mengecil perlahan" },
  { id: "heartbeat", label: "Fast Heartbeat", icon: "❤️‍🔥", desc: "Detak ganda cepat layaknya detak jantung" },
  { id: "float", label: "Floating Bobbing", icon: "🎈", desc: "Mengambang naik-turun halus seperti balon" },
  { id: "drift_horizontal", label: "Horizontal Drift", icon: "↔️", desc: "Melayang geser ke kanan dan ke kiri santai" },
  { id: "spin_slow", label: "Slow 360 Rotation", icon: "🌍", desc: "Berputar 360 derajat secara perlahan" },
  { id: "spin_fast", label: "Turbo Fast Spin", icon: "🌪️", desc: "Berputar kencang tanpa henti" },
  { id: "wiggle", label: "Playful Wiggle", icon: "🪱", desc: "Goyang miring kiri-kanan riang gembira" },
  { id: "jelly_squish", label: "Jelly Squish & Bounce", icon: "🍮", desc: "Gepeng dan lonjong kenyal seperti agar-agar" },
  { id: "shiver_tremble", label: "Shiver / Tremble", icon: "🥶", desc: "Getaran mikro cepat seperti kedinginan/takut" },
  { id: "pendulum_swing", label: "Continuous Pendulum", icon: "⏳", desc: "Ayunan bandul ritmis berulang" },
  { id: "wave_bob", label: "Ocean Wave Bobbing", icon: "🌊", desc: "Gerak melingkar alun ombak laut" },
  { id: "neon_flicker", label: "Neon Light Flicker", icon: "💡", desc: "Kedip-kedip lampu neon vintage" },
  { id: "strobe_flash", label: "Strobe Flash", icon: "📸", desc: "Kilatan cahaya transparan ritmik cepat" },
  { id: "glitch_twitch", label: "Glitch Twitch", icon: "👾", desc: "Kedutan posisi acak sesekali khas glitch" },
  { id: "breathe", label: "Deep Breathing", icon: "🧘", desc: "Pernapasan lambat tenang dan menyejukkan" },
  { id: "rainbow_cycle", label: "Hue Spectrum Cycle", icon: "🌈", desc: "Warna bergeser mengalir ke seluruh spektrum" },
  { id: "glow_pulse", label: "Glow Halo Pulse", icon: "✨", desc: "Cahaya pendar bayangan membesar-mengecil" },
  { id: "orbit_circle", label: "Circular Orbit", icon: "🪐", desc: "Mengorbit membentuk lingkaran kecil" },
  { id: "bounce_ground", label: "Trampoline Bounce", icon: "🤸", desc: "Memantul ke atas dan ke bawah seperti trampolin" },
];

const STORAGE_KEY = "kreatif_custom_text_animations";

export function getCustomTextAnimations(): CustomTextAnimationConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Gagal membaca custom text animations:", err);
    return [];
  }
}

export function saveCustomTextAnimation(config: CustomTextAnimationConfig): CustomTextAnimationConfig[] {
  const current = getCustomTextAnimations();
  const existingIdx = current.findIndex((c) => c.id === config.id);
  let updated: CustomTextAnimationConfig[];

  if (existingIdx !== -1) {
    updated = current.map((c, i) => (i === existingIdx ? config : c));
  } else {
    updated = [config, ...current];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Gagal menyimpan custom text animation:", err);
  }
  return updated;
}

export function deleteCustomTextAnimation(id: string): CustomTextAnimationConfig[] {
  const current = getCustomTextAnimations();
  const updated = current.filter((c) => c.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Gagal menghapus custom text animation:", err);
  }
  return updated;
}

/**
 * Menghitung transformasi render teks untuk 20 Motion Type + 20 Loop Types
 */
export function evaluateCustomTextAnimation(
  config: CustomTextAnimationConfig,
  timeSinceStart: number,
  canvasWidth: number,
  baseFontSize: number,
  totalChars: number,
  currentTime: number
): {
  opacity: number;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  shadowBlurBonus: number;
  visibleCharsCount?: number;
} {
  const dur = Math.max(0.1, config.duration || 0.6);
  const rawProgress = Math.min(1, Math.max(0, timeSinceStart / dur));

  // 1. Hitung Easing untuk Motion In
  let progress = rawProgress;
  if (config.easing === "easeOut") {
    progress = 1 - Math.pow(1 - rawProgress, 3);
  } else if (config.easing === "easeInOut") {
    progress = rawProgress < 0.5 ? 4 * rawProgress * rawProgress * rawProgress : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;
  } else if (config.easing === "bounce") {
    const p = rawProgress;
    if (p < 0.3636) progress = 7.5625 * p * p;
    else if (p < 0.7272) {
      const p2 = p - 0.5454;
      progress = 7.5625 * p2 * p2 + 0.75;
    } else if (p < 0.909) {
      const p2 = p - 0.8181;
      progress = 7.5625 * p2 * p2 + 0.9375;
    } else {
      const p2 = p - 0.9545;
      progress = 7.5625 * p2 * p2 + 0.984375;
    }
  } else if (config.easing === "elastic") {
    const c4 = (2 * Math.PI) / 3;
    progress = rawProgress === 0 ? 0 : rawProgress === 1 ? 1 : Math.pow(2, -10 * rawProgress) * Math.sin((rawProgress * 10 - 0.75) * c4) + 1;
  }

  let opacity = 1;
  let scaleX = 1;
  let scaleY = 1;
  let offsetX = 0;
  let offsetY = 0;
  let rotation = 0;
  let shadowBlurBonus = 0;
  let visibleCharsCount = totalChars;

  // -------------------------------------------------------------
  // 2. LOGIKA 20 MOTION TYPES (ANIMASI MASUK)
  // -------------------------------------------------------------
  const motion = config.motion || "slide_up";

  switch (motion) {
    case "fade":
      opacity = progress;
      break;

    case "slide_up":
      opacity = progress;
      offsetY = (1 - progress) * (baseFontSize * 2.2);
      break;

    case "slide_down":
      opacity = progress;
      offsetY = -(1 - progress) * (baseFontSize * 2.2);
      break;

    case "slide_left":
      opacity = progress;
      offsetX = (1 - progress) * (canvasWidth * 0.45);
      break;

    case "slide_right":
      opacity = progress;
      offsetX = -(1 - progress) * (canvasWidth * 0.45);
      break;

    case "slide_diagonal":
      opacity = progress;
      offsetX = (1 - progress) * (canvasWidth * 0.3);
      offsetY = (1 - progress) * (baseFontSize * 2);
      break;

    case "zoom_in":
      opacity = progress;
      scaleX = 0.15 + progress * 0.85;
      scaleY = scaleX;
      break;

    case "zoom_out":
      opacity = progress;
      scaleX = 2.2 - progress * 1.2;
      scaleY = scaleX;
      break;

    case "bounce_drop":
      opacity = Math.min(1, progress * 1.8);
      offsetY = -(1 - progress) * (baseFontSize * 3.5);
      scaleY = 0.5 + Math.sin(progress * Math.PI) * 0.7 + (progress >= 1 ? 0.5 : 0);
      if (progress >= 1) scaleY = 1;
      scaleX = 1 / Math.max(0.7, scaleY * 0.9);
      break;

    case "elastic_pop":
      opacity = Math.min(1, progress * 1.5);
      scaleX = progress < 0.7 ? 0.2 + progress * 1.3 : 1.15 - (progress - 0.7) * 0.5;
      scaleY = scaleX;
      break;

    case "rotate_cw":
      opacity = progress;
      scaleX = 0.3 + progress * 0.7;
      scaleY = scaleX;
      rotation = (1 - progress) * 360;
      break;

    case "rotate_ccw":
      opacity = progress;
      scaleX = 0.3 + progress * 0.7;
      scaleY = scaleX;
      rotation = -(1 - progress) * 360;
      break;

    case "flip_horizontal":
      opacity = Math.min(1, progress * 1.5);
      scaleX = Math.abs(Math.sin(progress * Math.PI * 0.5));
      break;

    case "flip_vertical":
      opacity = Math.min(1, progress * 1.5);
      scaleY = Math.abs(Math.sin(progress * Math.PI * 0.5));
      break;

    case "typewriter":
      visibleCharsCount = Math.floor(rawProgress * totalChars);
      break;

    case "glitch_shake":
      opacity = progress;
      if (rawProgress < 1) {
        offsetX = (Math.random() - 0.5) * 16 * (1 - rawProgress);
        offsetY = (Math.random() - 0.5) * 12 * (1 - rawProgress);
        rotation = (Math.random() - 0.5) * 8 * (1 - rawProgress);
      }
      break;

    case "swing_pendulum":
      opacity = progress;
      rotation = Math.sin((1 - progress) * Math.PI * 2) * 35;
      offsetY = -(1 - progress) * (baseFontSize * 1.2);
      break;

    case "spiral_vortex":
      opacity = progress;
      scaleX = 0.1 + progress * 0.9;
      scaleY = scaleX;
      rotation = (1 - progress) * 720;
      break;

    case "blur_reveal":
      opacity = progress;
      shadowBlurBonus = (1 - progress) * 28;
      scaleX = 1 + (1 - progress) * 0.25;
      scaleY = scaleX;
      break;

    case "slam_zoom":
      opacity = Math.min(1, progress * 2);
      scaleX = progress < 0.8 ? 3.5 - progress * 3.0 : 1.1 - (progress - 0.8) * 0.5;
      scaleY = scaleX;
      break;

    case "none":
    default:
      break;
  }

  // -------------------------------------------------------------
  // 3. LOGIKA 20 LOOP ANIMATIONS (BERULANG KONTINU SETELAH MASUK)
  // -------------------------------------------------------------
  const loop = config.loop || "none";
  const speed = config.loopSpeed || 1.0;
  const loopT = currentTime * speed;

  if (rawProgress >= 0.85 && loop !== "none") {
    switch (loop) {
      case "pulse":
        scaleX *= 1 + Math.sin(loopT * 5) * 0.08;
        scaleY *= 1 + Math.sin(loopT * 5) * 0.08;
        break;

      case "heartbeat": {
        const beatCycle = loopT % 1.2;
        const hbScale = beatCycle < 0.15 ? 1 + Math.sin((beatCycle / 0.15) * Math.PI) * 0.15 : beatCycle < 0.35 ? 1 + Math.sin(((beatCycle - 0.15) / 0.2) * Math.PI) * 0.1 : 1;
        scaleX *= hbScale;
        scaleY *= hbScale;
        break;
      }

      case "float":
        offsetY += Math.sin(loopT * 3.5) * (baseFontSize * 0.25);
        break;

      case "drift_horizontal":
        offsetX += Math.sin(loopT * 2.8) * (canvasWidth * 0.035);
        break;

      case "spin_slow":
        rotation += (loopT * 35) % 360;
        break;

      case "spin_fast":
        rotation += (loopT * 180) % 360;
        break;

      case "wiggle":
        rotation += Math.sin(loopT * 9) * 6;
        break;

      case "jelly_squish": {
        const squish = Math.sin(loopT * 5) * 0.12;
        scaleX *= 1 + squish;
        scaleY *= 1 - squish;
        break;
      }

      case "shiver_tremble":
        offsetX += (Math.random() - 0.5) * 3.5;
        offsetY += (Math.random() - 0.5) * 3.5;
        break;

      case "pendulum_swing":
        rotation += Math.sin(loopT * 4) * 12;
        break;

      case "wave_bob":
        offsetX += Math.cos(loopT * 3.5) * 10;
        offsetY += Math.sin(loopT * 3.5) * 8;
        break;

      case "neon_flicker": {
        const flicker = Math.sin(loopT * 24) * Math.cos(loopT * 13);
        opacity = Math.max(0.35, Math.min(1, opacity * (flicker > 0.4 ? 0.4 : 1)));
        shadowBlurBonus = flicker > 0.3 ? 2 : 16;
        break;
      }

      case "strobe_flash":
        opacity = Math.sin(loopT * 12) > 0 ? 1 : 0.25;
        break;

      case "glitch_twitch":
        if (Math.sin(loopT * 7) > 0.88) {
          offsetX += (Math.random() - 0.5) * 14;
          scaleX *= 1.08;
        }
        break;

      case "breathe": {
        const breath = (Math.sin(loopT * 2) + 1) * 0.5; // 0 .. 1
        scaleX *= 0.96 + breath * 0.08;
        scaleY *= 0.96 + breath * 0.08;
        opacity *= 0.85 + breath * 0.15;
        break;
      }

      case "glow_pulse":
        shadowBlurBonus += (Math.sin(loopT * 6) + 1) * 14;
        break;

      case "orbit_circle":
        offsetX += Math.cos(loopT * 3) * 14;
        offsetY += Math.sin(loopT * 3) * 14;
        break;

      case "bounce_ground": {
        const b = Math.abs(Math.sin(loopT * 4));
        offsetY -= b * (baseFontSize * 0.45);
        if (b < 0.2) {
          scaleX *= 1.06;
          scaleY *= 0.92;
        }
        break;
      }

      case "rainbow_cycle":
        // Diterapkan di layer canvas render warna jika didukung
        shadowBlurBonus += 8;
        break;

      default:
        break;
    }
  }

  return {
    opacity: Math.max(0, Math.min(1, opacity)),
    scaleX,
    scaleY,
    offsetX,
    offsetY,
    rotation,
    shadowBlurBonus,
    visibleCharsCount,
  };
}
