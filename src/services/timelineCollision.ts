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
 * Otomatis mengatur ulang dan menggeser (ripple push / auto-shift) klip-klip lain
 * jika sebuah klip digeser dan mendarat/menimpa di atas klip lain.
 * 
 * Perilaku cerdas:
 * 1. Jika klip diletakkan di ruang kosong, posisinya langsung ditempatkan di posisi tersebut.
 * 2. Jika klip menimpa sebagian atau seluruh klip lain, klip yang tertimpa dan seluruh klip di kanannya
 *    otomatis bergeser ke kanan (ripple push) sebesar durasi klip yang disisipkan/digerakkan.
 * 3. Klip di sebelah kiri tetap pada posisinya (tidak terganggu).
 * 4. Mendukung pemindahan di track yang sama maupun saat berpindah ke track baru.
 */
export function reorderClipsOnTrack(
  clips: Clip[],
  movingClipId: string,
  newStart: number,
  overrideMovingClip?: Clip
): Clip[] {
  const currentClip = overrideMovingClip || clips.find((c) => c.id === movingClipId);
  if (!currentClip) return clips;

  const duration = Math.max(0.2, currentClip.end - currentClip.start);
  const targetStart = Math.max(0, newStart);
  const targetEnd = targetStart + duration;

  // Filter klip lain selain klip yang sedang digeser dan urutkan ascending berdasarkan start time
  const otherClips = clips
    .filter((c) => c.id !== movingClipId)
    .sort((a, b) => a.start - b.start);

  if (otherClips.length === 0) {
    return [
      {
        ...currentClip,
        id: movingClipId,
        start: targetStart,
        end: targetEnd,
      },
    ];
  }

  // Periksa apakah targetStart - targetEnd menimpa atau tumpang tindih dengan klip lain
  const overlappedClip = otherClips.find(
    (c) => targetStart < c.end - 0.05 && targetEnd > c.start + 0.05
  );

  let updatedOtherClips = otherClips.map((c) => ({ ...c }));

  if (overlappedClip) {
    // Jika klip ditaruh tepat di atas klip lain:
    // Seluruh klip yang posisinya bersinggungan atau berada di kanannya akan otomatis digeser (push ripple)
    // sehingga klip yang baru ditaruh mendapatkan ruang persis sebesar durasinya tanpa tumpang tindih.
    for (let i = 0; i < updatedOtherClips.length; i++) {
      const c = updatedOtherClips[i];
      // Jika klip ini tertimpa atau berada di kanan posisi targetStart
      if (c.end > targetStart + 0.05) {
        if (c.start < targetStart) {
          // Jika klip sebelumnya tertimpa ujung ekornya:
          // Klip ini dan selanjutnya digeser agar start-nya mulai setelah targetEnd
          const clipDur = c.end - c.start;
          c.start = targetEnd;
          c.end = targetEnd + clipDur;
        } else {
          // Klip yang memang berada di kanan digeser sebesar durasi klip yang masuk
          const clipDur = c.end - c.start;
          const shiftStart = Math.max(c.start + duration, targetEnd);
          c.start = shiftStart;
          c.end = shiftStart + clipDur;
        }
      }
    }

    // Rapikan kembali agar tidak ada rantai tabrakan bertingkat pada klip-klip yang digeser
    for (let i = 0; i < updatedOtherClips.length - 1; i++) {
      const curr = updatedOtherClips[i];
      const next = updatedOtherClips[i + 1];
      if (next.start < curr.end) {
        const nextDur = next.end - next.start;
        next.start = curr.end;
        next.end = curr.end + nextDur;
      }
    }
  }

  const placedClip: Clip = {
    ...currentClip,
    id: movingClipId,
    start: targetStart,
    end: targetEnd,
  };

  // Gabungkan dan urutkan kembali semua klip
  const allClips = [...updatedOtherClips, placedClip].sort((a, b) => a.start - b.start);
  return allClips;
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
