import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { generateGeminiImage, generateGeminiVideo } from "../../services/geminiFlow";

interface GeminiGeneratorModalProps {
  onClose: () => void;
  targetCharacterId?: string;
  onImageGenerated?: (imageUrl: string) => void;
  onVideoGenerated?: (videoUrl: string) => void;
}

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
  const [prompt, setPrompt] = useState(
    targetChar?.description
      ? `Full body character portrait of ${targetChar.name}, ${targetChar.description}, transparent or solid green background, cinematic 8k, Unreal Engine 5 render style`
      : "Cinematic establishing shot of a fantasy ancient realm under a twin moon, volumetric lighting, 8k resolution"
  );
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async () => {
    const apiKey = aiSettings.imageGen.apiKey;
    if (!apiKey) {
      setErrorMsg("Gemini API Key belum diisi! Silakan buka menu 'AI Engine' di toolbar untuk memasukkan API Key.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      if (mode === "image") {
        const urls = await generateGeminiImage(apiKey, {
          prompt,
          aspectRatio,
          numberOfImages: 1,
        });
        setGeneratedResults(urls);
      } else {
        const videoUrl = await generateGeminiVideo(apiKey, {
          prompt,
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
          source: url,
          start: currentTime,
          end: currentTime + 6.0,
        });
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#12141a] border border-[#262a38] rounded-2xl shadow-2xl w-[600px] max-h-[90vh] flex flex-col overflow-hidden text-xs text-gray-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#212430] flex items-center justify-between bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              ✨
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Google Gemini Flow Generator
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                  Imagen 3 / Veo
                </span>
              </h2>
              <p className="text-[10px] text-gray-400">
                Generate gambar aset karakter & klip video sinematik dengan Google AI
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
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                mode === "image"
                  ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <span>🖼️</span>
              <span>Generate Gambar (Imagen 3)</span>
            </button>
            <button
              onClick={() => setMode("video")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                mode === "video"
                  ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <span>🎬</span>
              <span>Generate Video (Veo Flow)</span>
            </button>
          </div>

          {/* Prompt Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-gray-300">
                Deskripsi / Prompt AI:
              </label>
              <span className="text-[10px] text-cyan-400 font-mono">
                {targetChar ? `Target: ${targetChar.name}` : "General Asset"}
              </span>
            </div>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Tulis prompt visual detail... contoh: Cyberpunk warrior with glowing neon sword, green screen background, ultra realistic 8k"
              className="w-full px-3 py-2 bg-[#171a23] border border-[#2c3142] rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-400 text-xs resize-none transition-colors"
            />
          </div>

          {/* Aspect Ratio Options */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-300">Aspek Rasio:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "16:9", label: "16:9 (Landscape YouTube)" },
                { id: "9:16", label: "9:16 (Portrait TikTok/Reels)" },
                { id: "1:1", label: "1:1 (Square)" },
              ].map((ratio) => (
                <button
                  key={ratio.id}
                  onClick={() => setAspectRatio(ratio.id as any)}
                  className={`py-2 px-2.5 rounded-lg border text-center font-medium transition-all ${
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
              <label className="text-[11px] font-semibold text-emerald-400">
                ✅ Hasil Generate:
              </label>
              <div className="grid grid-cols-1 gap-3">
                {generatedResults.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl overflow-hidden border border-[#2b3040] bg-black/60 aspect-video flex items-center justify-center"
                  >
                    {mode === "video" && url.endsWith(".mp4") ? (
                      <video src={url} controls className="w-full h-full object-contain" />
                    ) : (
                      <img src={url} alt="Gemini Flow Result" className="w-full h-full object-contain" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleUseResult(url)}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 transition-all"
                      >
                        <span>🚀</span>
                        <span>Masukkan ke Timeline</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#212430] bg-[#101217] flex items-center justify-between">
          <span className="text-[10px] text-gray-500">
            Powered by Google Gemini Multimodal Flow API
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-gray-700 hover:bg-gray-800 text-gray-300 font-medium transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-600 to-cyan-500 hover:opacity-95 text-white font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all"
            >
              {isGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sedang Generate...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Generate dengan Gemini</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
