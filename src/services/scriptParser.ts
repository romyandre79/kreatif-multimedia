/**
 * scriptParser.ts
 * Parser naskah otomatis untuk skenario/dialog/prolog/narasi
 * Mampu membaca:
 * 1. Judul Episode: "Episode 1 Perkenalan", "Episode 2: Petualangan", dll.
 * 2. Karakter / Prolog: "Hima, Aline : Mizuki kamu...", "Prolog : Kenapa Hima...", "Narasi: ..."
 * 3. Multi-Speaker: "Sakura, Mizuki, Adna, Mizano : Hai..."
 * 4. Catatan Aksi (Action Note): "Mengeluarkan biodata...", "Aline keluar dari ruang guru...", "(sambil berlagak sombong)"
 */

export interface ParsedSceneItem {
  speakerRaw: string;           // misal "Hima, Aline", "Prolog", "Sakura", "Action / Visual"
  type: "dialog" | "narasi" | "action";
  speakers: string[];           // nama karakter terpecah ["Hima", "Aline"]
  script: string;               // naskah teks bersih yang dibaca suara TTS / subtitle
  actionNote?: string;          // catatan aksi / visual / ekspresi
  suggestedDuration: number;    // estimasi durasi awal (detik)
}

export interface ParsedScriptResult {
  detectedTitle: string;
  items: ParsedSceneItem[];
  allDetectedCharacters: string[];
}

/**
 * Mem-parsing teks naskah mentah menjadi kumpulan adegan terstruktur
 */
export function parseScript(rawText: string): ParsedScriptResult {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  let detectedTitle = "Episode Baru";
  const items: ParsedSceneItem[] = [];
  const characterSet = new Set<string>();

  // Pola regex pengenal baris dialog / prolog / narasi:
  // Contoh: "Aline : Hai Sakura...", "Prolog: Tiga jam...", "Sakura, Mizano: ..."
  // Group 1: Speaker(s), Group 2: Isi Teks
  const dialogRegex = /^([^:\n]{1,60})\s*:\s*(.+)$/i;

  // Pola separator seperti "---------------------" atau "====="
  const separatorRegex = /^[-=_*#]{3,}$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Abaikan garis pembatas
    if (separatorRegex.test(line)) {
      continue;
    }

    // Deteksi judul episode (biasanya di baris pertama atau diawali "Episode", "Bab", "Scene")
    if (
      (i === 0 && /^episode\s*\d+/i.test(line)) ||
      (i <= 2 && /^(episode|bab|part|judul|title)\b/i.test(line))
    ) {
      detectedTitle = line.replace(/^[-*#\s]+/, "").trim();
      continue;
    }

    const match = line.match(dialogRegex);
    if (match) {
      const speakerRaw = match[1].trim();
      const contentRaw = match[2].trim();

      // Cek apakah ini Prolog / Narasi / Narator / VO
      const isNarasi = /^(prolog|narasi|narator|voiceover|vo|storyteller)\b/i.test(speakerRaw);

      // Ekstrak ekspresi dalam tanda kurung jika ada, contoh: "(sambil berlagak sombong)"
      let cleanScript = contentRaw;
      let actionNote = "";

      const parenMatch = contentRaw.match(/\(([^)]+)\)/);
      if (parenMatch) {
        actionNote = parenMatch[1].trim();
        cleanScript = contentRaw.replace(/\([^)]+\)/g, "").replace(/\s{2,}/g, " ").trim();
      }

      // Jika cleanScript kosong setelah tanda kurung dihapus, gunakan contentRaw
      if (!cleanScript) {
        cleanScript = contentRaw;
      }

      // Hitung estimasi durasi wajar (sekitar 14-16 karakter per detik untuk bicara normal bahasa Indonesia, minimal 2.5s)
      const estimatedDur = Math.max(2.5, Math.min(15, parseFloat((cleanScript.length / 15 + 1.0).toFixed(1))));

      if (isNarasi) {
        items.push({
          speakerRaw: "Prolog / Narasi",
          type: "narasi",
          speakers: [],
          script: cleanScript,
          actionNote: actionNote || undefined,
          suggestedDuration: estimatedDur,
        });
      } else {
        // Karakter dialog (bisa single atau multiple speaker "Hima, Aline")
        const speakers = speakerRaw
          .split(/[,&/]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        speakers.forEach((s) => characterSet.add(s));

        items.push({
          speakerRaw,
          type: "dialog",
          speakers,
          script: cleanScript,
          actionNote: actionNote || undefined,
          suggestedDuration: estimatedDur,
        });
      }
    } else {
      // Baris ini tidak memiliki tanda titik dua ( : )
      // Kemungkinan ini adalah Catatan Aksi (Action Note / Petunjuk Scene)
      // Contoh: "Mengeluarkan biodata Trio Detektif Cilik", "Aline keluar dari ruang guru menuju ke teman-temannya"
      
      // Jika barisnya seperti judul episode yang tertinggal
      if (/^episode\s*\d+/i.test(line)) {
        detectedTitle = line;
        continue;
      }

      // Petunjuk aksi / visual
      items.push({
        speakerRaw: "🎬 Catatan Aksi / Visual",
        type: "action",
        speakers: [],
        script: line, // untuk catatan scene visual
        actionNote: line,
        suggestedDuration: 3.5,
      });
    }
  }

  return {
    detectedTitle,
    items,
    allDetectedCharacters: Array.from(characterSet),
  };
}
