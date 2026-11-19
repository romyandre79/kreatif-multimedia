// Engine TTS Suara Manusia (Bahasa Indonesia & Multi-bahasa)
// Menggunakan Web Speech Engine native OS + Google Speech Engine online fallback

/**
 * Memainkan suara kata-kata bahasa manusia asli secara real-time via Web Speech Synthesis
 */
export function playSpokenSpeech(text: string, lang = "id-ID", rate = 1.0): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }

    // Cancel antrian suara sebelumnya agar tidak tumpang tindih
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;

    // Cari voice bahasa Indonesia terbaik yang terinstall di Windows/Mac
    const selectBestVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      // Prioritas 1: Bahasa Indonesia (misal: "Microsoft Andika", "Google Bahasa Indonesia")
      const idVoice = voices.find((v) => v.lang.replace("_", "-").startsWith("id"));
      if (idVoice) {
        utterance.voice = idVoice;
      }
    };

    selectBestVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = selectBestVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Generate audio speech kata-kata manusia asli sebagai file Audio URL
 * Menggunakan online speech endpoint (Google Translate TTS audio endpoint)
 * yang menghasilkan suara manusia fasih berbahasa Indonesia dalam format MP3 asli
 */
export async function generateNaturalSpeechAudio(
  text: string,
  lang = "id"
): Promise<{ audioUrl: string; duration: number }> {
  // Hitung durasi estimasi pengucapan (~130 kata per menit)
  const wordCount = text.trim().split(/\s+/).length;
  const duration = Math.max(2.0, parseFloat(((wordCount / 125) * 60).toFixed(1)));

  try {
    const encodedText = encodeURIComponent(text.trim());
    // Endpoint audio TTS manusia Bahasa Indonesia (100% gratis & native audio)
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodedText}`;

    // Test apakah audio dapat di-load
    const testAudio = new Audio(audioUrl);
    await new Promise((resolve, reject) => {
      testAudio.onloadedmetadata = () => resolve(true);
      testAudio.onerror = () => reject(new Error("Network TTS error"));
      // Timeout 2 detik jika offline
      setTimeout(() => resolve(true), 2000);
    });

    return { audioUrl, duration };
  } catch (err) {
    console.warn("Menggunakan fallback Web Speech synthesis:", err);
    // Jika offline, kembalikan audio dummy dan gunakan Web Speech API saat play
    return { audioUrl: "", duration };
  }
}
