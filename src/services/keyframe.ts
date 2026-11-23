/**
 * keyframe.ts
 * Logika data dan interpolasi keyframe untuk klip timeline
 * Mendukung animasi dinamis:
 * - Position X, Position Y
 * - Scale (Zoom in / Zoom out)
 * - Rotation
 * - Opacity
 * - Volume (Audio ducking / fade dinamis)
 */

export interface KeyframeProperties {
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  volume?: number;
}

export interface Keyframe {
  id: string;
  time: number; // detik relatif terhadap durasi klip (0 <= time <= clipDuration)
  properties: KeyframeProperties;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
}

/**
 * Easing functions
 */
function applyEasing(t: number, easing: string = "linear"): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case "easeIn":
      return clamped * clamped;
    case "easeOut":
      return clamped * (2 - clamped);
    case "easeInOut":
      return clamped < 0.5 ? 2 * clamped * clamped : -1 + (4 - 2 * clamped) * clamped;
    case "linear":
    default:
      return clamped;
  }
}

/**
 * Menginterpolasi nilai properti klip pada waktu tertentu (relativeTime dalam detik dari awal klip)
 */
export function interpolateKeyframes(
  keyframes: Keyframe[] | undefined,
  relativeTime: number,
  baseProperties: KeyframeProperties
): KeyframeProperties {
  if (!keyframes || keyframes.length === 0) {
    return baseProperties;
  }

  // Urutkan keyframe berdasarkan waktu (time ascending)
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // Jika waktu berada sebelum keyframe pertama
  if (relativeTime <= sorted[0].time) {
    return {
      ...baseProperties,
      ...sorted[0].properties,
    };
  }

  // Jika waktu berada setelah keyframe terakhir
  if (relativeTime >= sorted[sorted.length - 1].time) {
    return {
      ...baseProperties,
      ...sorted[sorted.length - 1].properties,
    };
  }

  // Cari dua keyframe yang mengapit relativeTime
  let prevKey = sorted[0];
  let nextKey = sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (relativeTime >= sorted[i].time && relativeTime <= sorted[i + 1].time) {
      prevKey = sorted[i];
      nextKey = sorted[i + 1];
      break;
    }
  }

  const span = nextKey.time - prevKey.time;
  if (span <= 0.0001) {
    return {
      ...baseProperties,
      ...prevKey.properties,
    };
  }

  const rawT = (relativeTime - prevKey.time) / span;
  const t = applyEasing(rawT, nextKey.easing || "linear");

  const result: KeyframeProperties = { ...baseProperties };

  const keys: (keyof KeyframeProperties)[] = ["x", "y", "scale", "rotation", "opacity", "volume"];

  for (const k of keys) {
    const valPrev = prevKey.properties[k] !== undefined ? prevKey.properties[k] : baseProperties[k];
    const valNext = nextKey.properties[k] !== undefined ? nextKey.properties[k] : baseProperties[k];

    if (valPrev !== undefined && valNext !== undefined) {
      result[k] = valPrev + (valNext - valPrev) * t;
    } else if (valPrev !== undefined) {
      result[k] = valPrev;
    } else if (valNext !== undefined) {
      result[k] = valNext;
    }
  }

  return result;
}
