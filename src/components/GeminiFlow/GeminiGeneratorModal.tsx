import { useState, useRef, useEffect } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { generateGeminiImage, generateGeminiVideo, fileToBase64 } from "../../services/geminiFlow";

interface GeminiGeneratorModalProps {
  onClose: () => void;
  targetCharacterId?: string;
  onImageGenerated?: (imageUrl: string) => void;
  onVideoGenerated?: (videoUrl: string) => void;
}

// Preset Pose Populer untuk Karakter
interface PosePreset {
  id: string;
  label: string;
  icon: string;
  promptSnippet: string;
}

const POSE_PRESETS: PosePreset[] = [
  {
    id: "run",
    label: "Lari Cepat (Running)",
    icon: "🏃",
    promptSnippet: "full body running dynamically, action motion, determined expression",
  },
  {
    id: "walk",
    label: "Jalan Santai (Walking)",
    icon: "🚶",
    promptSnippet: "walking forward casually, natural stride, full body",
  },
  {
    id: "sit",
    label: "Duduk Santai (Sitting)",
    icon: "🪑",
    promptSnippet: "sitting relaxed on a chair or bench, hands resting, looking ahead",
  },
  {
    id: "jump",
    label: "Melompat (Jumping)",
    icon: "🦘",
    promptSnippet: "mid-air jumping, energetic heroic pose, floating motion",
  },
  {
    id: "fight",
    label: "Siap Bertarung (Battle Stance)",
    icon: "🥊",
    promptSnippet: "combat martial arts fighting stance, raised fists, intense gaze",
  },
  {
    id: "talk",
    label: "Berbicara / Diskusi (Talking)",
    icon: "🗣️",
    promptSnippet: "talking and gesturing with hands, friendly expressive facial emotion",
  },
  {
    id: "laugh",
    label: "Tertawa Bahagia (Laughing)",
    icon: "😄",
    promptSnippet: "laughing joyfully, happy broad smile, open relaxed posture",
  },
  {
    id: "think",
    label: "Berpikir (Thinking)",
    icon: "🤔",
    promptSnippet: "thoughtful pose, hand touching chin, deep contemplative expression",
  },
  {
    id: "point",
    label: "Menunjuk Arah (Pointing)",
    icon: "👉",
    promptSnippet: "pointing index finger forward towards the viewer with confidence",
  },
  {
    id: "tired",
    label: "Kelelahan / Lemas (Exhausted)",
    icon: "😮‍💨",
    promptSnippet: "panting and exhausted, hands on knees, catching breath",
  },
];

export default function GeminiGeneratorModal({
  onClose,
  targetCharacterId,
  onImageGenerated,
  onVideoGenerated,
}: GeminiGeneratorModalProps) {
  const aiSettings = useProjectStore((s) => s.aiSettings);
  const characters = useProjectStore((s) => s.characters);
  const addCharacterAsset = useProjectStore((s) => s.addCharacterAsset);
  const addClipToTrack = useProjectStore((s) => s.addClipToTrack);
  const tracks = useProjectStore((s) => s.timeline.tracks);
  const currentTime = useProjectStore((s) => s.currentTime);

  const targetChar = characters.find((c) => c.id === targetCharacterId);

  const [mode, setMode] = useState<"image" | "video">("image");
  const [selectedPoseId, setSelectedPoseId] = useState<string | null>(null);

  // User short manual prompt input (e.g. "lari", "terbang di awan", "memegang pedang")
  const [manualPrompt, setManualPrompt] = useState<string>("");

  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceBase64, setReferenceBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Otomatis pasang avatar karakter sebagai gambar referensi awal jika belum ada
  useEffect(() => {
    if (targetChar?.avatar && !referenceImage) {
      setReferenceImage(targetChar.avatar);
      if (targetChar.avatar.startsWith("data:image/")) {
        const rawBase64 = targetChar.avatar.split(",")[1] || targetChar.avatar;
        setReferenceBase64(rawBase64);
      }
    }
  }, [targetChar, referenceImage]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setReferenceImage(previewUrl);

    try {
      const base64 = await fileToBase64(file);
      setReferenceBase64(base64);
    } catch (err) {
      console.error("Gagal convert gambar:", err);
    }
  };

  const clearReferenceImage = () => {
    setReferenceImage(null);
    setReferenceBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Bangun full prompt cerdas otomatis menggabungkan pose preset, deskripsi karakter, dan prompt manual
  const buildFinalPrompt = (): string => {
    const parts: string[] = [];

    // 1. Identitas Karakter
    if (targetChar) {
      parts.push(`Character ${targetChar.name}`);
      if (targetChar.description) {
        parts.push(`(${targetChar.description})`);
      }
    }

    // 2. Pose Preset
    const preset = POSE_PRESETS.find((p) => p.id === selectedPoseId);
    if (preset) {
      parts.push(`posing in ${preset.promptSnippet}`);
    }

    // 3. User Manual Action / Prompt
    if (manualPrompt.trim()) {
      parts.push(`performing action: ${manualPrompt.trim()}`);
    }

    // 4. Latar Belakang & Kualitas Visual
    parts.push("solid green screen background, full body view, consistent face and attire, highly detailed 8k cinematic");

    return parts.join(", ");
  };

  const handleGenerate = async () => {
    const apiKey = aiSettings.imageGen.apiKey;
    if (!apiKey) {
      setErrorMsg("Gemini API Key belum diisi! Silakan buka menu 'AI Engine' di toolbar untuk memasukkan API Key.");
      return;
    }

    const finalPrompt = buildFinalPrompt();

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      if (mode === "image") {
        const urls = await generateGeminiImage(apiKey, {
          prompt: finalPrompt,
          referenceImageBase64: referenceBase64 || undefined,
          aspectRatio,
          numberOfImages: 1,
        });
        setGeneratedResults(urls);
      } else {
        const videoUrl = await generateGeminiVideo(apiKey, {
          prompt: finalPrompt,
          referenceImageBase64: referenceBase64 || undefined,
          aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9",
        });
        setGeneratedResults([videoUrl]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat memanggil Gemini API.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseResult = (url: string) => {
    if (targetCharacterId) {
      addCharacterAsset(targetCharacterId, url);
    }

    if (mode === "image") {
      onImageGenerated?.(url);
      const imageTrack = tracks.find((t) => t.type === "image") || tracks[0];
      if (imageTrack) {
        addClipToTrack(imageTrack.id, {
          characterId: targetCharacterId,
          source: url,
          start: currentTime,
          end: currentTime + 5.0,
          chroma_key: {
            enabled: true,
            color: "#00FF00",
            similarity: 0.18,
            smoothness: 0.05,
          },
        });
      }
    } else {
      onVideoGenerated?.(url);
      const videoTrack = tracks.find((t) => t.type === "video") || tracks[0];
      if (videoTrack) {
        addClipToTrack(videoTrack.id, {
          characterId: targetCharacterId,
          source: url,
          start: currentTime,
          end: currentTime + 6.0,
          chroma_key: {
            enabled: true,
            color: "#00FF00",
            similarity: 0.18,
            smoothness: 0.05,
          },
        });
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm select-none p-4">
      <div className="bg-[#12141a] border border-[#262a38] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-xs text-gray-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#212430] flex items-center justify-between bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-transparent shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              ✨
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Gemini Flow Pose Generator
                {targetChar && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-normal">
                    👤 {targetChar.name}
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-gray-400">
                Pilih variasi pose atau ketik aksi manual dengan referensi karakter otomatis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Mode Switcher: Image vs Video */}
          <div className="flex bg-[#191c24] p-1 rounded-xl border border-[#272b3a]">
            <button
              onClick={() => setMode("image")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                mode === "image"
                  ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <span>🖼️</span>
              <span>Generate Pose Gambar (Imagen 3)</span>
            </button>
            <button
              onClick={() => setMode("video")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                mode === "video"
                  ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <span>🎬</span>
              <span>Generate Motion Video (Veo)</span>
            </button>
          </div>

          {/* Referensi Karakter Awal */}
          <div className="p-3 rounded-xl bg-[#161822] border border-[#262a3a] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                <span>🖼️</span>
                <span>Pose / Foto Referensi Awal (Dikirim ke Gemini):</span>
              </label>
              {referenceImage && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] text-cyan-400 hover:underline"
                  >
                    Ganti Foto
                  </button>
                  <button
                    onClick={clearReferenceImage}
                    className="text-[10px] text-red-400 hover:text-red-300"
                  >
                    ✕ Hapus
                  </button>
                </div>
              )}
            </div>

            {referenceImage ? (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-black/40 border border-[#2b3040]">
                <img
                  src={referenceImage}
                  alt="Referensi"
                  className="w-14 h-14 object-cover rounded-md border border-[#3b4154] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-emerald-400">
                    ✓ Pose Awal Terpasang {targetChar ? `(Foto ${targetChar.name})` : ""}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                    Gemini akan membaca karakter ini dan mengubahnya sesuai aksi/pose pilihan Anda tanpa perlu prompt panjang.
                  </p>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-[#2f3549] hover:border-indigo-500 rounded-lg p-3 text-center cursor-pointer transition-colors bg-black/20"
              >
                <p className="text-[11px] font-medium text-indigo-300">
                  + Klik untuk upload foto/pose awal karakter
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* 1. Quick Pose Presets Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                <span>⚡</span>
                <span>Pilihan Cepat Pose:</span>
              </label>
              {selectedPoseId && (
                <button
                  onClick={() => setSelectedPoseId(null)}
                  className="text-[10px] text-gray-400 hover:text-white"
                >
                  Reset Pilihan
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {POSE_PRESETS.map((p) => {
                const isSelected = selectedPoseId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPoseId(isSelected ? null : p.id)}
                    className={`py-1.5 px-2 rounded-lg border text-left transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-sm"
                        : "bg-[#181a24] border-[#252838] text-gray-400 hover:text-gray-200 hover:border-gray-600"
                    }`}
                  >
                    <span className="text-sm shrink-0">{p.icon}</span>
                    <span className="text-[10px] font-medium truncate">{p.label.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Manual Action / Prompt Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-300 flex items-center justify-between">
              <span>✍️ Tambah / Ketik Aksi Manual (Cukup Kata Kunci Singkat):</span>
              <span className="text-[10px] text-gray-500 font-normal">Opsional</span>
            </label>
            <input
              type="text"
              value={manualPrompt}
              onChange={(e) => setManualPrompt(e.target.value)}
              placeholder="Contoh: lari mengejar bola, melompat dari tebing, memegang pedang bercahaya..."
              className="w-full px-3 py-2 bg-[#171a23] border border-[#2c3142] focus:border-cyan-400 rounded-xl text-gray-100 placeholder-gray-500 text-xs outline-none transition-colors"
            />
          </div>

          {/* Preview Final Prompt yang Akan Dikirim ke AI */}
          <div className="p-2.5 rounded-lg bg-[#0c0d12] border border-[#1e222e] text-[10px] text-gray-400">
            <span className="text-gray-500 block mb-0.5">Prompt Otomatis ke Gemini:</span>
            <span className="font-mono text-cyan-300/90 leading-relaxed block break-words">
              {buildFinalPrompt()}
            </span>
          </div>

          {/* Aspect Ratio Options */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-300">Aspek Rasio Canvas:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "16:9", label: "16:9 (Landscape YouTube)" },
                { id: "9:16", label: "9:16 (Portrait TikTok/Reels)" },
                { id: "1:1", label: "1:1 (Square)" },
              ].map((ratio) => (
                <button
                  key={ratio.id}
                  onClick={() => setAspectRatio(ratio.id as any)}
                  className={`py-1.5 px-2 rounded-lg border text-center font-medium transition-all ${
                    aspectRatio === ratio.id
                      ? "bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-sm"
                      : "bg-[#181b24] border-[#252938] text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-start gap-2">
              <span>⚠️</span>
              <span className="flex-1 leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Result Display */}
          {generatedResults.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#252936]">
              <label className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                <span>✅</span> Hasil Generate ({mode === "video" ? "Video Motion" : "Gambar Pose"}):
              </label>
              <div className="grid grid-cols-1 gap-3">
                {generatedResults.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl overflow-hidden border border-[#2b3040] bg-black/60 aspect-video flex items-center justify-center"
                  >
                    {mode === "video" && (url.endsWith(".mp4") || url.startsWith("data:video/")) ? (
                      <video src={url} controls className="w-full h-full object-contain" />
                    ) : (
                      <img src={url} alt="Gemini Pose Result" className="w-full h-full object-contain" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleUseResult(url)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all"
                      >
                        <span>🚀</span>
                        <span>Simpan ke Karakter & Timeline</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-[#212430] bg-[#14161f] flex items-center justify-between shrink-0">
          <span className="text-[10px] text-gray-500">
            Karakter awal otomatis dipertahankan wajah & gaya visualnya.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#20232e] hover:bg-[#292c3a] text-gray-300 text-xs font-medium transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sedang Men-generate...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Generate Pose Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
