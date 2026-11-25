import { useState } from "react";
import { useProjectStore, Clip } from "../../stores/projectStore";

interface InternalImageEditorModalProps {
  clip: Clip;
  trackType: string;
  onClose: () => void;
}

export default function InternalImageEditorModal({
  clip,
  trackType,
  onClose,
}: InternalImageEditorModalProps) {
  const updateClipProperties = useProjectStore((s) => s.updateClipProperties);

  const initialTransform = clip.transform || { scale: 1, x: 0, y: 0, rotation: 0 };
  const initialChroma = clip.chroma_key || {
    enabled: false,
    color: "#00FF00",
    similarity: 0.15,
    smoothness: 0.05,
  };

  const [scale, setScale] = useState(initialTransform.scale || 1);
  const [posX, setPosX] = useState(initialTransform.x || 0);
  const [posY, setPosY] = useState(initialTransform.y || 0);
  const [rotation, setRotation] = useState(initialTransform.rotation || 0);

  // Filters (Brightness, Contrast, Saturation, Blur)
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);

  // Chroma key state
  const [chromaEnabled, setChromaEnabled] = useState(initialChroma.enabled);
  const [chromaColor, setChromaColor] = useState(initialChroma.color);
  const [chromaSimilarity, setChromaSimilarity] = useState(initialChroma.similarity);
  const [chromaSmoothness, setChromaSmoothness] = useState(initialChroma.smoothness);

  // Audio / Suara video state
  const [videoMuted, setVideoMuted] = useState(clip.muted ?? false);
  const [videoVolume, setVideoVolume] = useState(clip.volume ?? 1.0);

  const handleApplyChanges = () => {
    updateClipProperties(clip.id, {
      transform: {
        scale,
        x: posX,
        y: posY,
        rotation,
      },
      chroma_key: {
        enabled: chromaEnabled,
        color: chromaColor,
        similarity: chromaSimilarity,
        smoothness: chromaSmoothness,
      },
      muted: videoMuted,
      volume: videoVolume,
    });
    onClose();
  };

  const isVideo =
    trackType === "video" ||
    clip.source?.startsWith("data:video/") ||
    clip.source?.includes(".mp4") ||
    clip.source?.includes(".webm") ||
    clip.source?.includes(".mov") ||
    clip.source?.includes(".mkv");

  const clipFileName = clip.source?.split("/").pop() || (isVideo ? "Video File" : "Image File");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#12141a] border border-[#232733] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#1c1f28] bg-[#161821] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-lg border border-emerald-500/20">
              {isVideo ? "🎬" : "🖼️"}
            </span>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Internal {isVideo ? "Video" : "Image"} & Visual Editor
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {trackType}
                </span>
              </h2>
              <p className="text-[11px] text-gray-400 truncate max-w-sm">
                Klip: <span className="text-gray-200 font-medium">{clipFileName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto flex-1">
          {/* Visual Preview */}
          <div className="flex flex-col items-center justify-center bg-[#0c0d12] rounded-xl border border-[#1f222d] p-4 min-h-[260px] relative overflow-hidden">
            <div className="w-full h-full flex items-center justify-center overflow-hidden relative">
              {clip.source ? (
                isVideo ? (
                  <video
                    src={clip.source}
                    controls
                    playsInline
                    style={{
                      transform: `translate(${posX}px, ${posY}px) rotate(${rotation}deg) scale(${scale})`,
                      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`,
                      maxWidth: "85%",
                      maxHeight: "220px",
                      objectFit: "contain",
                      transition: "transform 0.05s ease-out",
                    }}
                    className="rounded shadow-xl"
                  />
                ) : (
                  <img
                    src={clip.source}
                    alt="Preview"
                    style={{
                      transform: `translate(${posX}px, ${posY}px) rotate(${rotation}deg) scale(${scale})`,
                      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`,
                      maxWidth: "85%",
                      maxHeight: "220px",
                      objectFit: "contain",
                      transition: "transform 0.05s ease-out",
                    }}
                    className="rounded shadow-xl"
                  />
                )
              ) : (
                <div className="text-gray-500 text-xs">Tidak ada sumber visual</div>
              )}
            </div>
            <div className="absolute bottom-2 right-2 text-[10px] font-mono bg-black/60 px-2 py-0.5 rounded text-gray-300">
              Scale: {scale.toFixed(2)}x | Rot: {rotation}°
            </div>
          </div>

          {/* Adjustments & Controls */}
          <div className="space-y-4">
            {/* Transform Controls */}
            <div className="rounded-xl bg-[#151720] border border-[#212532] p-3.5 space-y-2.5">
              <span className="font-semibold text-gray-200 text-xs flex items-center justify-between">
                <span>📐 Geometri & Posisi</span>
                <button
                  onClick={() => {
                    setScale(1);
                    setPosX(0);
                    setPosY(0);
                    setRotation(0);
                  }}
                  className="text-[10px] text-cyan-400 hover:underline font-normal"
                >
                  Reset Posisi
                </button>
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                    <span>Skala (Zoom)</span>
                    <span className="font-mono text-cyan-400">{scale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3"
                    step="0.05"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#232734] rounded appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                    <span>Rotasi</span>
                    <span className="font-mono text-cyan-400">{rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="5"
                    value={rotation}
                    onChange={(e) => setRotation(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#232734] rounded appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Offset X (px)</label>
                  <input
                    type="number"
                    value={posX}
                    onChange={(e) => setPosX(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-[#0f1116] border border-[#262a37] rounded text-gray-200 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Offset Y (px)</label>
                  <input
                    type="number"
                    value={posY}
                    onChange={(e) => setPosY(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-[#0f1116] border border-[#262a37] rounded text-gray-200 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Visual Adjustments */}
            <div className="rounded-xl bg-[#151720] border border-[#212532] p-3.5 space-y-2.5">
              <span className="font-semibold text-gray-200 text-xs">
                🎨 Efek & Penyesuaian Visual
              </span>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                    <span>Kecerahan (Brightness)</span>
                    <span className="font-mono text-cyan-400">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#232734] rounded appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                    <span>Kontras (Contrast)</span>
                    <span className="font-mono text-purple-400">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#232734] rounded appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                    <span>Saturasi Warna</span>
                    <span className="font-mono text-amber-400">{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="250"
                    value={saturation}
                    onChange={(e) => setSaturation(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#232734] rounded appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                    <span>Blur (Radius)</span>
                    <span className="font-mono text-rose-400">{blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={blur}
                    onChange={(e) => setBlur(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#232734] rounded appearance-none cursor-pointer accent-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Chroma Key / Green Screen */}
            <div className="rounded-xl bg-[#151720] border border-[#212532] p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-200 text-xs flex items-center gap-1.5">
                  🟩 Chroma Key (Green Screen)
                </span>
                <input
                  type="checkbox"
                  checked={chromaEnabled}
                  onChange={(e) => setChromaEnabled(e.target.checked)}
                  className="rounded border-[#2f3545] text-cyan-500 focus:ring-cyan-500 bg-[#161821] cursor-pointer"
                />
              </div>

              {chromaEnabled && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">Target Color Key</span>
                    <input
                      type="color"
                      value={chromaColor}
                      onChange={(e) => setChromaColor(e.target.value)}
                      className="w-7 h-6 rounded border border-gray-600 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                      <span>Sensitivitas / Kemiripan</span>
                      <span className="font-mono text-cyan-400">{chromaSimilarity.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.01"
                      max="0.5"
                      step="0.01"
                      value={chromaSimilarity}
                      onChange={(e) => setChromaSimilarity(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-[#232734] rounded appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                      <span>Kehalusan Edge (Smoothness)</span>
                      <span className="font-mono text-cyan-400">{chromaSmoothness.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.01"
                      value={chromaSmoothness}
                      onChange={(e) => setChromaSmoothness(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-[#232734] rounded appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                </div>
              )}
            </div>
            {/* Audio & Suara Video (Khusus Klip Video) */}
            {isVideo && (
              <div className="rounded-xl bg-[#151720] border border-[#212532] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-200 text-xs flex items-center gap-1.5">
                    🔊 Kontrol Suara / Audio Video
                  </span>
                  <button
                    type="button"
                    onClick={() => setVideoMuted(!videoMuted)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors flex items-center gap-1.5 ${
                      videoMuted
                        ? "bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                    }`}
                  >
                    <span>{videoMuted ? "🔇 Suara Mati" : "🔊 Suara Hidup"}</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Volume Video Asli</span>
                    <span className="font-mono text-cyan-400">
                      {videoMuted ? "0% (Muted)" : `${Math.round(videoVolume * 100)}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    disabled={videoMuted}
                    value={videoVolume}
                    onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#232734] rounded appearance-none cursor-pointer accent-cyan-500 disabled:opacity-30"
                  />
                  <p className="text-[10px] text-gray-500 italic">
                    {videoMuted
                      ? "Audio internal video ini dinonaktifkan saat playback dan render."
                      : "Audio internal video ini akan berbunyi dan dirender sesuai volume di atas."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-[#1c1f28] bg-[#161821] flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            Perubahan posisi & transformasi akan otomatis teraplikasikan pada Timeline.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#20232e] hover:bg-[#292c3a] text-gray-300 text-xs font-medium transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleApplyChanges}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5"
            >
              💾 Simpan ke Klip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
