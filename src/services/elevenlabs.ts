// Service integrasi ElevenLabs REST API

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  preview_url?: string;
}

// Model AI ElevenLabs yang didukung
export interface ElevenLabsModel {
  model_id: string;
  name: string;
  description: string;
  can_do_text_to_speech?: boolean;
}

export const DEFAULT_ELEVENLABS_MODELS: ElevenLabsModel[] = [
  {
    model_id: "eleven_multilingual_v2",
    name: "Eleven Multilingual v2 (Direkomendasikan)",
    description: "Kualitas tertinggi, sangat ekspresif, fasih berbahasa Indonesia & 28 bahasa lain.",
  },
  {
    model_id: "eleven_flash_v2_5",
    name: "Eleven Flash v2.5 (Ultra Cepat & Ringan)",
    description: "Latency ~75ms, hemat kuota, mendukung Bahasa Indonesia & 31 bahasa lain.",
  },
  {
    model_id: "eleven_turbo_v2_5",
    name: "Eleven Turbo v2.5 (High Speed Multilingual)",
    description: "Kecepatan tinggi dengan output suara berkualitas studio.",
  },
  {
    model_id: "eleven_monolingual_v1",
    name: "Eleven English v1",
    description: "Model klasik khusus bahasa Inggris.",
  },
];

// Default popular ElevenLabs voices (lengkap dengan suara premade & suara Indonesia terpopuler)
export const DEFAULT_ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  // Karakter Suara Indonesia Populer (Community / Custom Library)
  { voice_id: "iP95p4xoKVk53GoZ742B", name: "🇮🇩 Suara Pria - Indonesia NPC", category: "Indonesian Library" },
  { voice_id: "ThT5KcBeYPX3keUQqHPh", name: "🇮🇩 Serena - Heartfelt Indonesian", category: "Indonesian Library" },
  { voice_id: "TX3LPaxmHKxFdv7VOQHJ", name: "🇮🇩 Ricky - Soft & Authentic Indonesian", category: "Indonesian Library" },
  { voice_id: "yoZ06aMxZJJ28mfd3POQ", name: "🇮🇩 Finn - Expressive & Ads Indonesian", category: "Indonesian Library" },
  { voice_id: "XB0fDUnXU5powFXDhCwa", name: "🇮🇩 Rocky - Lifestyle Commercial", category: "Indonesian Library" },
  { voice_id: "VR6AewLTigWG4xSOukaG", name: "🇮🇩 Andra - Gaming Narrator", category: "Indonesian Library" },
  { voice_id: "N2lVS1w4EtoT3dr4eOWO", name: "🇮🇩 Angga - Authentic Indonesian", category: "Indonesian Library" },
  { voice_id: "onwK4e9ZLuTAKqWW03F9", name: "🇮🇩 BonaErwin - Bahasa Indonesia", category: "Indonesian Library" },
  { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "🇮🇩 Siti - Clean, Chill, Casual", category: "Indonesian Library" },
  { voice_id: "pNInz6obpgDQGcFmaJgB", name: "🇮🇩 Fikri - Warm & Steady Storyteller", category: "Indonesian Library" },

  // Premade Global Voices Populer
  { voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Tenang, Ceria, Ramah)", category: "premade" },
  { voice_id: "AZnzlk1XvdvUeBnXmlld", name: "Domi (Tegas, Kuat, Berwibawa)", category: "premade" },
  { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Bella (Ekspresif, Alami, Narasi)", category: "premade" },
  { voice_id: "ErXwobaYiN019PkySvjV", name: "Antoni (Pria Hangat, Storyteller)", category: "premade" },
  { voice_id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli (Muda, Santai, Karakter)", category: "premade" },
  { voice_id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh (Pria Dalam, Karismatik)", category: "premade" },
  { voice_id: "VR6AewLTigWG4xSOukaG", name: "Arnold (Pria Berat, Aksi/Trailer)", category: "premade" },
  { voice_id: "pNInz6obpgDQGcFmaJgB", name: "Adam (Pria Narator Profesional)", category: "premade" },
  { voice_id: "flq6f7yk4E4fJM5XTYuZ", name: "Michael (Audiobook, Suara Berat)", category: "premade" },
  { voice_id: "JBFqnCBsd6RMkjVDRZzb", name: "George (Pria Dewasa, Dongeng)", category: "premade" },
];

/**
 * Fetch daftar model AI ElevenLabs yang tersedia
 */
export async function fetchElevenLabsModels(apiKey: string): Promise<ElevenLabsModel[]> {
  if (!apiKey) return DEFAULT_ELEVENLABS_MODELS;

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/models", {
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const ttsModels = data.filter((m: any) => m.can_do_text_to_speech);
        if (ttsModels.length > 0) {
          return ttsModels.map((m: any) => ({
            model_id: m.model_id,
            name: m.name,
            description: m.description,
            can_do_text_to_speech: m.can_do_text_to_speech,
          }));
        }
      }
    }
  } catch (err) {
    console.warn("Gagal fetch ElevenLabs models:", err);
  }

  return DEFAULT_ELEVENLABS_MODELS;
}

/**
 * Fetch daftar voice yang tersedia dari akun ElevenLabs pengguna (Personal + Premade + Community/Shared & Indonesian Voices)
 */
export async function fetchElevenLabsVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
  if (!apiKey) return DEFAULT_ELEVENLABS_VOICES;

  const voicesMap = new Map<string, ElevenLabsVoice>();

  // 1. Tarik daftar voice utama (personal, cloned, dan premade yang aktif di akun)
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.voices && Array.isArray(data.voices)) {
        data.voices.forEach((v: any) => {
          voicesMap.set(v.voice_id, {
            voice_id: v.voice_id,
            name: v.name,
            category: v.category || "my_voices",
            preview_url: v.preview_url,
          });
        });
      }
    } else {
      console.warn("Gagal fetch voices v1:", await res.text());
    }
  } catch (err) {
    console.warn("ElevenLabs voices fetch warning:", err);
  }

  // 2. Tarik daftar shared/community voices khusus Bahasa Indonesia ("Indonesian") dari Voice Library
  try {
    const indoRes = await fetch("https://api.elevenlabs.io/v1/shared-voices?search=Indonesian&page_size=100", {
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (indoRes.ok) {
      const indoData = await indoRes.json();
      if (indoData.voices && Array.isArray(indoData.voices)) {
        indoData.voices.forEach((v: any) => {
          if (!voicesMap.has(v.voice_id)) {
            voicesMap.set(v.voice_id, {
              voice_id: v.voice_id,
              name: `🇮🇩 ${v.name}`,
              category: "Indonesian Library",
              preview_url: v.preview_url,
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn("Gagal query Indonesian shared voices:", err);
  }

  // 3. Tarik shared voices umum tambahan (page_size 50)
  try {
    const sharedRes = await fetch("https://api.elevenlabs.io/v1/shared-voices?page_size=50", {
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (sharedRes.ok) {
      const sharedData = await sharedRes.json();
      if (sharedData.voices && Array.isArray(sharedData.voices)) {
        sharedData.voices.forEach((v: any) => {
          if (!voicesMap.has(v.voice_id)) {
            voicesMap.set(v.voice_id, {
              voice_id: v.voice_id,
              name: v.name,
              category: "Community Library",
              preview_url: v.preview_url,
            });
          }
        });
      }
    }
  } catch (err) {
    // Shared voices endpoint opsional
  }

  // Gabungkan dengan premade default jika belum ada
  DEFAULT_ELEVENLABS_VOICES.forEach((def) => {
    if (!voicesMap.has(def.voice_id)) {
      voicesMap.set(def.voice_id, def);
    }
  });

  return Array.from(voicesMap.values());
}

/**
 * Generate audio speech dari teks menggunakan ElevenLabs Text-to-Speech API
 * Mengembalikan Object URL audio MP3 yang bisa langsung dimainkan & dimasukkan ke timeline
 */
export async function generateElevenLabsSpeech(
  apiKey: string,
  voiceId: string,
  text: string,
  stability: number = 0.5,
  similarityBoost: number = 0.75,
  modelId: string = "eleven_multilingual_v2"
): Promise<{ audioUrl: string; duration: number }> {
  if (!apiKey) {
    throw new Error("ElevenLabs API Key belum diisi. Buka menu '🤖 AI Provider' untuk memasukkan API Key.");
  }

  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || "21m00Tcm4TlvDq8ikWAM"}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: modelId || "eleven_multilingual_v2", // Mendukung pilihan model fleksibel
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API Error (${response.status}): ${errorText}`);
  }

  const blob = await response.blob();

  // Konversi blob ke base64 data URL agar audio tidak corrupt/hilang saat page refresh atau simpan ke project file
  const audioUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // Hitung durasi aktual file audio yang dihasilkan
  const duration = await getAudioBlobDuration(blob);

  return { audioUrl, duration };
}

// Helper untuk membaca durasi eksak audio blob
function getAudioBlobDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const tempAudio = new Audio();
    const url = URL.createObjectURL(blob);
    tempAudio.src = url;
    tempAudio.addEventListener("loadedmetadata", () => {
      const dur = tempAudio.duration;
      URL.revokeObjectURL(url);
      resolve(isNaN(dur) || !isFinite(dur) ? 3.5 : parseFloat(dur.toFixed(2)));
    });
    tempAudio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      resolve(3.5);
    });
  });
}
