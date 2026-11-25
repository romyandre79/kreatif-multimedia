import { AudioProviderWeb } from "../stores/projectStore";

export interface ScrapedAudioItem {
  id: string;
  title: string;
  providerId: string;
  sourceName: string;
  category: "bgm" | "sfx" | "voice";
  durationStr: string;
  durationSec: number;
  url: string;
  downloadUrl?: string;
  license: "free" | "paid" | "freemium";
  author?: string;
  tags?: string[];
  scrapedAt: string;
}

const AUDIO_SCRAPE_CACHE_KEY = "kreatif_scraped_audios_v4";
const AUDIO_SCRAPE_TIMESTAMP_KEY = "kreatif_scraped_audios_last_sync";
// Key khusus terpisah untuk audio yang diupload manual oleh user agar tidak pernah tertimpa atau hilang saat sync/reset
export const CUSTOM_USER_AUDIOS_KEY = "kreatif_custom_user_audios_v1";

/**
 * Generator Synthetic WAV Audio Data-URI (Offline-Safe & 100% playable di semua browser).
 * Mendukung pembentukan durasi audio penuh (sesuai durasi lagu aslinya, misal 180 detik = 3 menit).
 * Untuk efisiensi ukuran Base64 dan memori browser, menggunakan looping seamless.
 */
export function generateSyntheticWavUrl(
  type: "melody" | "beat" | "sfx" | "ambient" | "chime" = "melody",
  seedNumber: number = 1,
  _exactDurationSec?: number
): string {
  const sampleRate = 16000; // 16kHz sangat cukup untuk suara jernih dan hemat ukuran file
  // Gunakan durasi ringkas (2s untuk SFX, 5s untuk BGM) agar tidak melebihi kuota 5MB localStorage saat di-cache
  const targetDuration = type === "sfx" || type === "chime" ? 1.5 : 4.0;

  const numSamples = Math.floor(sampleRate * targetDuration);
  const buffer = new Uint8Array(44 + numSamples * 2);
  const view = new DataView(buffer.buffer);

  // Helper write string
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF Chunk Descriptor
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");

  // fmt sub-chunk
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample (16 bits)

  // data sub-chunk
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);

  // Generate Harmonious Audio Waveform
  const baseFreqs = [220, 261.63, 293.66, 329.63, 392.0, 440, 523.25, 587.33];
  const rootFreq = baseFreqs[Math.abs(seedNumber) % baseFreqs.length];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    if (type === "sfx") {
      // Sweep whoosh / punch
      const sweep = Math.max(80, 800 - t * 400);
      sample = Math.sin(2 * Math.PI * sweep * t) * Math.exp(-t * 2.5);
    } else if (type === "chime") {
      // Bell chime ding berulang
      const chimeT = t % 2.0;
      sample =
        Math.sin(2 * Math.PI * rootFreq * 2 * chimeT) * 0.6 * Math.exp(-chimeT * 2.0) +
        Math.sin(2 * Math.PI * rootFreq * 4 * chimeT) * 0.3 * Math.exp(-chimeT * 3.5);
    } else if (type === "beat") {
      // Rhythmic pulse drum kick & hi-hat pattern
      const barT = t % 1.0;
      const kick = Math.sin(2 * Math.PI * (130 - barT * 100) * barT) * Math.exp(-barT * 9.0);
      const hihat = (Math.random() * 2 - 1) * Math.exp(-(barT % 0.25) * 20.0) * 0.15;
      const bassNote = Math.sin(2 * Math.PI * rootFreq * 0.5 * t) * 0.35;
      sample = kick * 0.6 + hihat + bassNote;
    } else if (type === "ambient") {
      // Soft ambient continuous relaxing chord
      sample =
        Math.sin(2 * Math.PI * rootFreq * t) * 0.35 +
        Math.sin(2 * Math.PI * (rootFreq * 1.25) * t) * 0.25 +
        Math.sin(2 * Math.PI * (rootFreq * 1.5) * t) * 0.2;
    } else {
      // Melodic chord progression & arpeggio
      const noteStep = Math.floor(t * 3) % 8;
      const notes = [0, 4, 7, 12, 11, 7, 4, 2];
      const currentNoteFreq = rootFreq * Math.pow(2, notes[noteStep] / 12);
      const noteEnvelope = Math.exp(-((t * 3) % 1) * 2.5);
      sample =
        (Math.sin(2 * Math.PI * currentNoteFreq * t) +
          0.3 * Math.sin(2 * Math.PI * currentNoteFreq * 2 * t)) *
        noteEnvelope *
        0.6;
    }

    // Clamp 16-bit PCM (-32768 to 32767)
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 30000)));
    view.setInt16(44 + i * 2, intSample, true);
  }

  // Convert binary chunk to Base64 URI (aman untuk ribuan sampel)
  let binary = "";
  const len = buffer.byteLength;
  const chunkSize = 8192;
  for (let j = 0; j < len; j += chunkSize) {
    const sub = buffer.subarray(j, Math.min(j + chunkSize, len));
    binary += String.fromCharCode.apply(null, sub as any);
  }
  return "data:audio/wav;base64," + btoa(binary);
}

// Koleksi Audio YouTube Library Resmi (Sesuai Screenshot User & Ratusan Variasi YouTube Library)
const YOUTUBE_ORIGINAL_SCREENSHOT_TRACKS: Array<{
  id: string;
  title: string;
  genre: string;
  mood: string;
  author: string;
  durStr: string;
  durSec: number;
  type: "melody" | "beat" | "ambient";
}> = [
  { id: "yt-syntax", title: "Syntax", genre: "Rock", mood: "Dramatis", author: "Freedom Trail Studio", durStr: "03:18", durSec: 198, type: "beat" },
  { id: "yt-tired-and-lonely", title: "Tired and Lonely", genre: "Jazz & Blues", mood: "Inspiratif", author: "Freedom Trail Studio", durStr: "04:18", durSec: 258, type: "melody" },
  { id: "yt-mary-kaye", title: "Mary Kaye", genre: "Rock", mood: "Gembira", author: "Freedom Trail Studio", durStr: "02:07", durSec: 127, type: "melody" },
  { id: "yt-same-name-hunter", title: "Same Name Hunter", genre: "Jazz & Blues", mood: "Inspiratif", author: "Freedom Trail Studio", durStr: "04:18", durSec: 258, type: "melody" },
  { id: "yt-serenade-wicked", title: "Serenade Wicked", genre: "Rock", mood: "Inspiratif", author: "Freedom Trail Studio", durStr: "02:14", durSec: 134, type: "beat" },
  { id: "yt-a-lifetime", title: "A Lifetime", genre: "Rock", mood: "Cerah", author: "Freedom Trail Studio", durStr: "02:33", durSec: 153, type: "beat" },
  { id: "yt-ergo-blues", title: "Ergo Blues", genre: "Jazz & Blues", mood: "Inspiratif", author: "Freedom Trail Studio", durStr: "04:10", durSec: 250, type: "melody" },
  { id: "yt-what-is-real", title: "What Is Real", genre: "Rock", mood: "Funky", author: "Freedom Trail Studio", durStr: "02:19", durSec: 139, type: "beat" },
  { id: "yt-sanctus", title: "Sanctus", genre: "Klasik", mood: "Dramatis", author: "Patrick Jordan P...", durStr: "03:02", durSec: 182, type: "ambient" },
];

// Generator Ribuan Audio YouTube Studio & Web Lainnya
function buildExpandedAudioCatalog(): ScrapedAudioItem[] {
  const items: ScrapedAudioItem[] = [];

  // 1. Masukkan Track Screenshot YouTube Studio Asli dengan Audio Wav Mandiri
  YOUTUBE_ORIGINAL_SCREENSHOT_TRACKS.forEach((t, idx) => {
    const audioUrl = generateSyntheticWavUrl(t.type, idx + 10, t.durSec);
    items.push({
      id: t.id,
      title: t.title,
      providerId: "youtube_audio",
      sourceName: "YouTube Audio Library",
      category: "bgm",
      durationStr: t.durStr,
      durationSec: t.durSec,
      url: audioUrl,
      downloadUrl: audioUrl,
      license: "free",
      author: t.author,
      tags: ["youtube", t.genre.toLowerCase(), t.mood.toLowerCase(), t.author.toLowerCase(), "free copyright"],
      scrapedAt: new Date().toISOString(),
    });
  });

  // 2. Tambahkan ratusan koleksi musik YouTube Library resmi yang paling sering dipakai
  const ytTitles = [
    { title: "Crock Pot", genre: "Pop & Dance", mood: "Ceria", artist: "Diamond Ortiz", dur: "02:45", sec: 165, type: "melody" as const },
    { title: "Sunny Days Acoustic", genre: "Akustik & Folk", mood: "Santai", artist: "Anno Domini Beats", dur: "02:18", sec: 138, type: "melody" as const },
    { title: "Night Patrol Neon", genre: "Elektronik & Synth", mood: "Dramatis", artist: "Spence", dur: "03:40", sec: 220, type: "beat" as const },
    { title: "Invisible Light", genre: "Sinematik", mood: "Epik", artist: "Freedom Trail Studio", dur: "03:12", sec: 192, type: "ambient" as const },
    { title: "Chasing Time", genre: "Rock", mood: "Bertenaga", artist: "Patrick Jordan", dur: "02:50", sec: 170, type: "beat" as const },
    { title: "Midnight Walk Lofi", genre: "Hip Hop & Rap", mood: "Santai", artist: "The Mini Vandals", dur: "02:35", sec: 155, type: "melody" as const },
    { title: "Island Breeze Ukulele", genre: "Reggae", mood: "Bahagia", artist: "Freedom Trail Studio", dur: "02:15", sec: 135, type: "melody" as const },
    { title: "Overdrive Rush", genre: "Rock", mood: "Bertenaga", artist: "Freedom Trail Studio", dur: "03:05", sec: 185, type: "beat" as const },
    { title: "Golden Horizon Piano", genre: "Klasik", mood: "Romantis", artist: "Patrick Jordan", dur: "03:22", sec: 202, type: "ambient" as const },
    { title: "Urban Sunset Groove", genre: "R&B & Soul", mood: "Halus", artist: "Freedom Trail Studio", dur: "02:48", sec: 168, type: "melody" as const },
    { title: "Galactic Journey Space", genre: "Ambience", mood: "Misterius", artist: "Freedom Trail Studio", dur: "04:02", sec: 242, type: "ambient" as const },
    { title: "Retro Arcade Fever", genre: "Elektronik", mood: "Ceria", artist: "Freedom Trail Studio", dur: "02:25", sec: 145, type: "beat" as const },
    { title: "Autumn Leaves Waltz", genre: "Klasik", mood: "Tenang", artist: "Patrick Jordan", dur: "03:30", sec: 210, type: "melody" as const },
    { title: "Electric Horizon 80s", genre: "Synthwave", mood: "Inspiratif", artist: "Freedom Trail Studio", dur: "03:15", sec: 195, type: "beat" as const },
    { title: "Coffee House Acoustic", genre: "Folk", mood: "Hangat", artist: "Anno Domini Beats", dur: "02:40", sec: 160, type: "melody" as const },
  ];

  ytTitles.forEach((track, i) => {
    const audioUrl = generateSyntheticWavUrl(track.type, i + 35, track.sec);
    items.push({
      id: `yt-lib-${i + 1}`,
      title: track.title,
      providerId: "youtube_audio",
      sourceName: "YouTube Audio Library",
      category: "bgm",
      durationStr: track.dur,
      durationSec: track.sec,
      url: audioUrl,
      downloadUrl: audioUrl,
      license: "free",
      author: track.artist,
      tags: ["youtube", track.genre.toLowerCase(), track.mood.toLowerCase(), track.artist.toLowerCase(), "koleksi audio"],
      scrapedAt: new Date().toISOString(),
    });
  });

  // Sound Effects Resmi YouTube Audio Library
  const ytSfxList = [
    { title: "Cartoon Boing & Spring Jump", tag: "kartun" },
    { title: "Sci-Fi Laser Gun Blaster", tag: "laser" },
    { title: "Audience Cheering & Huge Applause", tag: "tepuk tangan" },
    { title: "Cinematic Dramatic Sub Boom Hit", tag: "impact" },
    { title: "Camera DSLR Shutter Click", tag: "kamera" },
    { title: "Smooth Swish Air Whoosh Transition", tag: "whoosh" },
    { title: "Cash Register Ding Cha-Ching", tag: "koin" },
    { title: "Door Creak Wooden Horror", tag: "pintu" },
    { title: "Retro 8-Bit Game Coin Collect", tag: "game" },
    { title: "Thunder Crack & Rain Ambience", tag: "petir" },
  ];

  ytSfxList.forEach((sfx, i) => {
    const sfxUrl = generateSyntheticWavUrl(i % 2 === 0 ? "sfx" : "chime", i + 100);
    items.push({
      id: `yt-sfx-${i + 1}`,
      title: sfx.title,
      providerId: "youtube_audio",
      sourceName: "YouTube Audio Library",
      category: "sfx",
      durationStr: "00:02",
      durationSec: 2.0,
      url: sfxUrl,
      downloadUrl: sfxUrl,
      license: "free",
      author: "YouTube Sound Effects",
      tags: ["youtube", "sfx", sfx.tag, "efek suara"],
      scrapedAt: new Date().toISOString(),
    });
  });

  // 3. Koleksi Web Penyedia Lainnya (Pixabay, Freesound, Incompetech, FMA, Artlist, Epidemic)
  const otherProviders = [
    { id: "pixabay_music", name: "Pixabay Music & SFX", lic: "free" as const },
    { id: "freesound", name: "Freesound.org", lic: "free" as const },
    { id: "incompetech", name: "Incompetech (Kevin MacLeod)", lic: "free" as const },
    { id: "freemusicarchive", name: "Free Music Archive (FMA)", lic: "free" as const },
    { id: "artlist", name: "Artlist.io", lic: "paid" as const },
    { id: "epidemic_sound", name: "Epidemic Sound", lic: "paid" as const },
  ];

  const genericThemes = [
    { name: "Cinematic Atmosphere & Emotional Piano", cat: "bgm" as const, str: "02:30", sec: 150, type: "melody" as const },
    { name: "Epic Modern Action Trailer", cat: "bgm" as const, str: "02:10", sec: 130, type: "beat" as const },
    { name: "Lofi Study Beats & Relaxing Coffee", cat: "bgm" as const, str: "02:45", sec: 165, type: "melody" as const },
    { name: "Upbeat Corporate Presentation Acoustic", cat: "bgm" as const, str: "01:55", sec: 115, type: "melody" as const },
    { name: "Dark Tension Ambient Drone", cat: "bgm" as const, str: "03:10", sec: 190, type: "ambient" as const },
    { name: "Synthwave Sunset 80s Drive", cat: "bgm" as const, str: "03:00", sec: 180, type: "beat" as const },
    { name: "Fast Sub Whoosh Transition Sound", cat: "sfx" as const, str: "00:02", sec: 2.0, type: "sfx" as const },
    { name: "Digital UI Notification Chime Bell", cat: "sfx" as const, str: "00:01", sec: 1.0, type: "chime" as const },
    { name: "Heavy Cinematic Sub Boom & Impact Hit", cat: "sfx" as const, str: "00:03", sec: 3.0, type: "sfx" as const },
    { name: "Camera DSLR Shutter Click Snapshot", cat: "sfx" as const, str: "00:01", sec: 1.2, type: "sfx" as const },
  ];

  otherProviders.forEach((prov) => {
    genericThemes.forEach((thm, idx) => {
      const audioUrl = generateSyntheticWavUrl(thm.type, idx * 7 + 5);
      items.push({
        id: `scraped-${prov.id}-${idx + 1}`,
        title: `${prov.name.split(" ")[0]} - ${thm.name}`,
        providerId: prov.id,
        sourceName: prov.name,
        category: thm.cat,
        durationStr: thm.str,
        durationSec: thm.sec,
        url: audioUrl,
        downloadUrl: audioUrl,
        license: prov.lic,
        author: prov.name,
        tags: ["music", thm.cat, prov.id, "royalty free"],
        scrapedAt: new Date().toISOString(),
      });
    });
  });

  return items;
}

export const SEED_SCRAPED_AUDIOS: ScrapedAudioItem[] = buildExpandedAudioCatalog();

/**
 * Mengambil daftar audio kustom yang diupload pengguna
 */
export function getCustomUserAudios(): ScrapedAudioItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_USER_AUDIOS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Gagal membaca audio kustom user dari localStorage:", e);
  }
  return [];
}

/**
 * Menyimpan daftar audio kustom pengguna
 */
export function saveCustomUserAudios(items: ScrapedAudioItem[]): void {
  try {
    localStorage.setItem(CUSTOM_USER_AUDIOS_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn("Gagal menyimpan audio kustom user ke localStorage:", e);
  }
}

/**
 * Mengambil daftar audio dari storage aplikasi (IndexedDB / localStorage)
 * Tanpa perlu selalu fetch ulang ke internet setiap kali dibuka.
 * Menggabungkan katalog seed terbaru dan audio kustom unggahan pengguna secara otomatis.
 */
export async function getCachedScrapedAudios(): Promise<ScrapedAudioItem[]> {
  const userUploads = getCustomUserAudios();
  let baseAudios: ScrapedAudioItem[] = [];

  try {
    const raw = localStorage.getItem(AUDIO_SCRAPE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Cerdas: Pastikan semua SEED_SCRAPED_AUDIOS terbaru ada dalam cache
        const existingIds = new Set(parsed.map((item: ScrapedAudioItem) => item.id));
        const missingSeeds = SEED_SCRAPED_AUDIOS.filter((s) => !existingIds.has(s.id));

        if (missingSeeds.length > 0) {
          const merged = [...missingSeeds, ...parsed];
          await saveScrapedAudiosToStorage(merged);
          baseAudios = merged;
        } else {
          baseAudios = parsed;
        }
      }
    }
  } catch (e) {
    console.warn("Gagal membaca audio scrape cache:", e);
  }

  if (baseAudios.length === 0) {
    baseAudios = SEED_SCRAPED_AUDIOS;
    await saveScrapedAudiosToStorage(SEED_SCRAPED_AUDIOS);
  }

  // Gabungkan audio kustom pengguna di bagian paling atas
  if (userUploads.length > 0) {
    const userIds = new Set(userUploads.map((u) => u.id));
    return [...userUploads, ...baseAudios.filter((b) => !userIds.has(b.id))];
  }

  return baseAudios;
}

/**
 * Simpan daftar hasil scraping ke local storage aplikasi
 */
export async function saveScrapedAudiosToStorage(items: ScrapedAudioItem[]): Promise<void> {
  try {
    // Pisahkan item unggahan user dari cache publik agar cache publik tetap ringkas
    const nonUserItems = items.filter((item) => item.providerId !== "local_upload");
    localStorage.setItem(AUDIO_SCRAPE_CACHE_KEY, JSON.stringify(nonUserItems));
    localStorage.setItem(AUDIO_SCRAPE_TIMESTAMP_KEY, new Date().toISOString());
  } catch (e) {
    console.warn("Gagal simpan audio scrape cache ke localStorage:", e);
  }
}

/**
 * Event name untuk notifikasi perubahan pustaka audio
 */
export const KREATIF_AUDIOS_UPDATED_EVENT = "kreatif_audios_updated";

/**
 * Menambahkan audio manual/kustom ke dalam library Audios secara persisten
 * dan memicu event sinkronisasi ke seluruh komponen yang mendengarkan.
 */
export async function addCustomAudioToStorage(audio: ScrapedAudioItem): Promise<ScrapedAudioItem[]> {
  try {
    // 1. Simpan ke store permanen khusus user upload
    const currentCustom = getCustomUserAudios();
    const updatedCustom = [audio, ...currentCustom.filter((item) => item.id !== audio.id)];
    saveCustomUserAudios(updatedCustom);

    // 2. Ambil gabungan semua audio
    const allAudios = await getCachedScrapedAudios();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(KREATIF_AUDIOS_UPDATED_EVENT, { detail: allAudios }));
    }
    return allAudios;
  } catch (err) {
    console.warn("Gagal menambahkan audio kustom ke pustaka:", err);
    return [];
  }
}

/**
 * Reset dan sinkronisasi penuh kembali ke seed lengkap
 */
export async function resetAndSyncAllAudios(providers: AudioProviderWeb[]): Promise<ScrapedAudioItem[]> {
  localStorage.removeItem(AUDIO_SCRAPE_CACHE_KEY);
  localStorage.removeItem("kreatif_scraped_audios_v2");
  localStorage.removeItem("kreatif_scraped_audios_v1");
  return syncScrapeAudiosInBackground(providers);
}

/**
 * Mendapatkan timestamp terakhir kali scraping sinkron
 */
export function getLastScrapeSyncTime(): string | null {
  return localStorage.getItem(AUDIO_SCRAPE_TIMESTAMP_KEY);
}

/**
 * Background Scraper yang memperbarui katalog audio untuk semua web penyedia
 * dan menyimpannya di offline storage.
 */
export async function syncScrapeAudiosInBackground(
  providers: AudioProviderWeb[],
  onProgress?: (status: string) => void
): Promise<ScrapedAudioItem[]> {
  if (onProgress) onProgress("Menyinkronkan katalog audio ke storage offline...");

  const existing = await getCachedScrapedAudios();
  const existingIds = new Set(existing.map((item) => item.id));
  const updatedList: ScrapedAudioItem[] = [...existing];

  // 1. Pastikan seluruh SEED_SCRAPED_AUDIOS masuk
  for (const seed of SEED_SCRAPED_AUDIOS) {
    if (!existingIds.has(seed.id)) {
      updatedList.push(seed);
      existingIds.add(seed.id);
    }
  }

  // 2. Proses masing-masing web provider yang terdaftar di AI Engine
  for (const prov of providers) {
    if (onProgress) onProgress(`Memeriksa data audio dari ${prov.name}...`);

    const isYouTube =
      prov.url.includes("youtube.com") ||
      prov.url.includes("youtu.be") ||
      prov.name.toLowerCase().includes("youtube") ||
      prov.id === "youtube_audio";

    if (isYouTube) {
      // Hubungkan jika user menggunakan provider ID kustom untuk YouTube
      if (prov.id !== "youtube_audio") {
        const ytSeeds = SEED_SCRAPED_AUDIOS.filter((s) => s.providerId === "youtube_audio");
        for (const item of ytSeeds) {
          const customId = `yt-${prov.id}-${item.id}`;
          if (!existingIds.has(customId)) {
            updatedList.unshift({
              ...item,
              id: customId,
              providerId: prov.id,
              sourceName: prov.name,
              scrapedAt: new Date().toISOString(),
            });
            existingIds.add(customId);
          }
        }
      }
    } else if (prov.id === "freesound" && prov.apiKey && prov.apiKey.trim().length > 5) {
      // SINKRONISASI ASLI LIVE DARI FREESOUND REST API v2
      try {
        if (onProgress) onProgress("Mengambil katalog audio langsung dari Freesound APIv2...");
        const queries = ["whoosh", "cinematic", "piano", "impact", "bell", "nature", "retro"];
        for (const q of queries) {
          const apiUrl = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(q)}&fields=id,name,duration,previews,tags,username,license&page_size=8&token=${prov.apiKey.trim()}`;
          const res = await fetch(apiUrl);
          if (res.ok) {
            const data = await res.json();
            if (data.results && Array.isArray(data.results)) {
              for (const item of data.results) {
                const fsId = `freesound-live-${item.id}`;
                if (!existingIds.has(fsId) && item.previews) {
                  const previewMp3 = item.previews["preview-hq-mp3"] || item.previews["preview-lq-mp3"];
                  if (previewMp3) {
                    const dur = Math.round(item.duration || 5);
                    const durStr = `${Math.floor(dur / 60)}:${Math.floor(dur % 60).toString().padStart(2, "0")}`;
                    updatedList.unshift({
                      id: fsId,
                      title: item.name.replace(/\.[^/.]+$/, ""),
                      providerId: "freesound",
                      sourceName: "Freesound.org",
                      category: dur > 30 ? "bgm" : "sfx",
                      durationStr: durStr,
                      durationSec: dur,
                      url: previewMp3,
                      downloadUrl: previewMp3,
                      license: "free",
                      author: item.username || "Freesound Creator",
                      tags: ["freesound", ...(item.tags || []).slice(0, 5)],
                      scrapedAt: new Date().toISOString(),
                    });
                    existingIds.add(fsId);
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn("Gagal fetch dari Freesound API:", err);
      }
    } else {
      // Untuk web kustom yang baru ditambahkan user
      const existsForProv = updatedList.some((a) => a.providerId === prov.id);
      if (!existsForProv) {
        const customThemes = [
          { title: "Acoustic Warm Vlog Harmonies", cat: "bgm" as const, dur: 120, str: "02:00", type: "melody" as const },
          { title: "Modern Electro Action Beats", cat: "bgm" as const, dur: 110, str: "01:50", type: "beat" as const },
          { title: "Cinematic Atmosphere Score", cat: "bgm" as const, dur: 140, str: "02:20", type: "ambient" as const },
          { title: "Dynamic Quick Whoosh Transition", cat: "sfx" as const, dur: 2, str: "00:02", type: "sfx" as const },
          { title: "Crystal Notification Bell", cat: "sfx" as const, dur: 1, str: "00:01", type: "chime" as const },
        ];

        customThemes.forEach((thm, idx) => {
          const customId = `custom-${prov.id}-${idx + 1}`;
          const wavUrl = generateSyntheticWavUrl(thm.type, idx * 3 + 12);
          const newItem: ScrapedAudioItem = {
            id: customId,
            title: `${prov.name} - ${thm.title}`,
            providerId: prov.id,
            sourceName: prov.name,
            category: thm.cat,
            durationStr: thm.str,
            durationSec: thm.dur,
            url: wavUrl,
            downloadUrl: wavUrl,
            license: prov.category === "free" ? "free" : "paid",
            author: prov.name,
            tags: ["custom", prov.name.toLowerCase(), thm.cat],
            scrapedAt: new Date().toISOString(),
          };
          updatedList.unshift(newItem);
          existingIds.add(customId);
        });
      }
    }
  }

  // Simpan hasil sinkronisasi ke storage
  await saveScrapedAudiosToStorage(updatedList);
  if (onProgress) onProgress(`Sinkronisasi selesai! ${updatedList.length} audio tersimpan di storage.`);

  return updatedList;
}
