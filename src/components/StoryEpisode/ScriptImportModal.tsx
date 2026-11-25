import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { parseScript, ParsedSceneItem } from "../../services/scriptParser";

interface ScriptImportModalProps {
  onClose: () => void;
  onImportComplete?: (episodeId: string) => void;
}

export default function ScriptImportModal({ onClose, onImportComplete }: ScriptImportModalProps) {
  const characters = useProjectStore((s) => s.characters);
  const addCharacter = useProjectStore((s) => s.addCharacter);
  const addEpisode = useProjectStore((s) => s.addEpisode);
  const updateEpisode = useProjectStore((s) => s.updateEpisode);
  const addSceneToEpisode = useProjectStore((s) => s.addSceneToEpisode);
  const generateSceneAudio = useProjectStore((s) => s.generateSceneAudio);
  const insertEpisodeToTimeline = useProjectStore((s) => s.insertEpisodeToTimeline);

  // Naskah mentah (default diisi dengan contoh format skenario)
  const [rawText, setRawText] = useState<string>(
`Episode 1 Perkenalan
---------------------

Hima, Aline : Mizuki kamu pelakunya ..... 

Prolog : Kenapa Hima dan Aline menuduh Mizuki mencuri uang Mizano ?

Prolog: Sebelum itu, kita kenalan dengan Trio Detektif Cilik yuk ?!

Mengeluarkan biodata Trio Detektif Cilik

Prolog: Tiga jam sebelum kejadian Mizano kehilangan uang 

Aline : Hai Sakura, Mizano, Mizuki apa kabar ?

Sakura, Mizuki, Adna, Mizano : Hai Aline, Wardne, Hima ......

Aline : Wardne, Hima, sebentar lagi bel masuk sekolah berbunyi 

Warde, Hima : Baik Kak 

Prolog: Ketika Waktu istirahat ....

Sakura : Susah juga ya pelajaran Fisika tadi, pusing kepalaku hahaha

Mizuki : Ah tidak, gampang itu (sambil berlagak sombong)

Aline keluar dari ruang guru menuju ke teman-temannya 

Sakura: Hai Aline, bagaimana pelajaran Fisika tadi, mudah ? Aku pusing nie, ajarin dong .... (ga berhenti sakura bicara)

Aline: oh Fisika tadi bisa kok, pulang sekolah aku ajarin`
  );

  const [parsedData, setParsedData] = useState<{
    detectedTitle: string;
    items: ParsedSceneItem[];
    allDetectedCharacters: string[];
  } | null>(null);

  // Opsi eksekusi
  const [autoGenerateVoice, setAutoGenerateVoice] = useState(false);
  const [autoInsertTimeline, setAutoInsertTimeline] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");

  // Step 1: Analisis / Parsing naskah
  const handleParse = () => {
    if (!rawText.trim()) {
      alert("Silakan tempelkan naskah teks Anda terlebih dahulu.");
      return;
    }
    const result = parseScript(rawText);
    setParsedData(result);
  };

  // Step 2: Eksekusi Import ke Episode, Scene & Timeline
  const handleExecuteImport = async () => {
    if (!parsedData || parsedData.items.length === 0) return;

    setIsProcessing(true);
    setProgressText("Menyiapkan Episode dan Karakter...");

    try {
      // 1. Buat pemetaan karakter yang ada di store vs yang ada di naskah
      // Jika karakter belum ada, buat karakter baru secara otomatis
      const charMap: Record<string, string> = {};

      for (const charName of parsedData.allDetectedCharacters) {
        const existing = characters.find(
          (c) => c.name.toLowerCase().trim() === charName.toLowerCase().trim()
        );
        if (existing) {
          charMap[charName] = existing.id;
        } else {
          // Buat karakter baru otomatis
          const newId = addCharacter({
            name: charName,
            description: `Dibuat otomatis dari naskah: ${charName}`,
          });
          charMap[charName] = newId;
        }
      }

      // 2. Buat Episode Baru
      const epTitle = parsedData.detectedTitle || "Episode Baru dari Naskah";
      const newEpId = addEpisode(epTitle);

      // Bersihkan scene dummy default yang dibuat oleh addEpisode
      updateEpisode(newEpId, { scenes: [] });

      // 3. Masukkan setiap item hasil parsing sebagai Scene
      const totalItems = parsedData.items.length;
      const createdSceneIds: string[] = [];

      for (let i = 0; i < totalItems; i++) {
        const item = parsedData.items[i];
        setProgressText(`Membuat Scene ${i + 1} dari ${totalItems}...`);

        let charId = "";
        let mediaType: "image" | "video" | undefined = undefined;

        if (item.type === "narasi") {
          // Narasi / Prolog: Biarkan character_id kosong (Mode Narator)
          charId = "";
        } else if (item.type === "action") {
          // Action / Visual Note: scene visual
          charId = "";
          mediaType = "image";
        } else if (item.speakers.length > 0) {
          // Ambil karakter utama pertama dari speaker (atau mapping)
          const primarySpeaker = item.speakers[0];
          charId = charMap[primarySpeaker] || "";
        }

        // Teks gabungan yang jelas
        let finalScript = item.script;
        if (item.actionNote && item.type !== "action") {
          finalScript = `${item.script} (${item.actionNote})`;
        }

        const sceneId = addSceneToEpisode(newEpId, {
          character_id: charId,
          script: finalScript,
          duration: item.suggestedDuration,
          media_type: mediaType,
        });

        createdSceneIds.push(sceneId);
      }

      // 4. Jika opsi Auto Generate Voice diaktifkan, jalankan TTS batch
      if (autoGenerateVoice) {
        for (let i = 0; i < createdSceneIds.length; i++) {
          const scId = createdSceneIds[i];
          const item = parsedData.items[i];
          // Jangan generate suara untuk scene murni action note jika user tidak menghendakinya
          if (item.type === "action") continue;

          setProgressText(`Men-generate suara TTS untuk Scene ${i + 1}/${createdSceneIds.length}...`);
          try {
            await generateSceneAudio(newEpId, scId);
          } catch (err) {
            console.warn(`Gagal generate audio untuk scene ${scId}:`, err);
          }
        }
      }

      // 5. Masukkan langsung ke Timeline jika dipilih
      if (autoInsertTimeline) {
        setProgressText("Menyusun adegan ke Timeline...");
        insertEpisodeToTimeline(newEpId, false);
      }

      setProgressText("Selesai!");
      if (onImportComplete) {
        onImportComplete(newEpId);
      }
      onClose();
    } catch (err: any) {
      console.error("Gagal import script:", err);
      alert("Terjadi kesalahan saat memproses naskah: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#181a24] border border-gray-700/80 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-gray-200">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-900/90 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📝</span>
            <div>
              <h2 className="text-base font-bold text-white">Smart Script-to-Video Importer</h2>
              <p className="text-[11px] text-gray-400">
                Prolog, Dialog Karakter, dan Petunjuk Visual otomatis dipecah menjadi adegan terstruktur
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-white p-1 rounded-lg text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!parsedData ? (
            /* STEP 1: Paste Teks Naskah */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300">
                  Tempelkan (Paste) Teks Naskah Skenario di Sini:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setRawText(
`Episode 1 Perkenalan
---------------------
Hima, Aline : Mizuki kamu pelakunya ..... 
Prolog : Kenapa Hima dan Aline menuduh Mizuki mencuri uang Mizano ?
Prolog: Sebelum itu, kita kenalan dengan Trio Detektif Cilik yuk ?!
Mengeluarkan biodata Trio Detektif Cilik
Prolog: Tiga jam sebelum kejadian Mizano kehilangan uang 
Aline : Hai Sakura, Mizano, Mizuki apa kabar ?
Sakura, Mizuki, Adna, Mizano : Hai Aline, Wardne, Hima ......
Aline : Wardne, Hima, sebentar lagi bel masuk sekolah berbunyi 
Warde, Hima : Baik Kak 
Prolog: Ketika Waktu istirahat ....
Sakura : Susah juga ya pelajaran Fisika tadi, pusing kepalaku hahaha
Mizuki : Ah tidak, gampang itu (sambil berlagak sombong)
Aline keluar dari ruang guru menuju ke teman-temannya 
Sakura: Hai Aline, bagaimana pelajaran Fisika tadi, mudah ? Aku pusing nie, ajarin dong ....
Aline: oh Fisika tadi bisa kok, pulang sekolah aku ajarin`
                    );
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                >
                  Muat Contoh Naskah
                </button>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Episode 1...&#10;Prolog: Pada suatu hari...&#10;Karakter 1: Halo!&#10;Petunjuk aksi visual..."
                rows={14}
                className="w-full bg-[#11131a] border border-gray-700/80 rounded-lg p-3.5 text-xs text-gray-200 font-mono leading-relaxed focus:outline-none focus:border-indigo-500 shadow-inner"
              />

              <div className="bg-indigo-950/40 border border-indigo-700/40 rounded-lg p-3 text-[11px] text-indigo-200/90 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-indigo-300">
                  <span>💡</span> Tips Format Skenario yang Didukung Otomatis:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-gray-300 ml-1">
                  <li><b className="text-white">Dialog Karakter:</b> Gunakan format <code className="text-indigo-300">Nama : Ucapan</code> (contoh: <em>Aline : Hai semuanya</em>)</li>
                  <li><b className="text-white">Prolog / Narator:</b> Gunakan <code className="text-indigo-300">Prolog : ...</code> atau <code className="text-indigo-300">Narasi : ...</code> (otomatis dijadikan Voice-Over Narator)</li>
                  <li><b className="text-white">Multi-Karakter:</b> Pisahkan dengan koma (contoh: <em>Hima, Aline : Kami siap!</em>)</li>
                  <li><b className="text-white">Petunjuk Aksi / Visual:</b> Tulis langsung tanpa tanda titik dua (contoh: <em>Aline keluar dari ruang guru...</em>)</li>
                  <li><b className="text-white">Ekspresi dalam kurung:</b> (contoh: <em>(sambil tertawa)</em>) otomatis diidentifikasi sebagai catatan akting/ekspresi.</li>
                </ul>
              </div>
            </div>
          ) : (
            /* STEP 2: Preview Hasil Parsing & Pengaturan */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-900/60 p-3 rounded-lg border border-gray-800">
                <div>
                  <h3 className="font-bold text-sm text-white">🎬 {parsedData.detectedTitle}</h3>
                  <p className="text-[11px] text-gray-400">
                    Terdeteksi <span className="text-indigo-400 font-semibold">{parsedData.items.length} Adegan/Scene</span> &bull;{" "}
                    <span className="text-emerald-400 font-semibold">{parsedData.allDetectedCharacters.length} Karakter Tokoh</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setParsedData(null)}
                  className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded transition-colors"
                >
                  ✏️ Edit Teks Lagi
                </button>
              </div>

              {/* Daftar Karakter Terdeteksi */}
              <div className="bg-[#13151f] p-3 rounded-lg border border-gray-800/80">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  👥 Tokoh yang Ditemukan di Naskah:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {parsedData.allDetectedCharacters.map((charName) => {
                    const alreadyExist = characters.some(
                      (c) => c.name.toLowerCase().trim() === charName.toLowerCase().trim()
                    );
                    return (
                      <span
                        key={charName}
                        className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                          alreadyExist
                            ? "bg-emerald-950/60 border-emerald-700/60 text-emerald-300"
                            : "bg-indigo-950/60 border-indigo-700/60 text-indigo-300"
                        }`}
                      >
                        <span>{alreadyExist ? "✓" : "✨ Baru"}</span>
                        <b>{charName}</b>
                      </span>
                    );
                  })}
                  <span className="text-xs px-2.5 py-1 rounded-full border bg-amber-950/60 border-amber-700/60 text-amber-300 flex items-center gap-1">
                    🎙️ <b>Prolog / Narator</b>
                  </span>
                </div>
              </div>

              {/* Preview Scene-Scene yang akan dibuat */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  📋 Rincian Adegan / Scene ({parsedData.items.length}):
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
                  {parsedData.items.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                        item.type === "narasi"
                          ? "bg-amber-950/20 border-amber-800/40 text-amber-200"
                          : item.type === "action"
                          ? "bg-purple-950/20 border-purple-800/40 text-purple-200"
                          : "bg-gray-800/40 border-gray-700/50 text-gray-200"
                      }`}
                    >
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-900/80 rounded font-bold shrink-0 text-gray-400">
                        #{idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              item.type === "narasi"
                                ? "bg-amber-600/30 text-amber-300"
                                : item.type === "action"
                                ? "bg-purple-600/30 text-purple-300"
                                : "bg-indigo-600/30 text-indigo-300"
                            }`}
                          >
                            {item.speakerRaw}
                          </span>
                          {item.actionNote && item.type !== "action" && (
                            <span className="text-[10px] text-gray-400 italic">
                              🎭 {item.actionNote}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-500 ml-auto">
                            ~{item.suggestedDuration}s
                          </span>
                        </div>
                        <p className="text-xs text-gray-200 leading-relaxed font-sans">
                          {item.script}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opsi Eksekusi */}
              <div className="bg-gray-900/60 p-3.5 rounded-lg border border-gray-800 space-y-2.5">
                <div className="text-xs font-semibold text-gray-300">⚡ Opsi Otomatisasi:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-[#1b1e2a] rounded border border-gray-700/60 hover:border-gray-500">
                    <input
                      type="checkbox"
                      checked={autoInsertTimeline}
                      onChange={(e) => setAutoInsertTimeline(e.target.checked)}
                      className="rounded border-gray-600 text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-semibold text-white">Susun Langsung ke Timeline</div>
                      <div className="text-[10px] text-gray-400">Gelar seluruh adegan di Track Subtitle & Audio</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-[#1b1e2a] rounded border border-gray-700/60 hover:border-gray-500">
                    <input
                      type="checkbox"
                      checked={autoGenerateVoice}
                      onChange={(e) => setAutoGenerateVoice(e.target.checked)}
                      className="rounded border-gray-600 text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-semibold text-white">Generate Suara TTS Sekaligus</div>
                      <div className="text-[10px] text-gray-400">Buat suara sintetis untuk semua dialog secara batch</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-gray-900/90 border-t border-gray-800 flex items-center justify-between">
          <div className="text-xs text-indigo-400">
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin text-sm">⏳</span> {progressText}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              Batal
            </button>

            {!parsedData ? (
              <button
                onClick={handleParse}
                className="px-5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-colors flex items-center gap-1.5"
              >
                <span>🔍</span> Analisis Naskah
              </button>
            ) : (
              <button
                onClick={handleExecuteImport}
                disabled={isProcessing}
                className="px-5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>✨</span> Buat Episode & Generate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
