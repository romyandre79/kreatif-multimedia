import { useState } from "react";
import { useProjectStore, Clip } from "../../stores/projectStore";

interface InternalSubtitleEditorModalProps {
  clip: Clip;
  trackType: string;
  onClose: () => void;
}

export default function InternalSubtitleEditorModal({
  clip,
  trackType,
  onClose,
}: InternalSubtitleEditorModalProps) {
  const updateClipProperties = useProjectStore((s) => s.updateClipProperties);
  const [text, setText] = useState<string>(clip.text || "");
  const [fontSize, setFontSize] = useState<number>(
    (clip.style?.fontSize as number) || 28
  );
  const [fontColor, setFontColor] = useState<string>(
    (clip.style?.color as string) || "#FFFFFF"
  );
  const [bgColor, setBgColor] = useState<string>(
    (clip.style?.backgroundColor as string) || "rgba(0,0,0,0.6)"
  );

  const handleApplyChanges = () => {
    updateClipProperties(clip.id, {
      text,
      style: {
        ...clip.style,
        fontSize,
        color: fontColor,
        backgroundColor: bgColor,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#12141a] border border-[#232733] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#1c1f28] bg-[#161821] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 text-lg border border-amber-500/20">
              💬
            </span>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Internal Subtitle & Text Editor
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {trackType}
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                Ubah teks naskah dan styling subtitle klip timeline
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
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Subtitle Preview Box */}
          <div className="rounded-xl bg-[#0b0c10] border border-[#1f222d] p-6 flex flex-col items-center justify-center min-h-[120px] text-center relative overflow-hidden">
            <div
              style={{
                fontSize: `${fontSize}px`,
                color: fontColor,
                backgroundColor: bgColor,
                padding: "6px 14px",
                borderRadius: "6px",
                lineHeight: "1.3",
                fontWeight: "600",
                maxWidth: "90%",
                textShadow: "0 2px 4px rgba(0,0,0,0.8)",
              }}
            >
              {text || "Contoh Teks Subtitle..."}
            </div>
            <span className="absolute bottom-1 right-2 text-[10px] text-gray-600 font-mono">
              Live Text Preview
            </span>
          </div>

          {/* Script Textarea */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5">
              Naskah Subtitle (Dialog)
            </label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ketik naskah teks atau dialog di sini..."
              className="w-full px-3 py-2.5 bg-[#0f1116] border border-[#272b38] rounded-xl text-gray-200 text-xs focus:border-amber-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Typography & Color controls */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-[#151720] border border-[#212532]">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Ukuran Font ({fontSize}px)</label>
              <input
                type="range"
                min="16"
                max="64"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full h-1.5 bg-[#232734] rounded appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Warna Font</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fontColor}
                  onChange={(e) => setFontColor(e.target.value)}
                  className="w-8 h-7 rounded border border-gray-600 bg-transparent cursor-pointer"
                />
                <span className="text-[10px] font-mono text-gray-400">{fontColor}</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Background Highlight</label>
              <select
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-full px-2 py-1 bg-[#0f1116] border border-[#272b38] rounded text-gray-200 text-xs"
              >
                <option value="rgba(0,0,0,0.6)">Transparan Gelap</option>
                <option value="rgba(0,0,0,0)">Tanpa Background</option>
                <option value="rgba(245,158,11,0.8)">Kuning Amber</option>
                <option value="rgba(6,182,212,0.8)">Cyan Glow</option>
                <option value="#000000">Hitam Pekat</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-[#1c1f28] bg-[#161821] flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            Teks subtitle akan sinkron dengan Canvas video dan TTS audio.
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
              className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/30 transition-all flex items-center gap-1.5"
            >
              💾 Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
