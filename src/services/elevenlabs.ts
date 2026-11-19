// Service integrasi ElevenLabs REST API

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  preview_url?: string;
}

// Default popular ElevenLabs voices
export const DEFAULT_ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  { voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Tenang, Ceria, Ramah)" },
  { voice_id: "AZnzlk1XvdvUeBnXmlld", name: "Domi (Tegas, Kuat, Berwibawa)" },
  { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Bella (Ekspresif, Alami, Narasi)" },
  { voice_id: "ErXwobaYiN019PkySvjV", name: "Antoni (Pria Hangat, Storyteller)" },
  { voice_id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli (Muda, Santai, Karakter)" },
  { voice_id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh (Pria Dalam, Karismatik)" },
  { voice_id: "VR6AewLTigWG4xSOukaG", name: "Arnold (Pria Berat, Aksi/Trailer)" },
  { voice_id: "pNInz6obpgDQGcFmaJgB", name: "Adam (Pria Narator Profesional)" },
];

/**
 * Fetch daftar voice yang tersedia dari akun ElevenLabs pengguna
 */
export async function fetchElevenLabsVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
  if (!apiKey) return DEFAULT_ELEVENLABS_VOICES;

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (!res.ok) {
      console.warn("Gagal fetch ElevenLabs voices, menggunakan default.", await res.text());
      return DEFAULT_ELEVENLABS_VOICES;
    }

    const data = await res.json();
    if (data.voices && Array.isArray(data.voices)) {
      return data.voices.map((v: any) => ({
        voice_id: v.voice_id,
        name: v.name,
        category: v.category,
        preview_url: v.preview_url,
      }));
    }
  } catch (err) {
    console.error("ElevenLabs fetch error:", err);
  }

  return DEFAULT_ELEVENLABS_VOICES;
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
  similarityBoost: number = 0.75
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
      model_id: "eleven_multilingual_v2", // Mendukung Bahasa Indonesia & 28 bahasa lain secara fasih
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
  const audioUrl = URL.createObjectURL(blob);

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
