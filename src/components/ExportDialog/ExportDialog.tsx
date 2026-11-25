import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { renderAndExportVideo } from "../../services/videoExporter";

interface ExportDialogProps {
  onClose: () => void;
}

const PRESETS = [
  { id: "mp4_1080p", label: "MP4 1080p 16:9", ratio: "16:9", format: "mp4", width: 1920, height: 1080, res: "1920×1080", desc: "YouTube / Video Standar", icon: "🎬" },
  { id: "mp4_4k", label: "MP4 4K 16:9 (UHD)", ratio: "16:9", format: "mp4", width: 3840, height: 2160, res: "3840×2160", desc: "Kualitas Ultra HD", icon: "📺" },
  { id: "mp4_shorts", label: "MP4 Shorts 9:16", ratio: "9:16", format: "mp4", width: 1080, height: 1920, res: "1080×1920", desc: "TikTok / Reels / Shorts", icon: "📱" },
  { id: "mp4_square", label: "MP4 Square 1:1", ratio: "1:1", format: "mp4", width: 1080, height: 1080, res: "1080×1080", desc: "Instagram Post / Feed", icon: "🟦" },
  { id: "webm_1080p", label: "WebM 1080p 16:9", ratio: "16:9", format: "webm", width: 1920, height: 1080, res: "1920×1080", desc: "Web & Browser Streaming", icon: "🌐" },
  { id: "mov_prores", label: "MOV ProRes 16:9", ratio: "16:9", format: "mov", width: 1920, height: 1080, res: "1920×1080", desc: "Master Editing Studio", icon: "🎞️" },
  { id: "gif_480p", label: "GIF Animasi", ratio: "16:9", format: "gif", width: 854, height: 480, res: "854×480", desc: "Looping Animasi Ringan", icon: "✨" },
];

export default function ExportDialog({ onClose }: ExportDialogProps) {
  const projectAspect = useProjectStore((s) => s.meta.aspect_ratio || "16:9");
  const projectTitle = useProjectStore((s) => s.meta.title || "Kreatif_Project");
  const cameraConfig = useProjectStore((s) => s.meta.camera);
  const tracks = useProjectStore((s) => s.timeline.tracks);

  const [selectedPresetId, setSelectedPresetId] = useState(() => {
    return projectAspect === "9:16" ? "mp4_shorts" : projectAspect === "1:1" ? "mp4_square" : "mp4_1080p";
  });
  const [selectedFps, setSelectedFps] = useState("30");
  const [selectedBitrate, setSelectedBitrate] = useState("8M");
  const [isExporting, setIsExporting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const selectedPreset = PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];

  const handleExport = async () => {
    setIsExporting(true);
    setIsError(false);
    setProgressPercent(0);
    setExportNotice("Menyiapkan perenderan...");

    const bitrateVal =
      selectedBitrate === "4M"
        ? 4000000
        : selectedBitrate === "15M"
        ? 15000000
        : selectedBitrate === "25M"
        ? 25000000
        : 8000000;

    try {
      const result = await renderAndExportVideo(tracks, {
        projectName: projectTitle,
        width: selectedPreset.width,
        height: selectedPreset.height,
        fps: parseInt(selectedFps, 10) || 30,
        bitrate: bitrateVal,
        format: selectedPreset.format as "mp4" | "webm" | "mov" | "gif",
        ratio: selectedPreset.ratio,
        camera: cameraConfig,
        onProgress: (pct, msg) => {
          setProgressPercent(pct);
          setExportNotice(msg);
        },
      });

      if (!result.success) {
        setIsError(true);
        setExportNotice(result.error || "Gagal melakukan export video.");
        setIsExporting(false);
      } else {
        setIsExporting(false);
        // Tunggu sebentar lalu tutup dialog
        setTimeout(() => {
          onClose();
        }, 2500);
      }
    } catch (err: unknown) {
      setIsError(true);
      const errMsg = err instanceof Error ? err.message : String(err);
      setExportNotice("Terjadi kesalahan saat export: " + errMsg);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-[540px] max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <div>
              <h2 className="text-sm font-bold text-white">Export Video</h2>
              <p className="text-[10px] text-gray-400">
                Pilih aspect ratio & format video yang Anda inginkan (16:9, 9:16, 1:1)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-lg"
          >✕</button>
        </div>

        {/* Preset Selection */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Pilih Format & Aspek Rasio
            </p>
            <span className="text-[10px] text-cyan-400 font-mono px-1.5 py-0.5 bg-cyan-950/80 border border-cyan-800/60 rounded">
              Canvas Project: {projectAspect}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`p-3 border rounded-lg text-left transition-all ${
                    isSelected
                      ? "bg-cyan-950/70 border-cyan-400 text-white shadow-md shadow-cyan-950/50"
                      : "bg-gray-800/80 border-gray-700/80 text-gray-300 hover:border-gray-600 hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-semibold text-xs">
                      <span>{preset.icon}</span>
                      <span className={isSelected ? "text-cyan-300" : ""}>{preset.label}</span>
                    </div>
                    <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                      preset.ratio === "16:9"
                        ? "bg-blue-950 text-blue-300 border border-blue-800/60"
                        : preset.ratio === "9:16"
                        ? "bg-purple-950 text-purple-300 border border-purple-800/60"
                        : "bg-amber-950 text-amber-300 border border-amber-800/60"
                    }`}>
                      {preset.ratio}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400">{preset.desc}</p>
                  <p className="text-[9px] text-gray-500 font-mono mt-0.5">{preset.res} • .{preset.format}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pengaturan Lanjutan</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">FPS</label>
              <select
                value={selectedFps}
                onChange={(e) => setSelectedFps(e.target.value)}
                className="w-full text-xs px-2 py-1.5 bg-gray-800 border border-gray-700 rounded focus:border-cyan-500 focus:outline-none text-gray-200"
              >
                <option value="24">24 FPS (Sinematik)</option>
                <option value="30">30 FPS (Standar Video)</option>
                <option value="60">60 FPS (Super Halus)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Bitrate</label>
              <select
                value={selectedBitrate}
                onChange={(e) => setSelectedBitrate(e.target.value)}
                className="w-full text-xs px-2 py-1.5 bg-gray-800 border border-gray-700 rounded focus:border-cyan-500 focus:outline-none text-gray-200"
              >
                <option value="4M">4 Mbps (Rendah / Hemat Ukuran)</option>
                <option value="8M">8 Mbps (Sedang - Direkomendasikan)</option>
                <option value="15M">15 Mbps (Tinggi / Tajam)</option>
                <option value="25M">25 Mbps (Maksimum Studio)</option>
              </select>
            </div>
          </div>

          {exportNotice && (
            <div
              className={`p-2.5 rounded-lg text-xs space-y-1.5 animate-in fade-in ${
                isError
                  ? "bg-red-950/80 border border-red-500/60 text-red-200"
                  : "bg-cyan-950/80 border border-cyan-500/60 text-cyan-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{exportNotice}</span>
                {isExporting && (
                  <span className="font-mono font-bold text-cyan-300">{progressPercent}%</span>
                )}
              </div>
              {isExporting && (
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-1.5 transition-all duration-200 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Hardware Acceleration Info */}
          <div className="p-2.5 bg-indigo-950/30 border border-indigo-900/50 rounded-lg">
            <p className="text-[10px] text-indigo-300">
              ⚡ Akselerasi hardware akan digunakan secara otomatis jika tersedia (NVENC / VideoToolbox / VAAPI).
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-gray-800 bg-gray-900/50">
          <div className="flex gap-2">
            <button className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 text-gray-300 transition-colors">
              📤 Upload ke YouTube
            </button>
            <button className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 text-gray-300 transition-colors">
              📤 Upload ke TikTok
            </button>
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="text-xs px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-cyan-900/40"
          >
            {isExporting ? "⏳ Merender..." : "🚀 Export Sekarang"}
          </button>
        </div>
      </div>
    </div>
  );
}
