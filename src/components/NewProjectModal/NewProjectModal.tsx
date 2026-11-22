import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

interface VideoFormatOption {
  id: string;
  label: string;
  aspectRatio: string;
  width: number;
  height: number;
  icon: string;
  description: string;
}

const VIDEO_FORMATS: VideoFormatOption[] = [
  {
    id: "landscape_1080p",
    label: "Landscape (16:9)",
    aspectRatio: "16:9",
    width: 1920,
    height: 1080,
    icon: "🖥️",
    description: "YouTube, Bioskop, TV, Presentasi Desktop (1920×1080 FHD)",
  },
  {
    id: "portrait_tiktok",
    label: "Portrait / Vertikal (9:16)",
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    icon: "📱",
    description: "TikTok, Instagram Reels, YouTube Shorts (1080×1920)",
  },
  {
    id: "square_post",
    label: "Square (1:1)",
    aspectRatio: "1:1",
    width: 1080,
    height: 1080,
    icon: "⏹️",
    description: "Instagram Feed, Sosmed Post, Banner (1080×1080)",
  },
  {
    id: "ultrawide_cinematic",
    label: "Cinematic Ultrawide (21:9)",
    aspectRatio: "21:9",
    width: 2560,
    height: 1080,
    icon: "🎬",
    description: "Film Bioskop, Anamorphic Wide (2560×1080)",
  },
  {
    id: "portrait_4_5",
    label: "Social Portrait (4:5)",
    aspectRatio: "4:5",
    width: 1080,
    height: 1350,
    icon: "📸",
    description: "Instagram Portrait Post (1080×1350)",
  },
];

export default function NewProjectModal({ isOpen, onClose, onCreated }: NewProjectModalProps) {
  const resetNewProject = useProjectStore((s) => s.resetNewProject);

  const [projectName, setProjectName] = useState("Proyek Kreatif Baru");
  const [description, setDescription] = useState("");
  const [selectedFormatId, setSelectedFormatId] = useState("landscape_1080p");
  const [fps, setFps] = useState<number>(30);

  if (!isOpen) return null;

  const currentFormat = VIDEO_FORMATS.find((f) => f.id === selectedFormatId) || VIDEO_FORMATS[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    resetNewProject({
      title: projectName.trim() || "Proyek Kreatif Baru",
      description: description.trim(),
      aspect_ratio: currentFormat.aspectRatio,
      resolution: {
        width: currentFormat.width,
        height: currentFormat.height,
      },
      fps,
    });

    onCreated?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#12141a] border border-[#232733] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1c1f28] bg-[#161821] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 text-base">
              ✨
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Buat Proyek Video Baru</h2>
              <p className="text-[11px] text-gray-400">
                Atur format canvas, nama proyek, dan deskripsi cerita
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

        {/* Content Form */}
        <form onSubmit={handleCreate} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* 1. Nama Project */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">
              Nama Proyek <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Contoh: Petualangan Rimba Ep 1..."
              className="w-full px-3 py-2 bg-[#0c0d12] border border-[#232734] focus:border-cyan-500 rounded-xl text-gray-100 text-xs outline-none transition-all"
            />
          </div>

          {/* 2. Format Video & Aspect Ratio Grid */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5">
              Format Video & Aspek Rasio Canvas
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VIDEO_FORMATS.map((fmt) => {
                const isSelected = fmt.id === selectedFormatId;
                return (
                  <div
                    key={fmt.id}
                    onClick={() => setSelectedFormatId(fmt.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/50 shadow-md shadow-cyan-950/50"
                        : "bg-[#161821] border-[#222530] hover:border-[#313645] text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    <span className="text-xl p-1 bg-black/30 rounded-lg shrink-0">
                      {fmt.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isSelected ? "text-cyan-300" : "text-gray-200"}`}>
                          {fmt.label}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">
                          {fmt.width}×{fmt.height}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">
                        {fmt.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Frame Rate (FPS) */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#161821] border border-[#222530]">
            <div>
              <span className="text-xs font-semibold text-gray-300 block">Frame Rate (FPS)</span>
              <span className="text-[10px] text-gray-400">
                Pilih kecepatan render animasi & playback video
              </span>
            </div>
            <div className="flex gap-1.5">
              {[24, 30, 60].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setFps(val)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-medium border transition-colors ${
                    fps === val
                      ? "bg-cyan-600 text-white border-cyan-500 shadow-sm shadow-cyan-600/40"
                      : "bg-[#0c0d12] border-[#232734] text-gray-400 hover:text-white"
                  }`}
                >
                  {val} FPS
                </button>
              ))}
            </div>
          </div>

          {/* 3. Deskripsi Proyek / Cerita */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">
              Deskripsi Proyek (Opsional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan konsep, alur cerita, atau panduan visual proyek ini..."
              className="w-full px-3 py-2 bg-[#0c0d12] border border-[#232734] focus:border-cyan-500 rounded-xl text-gray-200 text-xs outline-none transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Summary Box */}
          <div className="p-3 bg-[#0d0e14] rounded-xl border border-[#1b1e28] flex items-center justify-between text-[11px] text-gray-400">
            <span>Canvas Target:</span>
            <span className="font-mono text-cyan-400 font-semibold">
              {currentFormat.aspectRatio} • {currentFormat.width}×{currentFormat.height} @ {fps} FPS
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-500">
              *Proyek sebelumnya akan di-reset (bisa di-Undo via Ctrl+Z)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#20232e] hover:bg-[#292c3a] text-gray-300 text-xs font-medium transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition-all flex items-center gap-1.5"
              >
                🚀 Mulai Proyek Baru
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
