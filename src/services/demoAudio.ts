// Generator file audio WAV murni untuk demo offline
// Menghasilkan musik instrumen petualangan epik (Chords + Melodi) dalam format WAV nyata

export function generateEpicBgmWav(): string {
  const sampleRate = 22050;
  const duration = 15.0; // 15 detik demo
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  // Header RIFF WAV
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);

  // Sintesis Progresi Akord Sinematik Epik: Am -> F -> C -> G
  const chordFreqs = [
    [220.0, 261.63, 329.63], // Am (A3, C4, E4)
    [174.61, 220.0, 261.63], // F  (F3, A3, C4)
    [130.81, 164.81, 196.0],  // C  (C3, E3, G3)
    [196.0, 246.94, 293.66], // G  (G3, B3, D4)
  ];

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const chordIdx = Math.floor(t / 3.75) % 4;
    const freqs = chordFreqs[chordIdx];

    // Akord pad hangat
    let sample = 0;
    for (const f of freqs) {
      sample += Math.sin(2 * Math.PI * f * t) * 0.15;
      sample += Math.sin(2 * Math.PI * (f * 2) * t) * 0.05; // Harmonics
    }

    // Melodi lembut di atas
    const melodyNote = (Math.floor(t * 2) % 4 === 0) ? 440 : 523.25;
    sample += Math.sin(2 * Math.PI * melodyNote * t) * 0.08 * Math.exp(-(t % 0.5) * 3);

    // Fade in di awal & Fade out di akhir
    let env = 1.0;
    if (t < 1.0) env = t;
    if (t > 13.5) env = Math.max(0, (15.0 - t) / 1.5);

    sample = Math.max(-1, Math.min(1, sample * env));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

// Generator Suara Voiceover Karakter Bima
export function generateHeroVoiceWav(): string {
  const sampleRate = 22050;
  const duration = 6.0; // 6 detik
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Modulasi frekuensi intonasi suara dialog manusia
    const baseFreq = 125 + Math.sin(t * 7) * 20;
    let sample = Math.sin(2 * Math.PI * baseFreq * t) * 0.45 +
                 Math.sin(2 * Math.PI * (baseFreq * 2.2) * t) * 0.25;

    // Ritme kata dialog (berhenti di antara kata)
    const rhythm = Math.sin(t * 12);
    const speechGate = rhythm > -0.3 ? 1.0 : 0.05;

    let env = 1.0;
    if (t < 0.2) env = t / 0.2;
    if (t > 5.5) env = Math.max(0, (6.0 - t) / 0.5);

    sample = Math.max(-1, Math.min(1, sample * speechGate * env));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}
