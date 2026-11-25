import { Clip } from "../stores/projectStore";

/**
 * Menghitung posisi start yang valid untuk sebuah klip di track/layer yang sama.
 * 
 * Mendukung pergeseran fleksibel (drag & reorder):
 * 1. User dapat leluasa menggeser klip ke posisi kosong mana pun di layer yang sama.
 * 2. Jika digeser melewati klip lain (melewati titik tengah klip lain), klip-klip tetangga
 *    akan bertukar urutan (reorder/swap) secara mulus tanpa saling tumpang tindih.
 * 3. Jika klip diletakkan di celah yang berdekatan dengan klip lain, posisi otomatis
 *    menempel (snapping/magnet) di batas tepi klip tetangga agar tidak pernah bertabrakan/menimpa.
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

  // Cek apakah posisi yang diinginkan menimpa klip lain
  const overlappingClip = otherClips.find(
    (c) => validStart < c.end - 0.05 && desiredEnd > c.start + 0.05
  );

  if (overlappingClip) {
    // Hitung posisi tengah (midpoint) dari klip yang tertimpa
    const overlapMidpoint = (overlappingClip.start + overlappingClip.end) / 2;
    const movingMidpoint = validStart + clipDuration / 2;

    if (movingMidpoint < overlapMidpoint) {
      // Jika kursor pengguna lebih condong ke kiri dari klip yang ditimpa:
      // Posisikan klip ini tepat di sebelah kiri dari overlappingClip
      const targetStart = overlappingClip.start - clipDuration;
      
      // Pastikan juga tidak menabrak klip sebelumnya lagi jika ada
      const prevClip = [...otherClips].reverse().find((c) => c.end <= overlappingClip.start && c.id !== overlappingClip.id);
      if (prevClip && targetStart < prevClip.end) {
        // Jika ruang di antara prevClip dan overlappingClip tidak cukup, posisikan mepet ke overlappingClip atau prevClip
        validStart = Math.max(prevClip.end, targetStart);
      } else {
        validStart = Math.max(0, targetStart);
      }
    } else {
      // Jika kursor pengguna lebih condong ke kanan dari klip yang ditimpa (menyeberang/reorder ke kanan):
      // Posisikan klip ini tepat di sebelah kanan dari overlappingClip
      const targetStart = overlappingClip.end;

      // Pastikan juga tidak menabrak klip setelahnya jika ada
      const nextClip = otherClips.find((c) => c.start >= overlappingClip.end && c.id !== overlappingClip.id);
      if (nextClip && targetStart + clipDuration > nextClip.start) {
        validStart = Math.min(targetStart, Math.max(0, nextClip.start - clipDuration));
      } else {
        validStart = targetStart;
      }
    }
  }

  // Jaga agar start tidak pernah negatif
  return Math.max(0, validStart);
}

/**
 * Otomatis mengatur ulang (repack / ripple) klip-klip di track yang sama
 * ketika sebuah klip digeser ke posisi baru, sehingga jika posisi klip bertukar urutan (swap),
 * klip yang digeser dan klip tetangga otomatis bergeser rapi tanpa tabrakan.
 */
export function reorderClipsOnTrack(
  clips: Clip[],
  movingClipId: string,
  newStart: number
): Clip[] {
  const currentClip = clips.find((c) => c.id === movingClipId);
  if (!currentClip) return clips;

  const duration = currentClip.end - currentClip.start;
  const otherClips = clips
    .filter((c) => c.id !== movingClipId)
    .sort((a, b) => a.start - b.start);

  if (otherClips.length === 0) {
    return clips.map((c) =>
      c.id === movingClipId
        ? { ...c, start: Math.max(0, newStart), end: Math.max(0, newStart) + duration }
        : c
    );
  }

  // Tentukan apakah posisi newStart menimpa klip lain
  const candidateStart = Math.max(0, newStart);
  const candidateEnd = candidateStart + duration;

  // Bangun daftar klip dengan urutan baru
  const updatedClips = [...clips];
  const movingIndex = updatedClips.findIndex((c) => c.id === movingClipId);
  if (movingIndex === -1) return clips;

  // Cek apakah klip digeser melewati klip lain untuk melakukan swap/reorder urutan
  const overlapped = otherClips.find(
    (c) => candidateStart < c.end - 0.05 && candidateEnd > c.start + 0.05
  );

  if (overlapped) {
    const overlapMid = (overlapped.start + overlapped.end) / 2;
    const movingMid = candidateStart + duration / 2;

    if (movingMid >= overlapMid) {
      // Pindah ke setelah overlapped
      const targetStart = overlapped.end;
      updatedClips[movingIndex] = {
        ...currentClip,
        start: targetStart,
        end: targetStart + duration,
      };
    } else {
      // Pindah ke sebelum overlapped
      const targetStart = Math.max(0, overlapped.start - duration);
      // Geser overlapped dan klip selanjutnya jika bertabrakan
      const shiftAmount = (targetStart + duration) - overlapped.start;
      if (shiftAmount > 0) {
        for (let i = 0; i < updatedClips.length; i++) {
          if (updatedClips[i].id !== movingClipId && updatedClips[i].start >= overlapped.start) {
            const d = updatedClips[i].end - updatedClips[i].start;
            updatedClips[i] = {
              ...updatedClips[i],
              start: updatedClips[i].start + shiftAmount,
              end: updatedClips[i].start + shiftAmount + d,
            };
          }
        }
      }
      updatedClips[movingIndex] = {
        ...currentClip,
        start: targetStart,
        end: targetStart + duration,
      };
    }
    return updatedClips;
  }

  // Jika tidak menimpa klip manapun (berada di ruang kosong), langsung set posisinya
  const safeStart = clampNonOverlappingPosition(clips, movingClipId, newStart, duration);
  updatedClips[movingIndex] = {
    ...currentClip,
    start: safeStart,
    end: safeStart + duration,
  };

  return updatedClips;
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
