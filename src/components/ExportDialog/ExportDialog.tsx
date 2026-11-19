interface ExportDialogProps {
  onClose: () => void;
}

const PRESETS = [
  { id: "mp4_1080p", label: "MP4 1080p (H.264)", format: "mp4", res: "1920×1080", icon: "🎬" },
  { id: "mp4_4k", label: "MP4 4K (H.265)", format: "mp4", res: "3840×2160", icon: "🎬" },
  { id: "mp4_shorts", label: "MP4 Shorts 9:16", format: "mp4", res: "1080×1920", icon: "📱" },
  { id: "webm_1080p", label: "WebM 1080p (VP9)", format: "webm", res: "1920×1080", icon: "🌐" },
  { id: "mov_prores", label: "MOV ProRes (HQ)", format: "mov", res: "1920×1080", icon: "🎞️" },
  { id: "gif_480p", label: "GIF 480p", format: "gif", res: "854×480", icon: "✨" },
];

export default function ExportDialog({ onClose }: ExportDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-[520px] max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-base font-semibold">📦 Export Video</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-lg"
          >✕</button>
        </div>

        {/* Preset Selection */}
        <div className="p-4 space-y-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pilih Format</p>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                className="p-3 bg-gray-800 border border-gray-700 rounded-lg text-left
                  hover:border-indigo-500 hover:bg-gray-800/80 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{preset.icon}</span>
                  <span className="text-sm font-medium group-hover:text-indigo-300 transition-colors">
                    {preset.label}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500">{preset.res} • .{preset.format}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pengaturan Lanjutan</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">FPS</label>
              <select className="w-full text-xs px-2 py-1.5 bg-gray-800 border border-gray-700 rounded
                focus:border-indigo-500 focus:outline-none text-gray-200">
                <option value="24">24 FPS</option>
                <option value="30" selected>30 FPS</option>
                <option value="60">60 FPS</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Bitrate</label>
              <select className="w-full text-xs px-2 py-1.5 bg-gray-800 border border-gray-700 rounded
                focus:border-indigo-500 focus:outline-none text-gray-200">
                <option value="4M">4 Mbps (Rendah)</option>
                <option value="8M" selected>8 Mbps (Sedang)</option>
                <option value="15M">15 Mbps (Tinggi)</option>
                <option value="25M">25 Mbps (Maks)</option>
              </select>
            </div>
          </div>

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
            <button className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md
              hover:bg-gray-700 text-gray-300 transition-colors">
              📤 Upload ke YouTube
            </button>
            <button className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md
              hover:bg-gray-700 text-gray-300 transition-colors">
              📤 Upload ke TikTok
            </button>
          </div>
          <button className="text-sm px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg
            font-medium transition-colors shadow-lg shadow-indigo-900/30">
            🚀 Export Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
