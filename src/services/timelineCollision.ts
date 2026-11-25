import { Clip } from "../stores/projectStore";

/**
 * Menghitung posisi start yang valid untuk sebuah klip agar TIDAK menimpa (overlap) klip lain di track yang sama.
 * Mencegah tabrakan secara magnetis/hard-clamp:
 * - Jika digeser ke kiri membentur akhir klip sebelumnya, dikunci di akhir klip sebelumnya.
 * - Jika digeser ke kanan membentur awal klip berikutnya, dikunci tepat sebelum klip berikutnya.
 */
export function clampNonOverlappingPosition(
  clips: Clip[],
  movingClipId: string,
  desiredStart: number,
  clipDuration: number
): number {
  let validStart = Math.max(0, desiredStart);
  const desiredEnd = validStart + clipDuration;

  // Filter klip lain di track yang sama (selain klip yang sedang digeser)
  const otherClips = clips
    .filter((c) => c.id !== movingClipId)
    .sort((a, b) => a.start - b.start);

  if (otherClips.length === 0) {
    return validStart;
  }

  // 1. Periksa batas kiri: Cari klip tepat di sebelah kiri yang berpotensi ditabrak
  const prevClips = otherClips.filter((c) => c.start < desiredEnd);
  for (const prev of prevClips) {
    // Jika start yang diinginkan mendahului/menimpa klip sebelumnya
    if (validStart < prev.end && desiredEnd > prev.start) {
      // Jika klip digeser mendekati ujung kanan klip sebelumnya
      if (desiredStart < prev.end) {
        validStart = Math.max(validStart, prev.end);
      }
    }
  }

  // 2. Periksa batas kanan: Cari klip di sebelah kanan yang berpotensi ditabrak
  const nextClips = otherClips.filter((c) => c.end > validStart);
  for (const next of nextClips) {
    if (validStart + clipDuration > next.start && validStart < next.end) {
      validStart = Math.min(validStart, Math.max(0, next.start - clipDuration));
    }
  }

  // 3. Verifikasi ulang apakah masih overlap dengan klip manapun
  for (const c of otherClips) {
    const end = validStart + clipDuration;
    if (validStart < c.end - 0.001 && end > c.start + 0.001) {
      // Jika masih ada collision di posisi ini, cari gap terdekat atau kembalikan posisi aman
      if (desiredStart <= c.start) {
        validStart = Math.max(0, c.start - clipDuration);
      } else {
        validStart = c.end;
      }
    }
  }

  return Math.max(0, validStart);
}

/**
 * Menghitung batas aman saat trimming klip (trim-left / trim-right) agar tidak menimpa klip tetangga
 */
export function clampNonOverlappingTrim(
  clips: Clip[],
  trimmingClipId: string,
  edge: "left" | "right",
  targetTime: number
): number {
  const otherClips = clips
    .filter((c) => c.id !== trimmingClipId)
    .sort((a, b) => a.start - b.start);

  const currentClip = clips.find((c) => c.id === trimmingClipId);
  if (!currentClip) return targetTime;

  if (edge === "left") {
    // Cari klip sebelum klip ini
    const prevClip = [...otherClips].reverse().find((c) => c.end <= currentClip.end);
    const minStart = prevClip ? prevClip.end : 0;
    // Start tidak boleh melebihi minStart dan tidak boleh melewati end klip
    return Math.max(minStart, targetTime);
  } else {
    // Cari klip setelah klip ini
    const nextClip = otherClips.find((c) => c.start >= currentClip.start);
    const maxEnd = nextClip ? nextClip.start : Infinity;
    // End tidak boleh melebihi start klip berikutnya
    return Math.min(maxEnd, targetTime);
  }
}
