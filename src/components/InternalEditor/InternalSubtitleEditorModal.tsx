import { useState, useEffect } from "react";
import { useProjectStore, Clip } from "../../stores/projectStore";
import { TEXT_ANIMATION_PRESETS } from "../../services/textAnimationPresets";
import {
  COMMON_SYSTEM_FONTS,
  getOperatingSystemFonts,
} from "../../services/systemFonts";

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
  const [fontFamily, setFontFamily] = useState<string>(
    (clip.style?.fontFamily as string) || "sans-serif"
  );
  const [isBold, setIsBold] = useState<boolean>(
    clip.style?.isBold !== undefined ? Boolean(clip.style.isBold) : true
  );
  const [isItalic, setIsItalic] = useState<boolean>(Boolean(clip.style?.isItalic));
  const [isUnderline, setIsUnderline] = useState<boolean>(Boolean(clip.style?.isUnderline));

  const [animPreset, setAnimPreset] = useState<string>(
    clip.text_animation?.preset || "none"
  );
  const [animDuration, setAnimDuration] = useState<number>(
    clip.text_animation?.duration || 0.5
  );

  // State loop live animasi di dalam modal
  const [animProgress, setAnimProgress] = useState<number>(1);
  const [replayKey, setReplayKey] = useState<number>(0);

  // Loop pratinjau animasi setiap durasi animasi selesai
  useEffect(() => {
    if (animPreset === "none") {
      setAnimProgress(1);
      return;
    }

    let start = performance.now();
    let frameId: number;
    const durMs = Math.max(200, (animDuration || 0.5) * 1000);

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durMs);
      setAnimProgress(progress);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        // Jeda 1 detik saat animasi selesai lalu putar ulang (looping)
        const timeout = setTimeout(() => {
          start = performance.now();
          frameId = requestAnimationFrame(step);
        }, 1000);
        return () => clearTimeout(timeout);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [animPreset, animDuration, replayKey]);

  // Kalkulasi gaya transformasi & opacity animasi untuk preview live
  const calculateAnimationStyle = () => {
    let opacity = 1;
    let transform = "";
    let displayText = text || "Contoh Teks Subtitle...";

    if (animPreset === "fade" || animPreset === "fade_blur" || animPreset === "fade_slow" || animPreset === "fade_black_box" || animPreset === "fade_gold" || animPreset === "fade_minimalist") {
      opacity = animProgress;
    } else if (animPreset === "fade_flash") {
      opacity = animProgress < 0.3 ? 0.3 + animProgress * 2.3 : 1;
    } else if (animPreset === "pop" || animPreset === "elastic_pop") {
      opacity = Math.min(1, animProgress * 1.5);
      const scale = animProgress < 0.7 ? 0.3 + animProgress * 1.2 : 1.14 - (animProgress - 0.7) * 0.46;
      transform = `scale(${scale})`;
    } else if (animPreset === "slide_up" || animPreset === "slide_elastic_up" || animPreset === "slide_overshoot") {
      opacity = animProgress;
      const offsetY = (1 - animProgress) * (fontSize * 1.2);
      transform = `translateY(${offsetY}px)`;
    } else if (animPreset === "slide_down") {
      opacity = animProgress;
      const offsetY = -(1 - animProgress) * (fontSize * 1.2);
      transform = `translateY(${offsetY}px)`;
    } else if (animPreset === "slide_left") {
      opacity = animProgress;
      const offsetX = (1 - animProgress) * 60;
      transform = `translateX(${offsetX}px)`;
    } else if (animPreset === "slide_right") {
      opacity = animProgress;
      const offsetX = -(1 - animProgress) * 60;
      transform = `translateX(${-offsetX}px)`;
    } else if (animPreset === "bounce" || animPreset === "heavy_drop_bounce" || animPreset === "soft_spring" || animPreset === "cartoon_boing" || animPreset === "rebound_slam" || animPreset === "quiver_bounce" || animPreset === "triple_bounce") {
      opacity = Math.min(1, animProgress * 2);
      const scale = animProgress >= 1 ? 1 : 0.4 + Math.sin(animProgress * Math.PI) * 0.7;
      transform = `scale(${scale})`;
    } else if (animPreset === "zoom_in" || animPreset === "zoom_blur_blast" || animPreset === "snap_zoom") {
      opacity = animProgress;
      const scale = 0.2 + animProgress * 0.8;
      transform = `scale(${scale})`;
    } else if (animPreset === "zoom_out") {
      opacity = animProgress;
      const scale = 1.6 - animProgress * 0.6;
      transform = `scale(${scale})`;
    } else if (animPreset === "rotate_spin_in" || animPreset === "barrel_roll") {
      opacity = animProgress;
      const deg = (1 - animProgress) * 360;
      transform = `scale(${0.3 + animProgress * 0.7}) rotate(${deg}deg)`;
    } else if (animPreset === "flip_x" || animPreset === "skew_twist") {
      opacity = animProgress;
      const scale = Math.sin(animProgress * Math.PI * 0.5);
      transform = `scaleX(${scale})`;
    } else if (animPreset === "typewriter") {
      const full = text || "Contoh Teks Subtitle...";
      const visibleCount = Math.floor(animProgress * full.length);
      displayText = full.substring(0, visibleCount);
    }

    return { opacity, transform, displayText };
  };

  const animState = calculateAnimationStyle();

  const [fontOptions, setFontOptions] = useState<{ label: string; value: string }[]>(COMMON_SYSTEM_FONTS);
  const [hasScannedFonts, setHasScannedFonts] = useState(false);

  const handleScanFonts = async () => {
    const list = await getOperatingSystemFonts();
    setFontOptions(list);
    setHasScannedFonts(true);
  };

  const handleApplyChanges = () => {
    updateClipProperties(clip.id, {
      text,
      text_animation: {
        preset: animPreset as any,
        duration: animDuration,
      },
      style: {
        ...clip.style,
        fontSize,
        fontFamily,
        color: fontColor,
        backgroundColor: bgColor,
        isBold,
        isItalic,
        isUnderline,
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
          <div className="rounded-xl bg-[#0b0c10] border border-[#1f222d] p-6 flex flex-col items-center justify-center min-h-[140px] text-center relative overflow-hidden">
            <div
              style={{
                fontFamily: fontFamily || "sans-serif",
                fontSize: `${fontSize}px`,
                fontWeight: isBold ? "bold" : "normal",
                fontStyle: isItalic ? "italic" : "normal",
                textDecoration: isUnderline ? "underline" : "none",
                color: fontColor,
                backgroundColor: bgColor,
                padding: "6px 14px",
                borderRadius: "6px",
                lineHeight: "1.3",
                maxWidth: "90%",
                textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                opacity: animState.opacity,
                transform: animState.transform || undefined,
                transition: "opacity 0.05s linear, transform 0.05s ease-out",
              }}
            >
              {animState.displayText || "Contoh Teks Subtitle..."}
            </div>

            <div className="absolute bottom-2 right-3 flex items-center gap-2 text-[10px] font-mono">
              {animPreset !== "none" && (
                <button
                  type="button"
                  onClick={() => setReplayKey((k) => k + 1)}
                  className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 flex items-center gap-1 transition-colors"
                  title="Putar ulang animasi teks"
                >
                  <span>🔄</span>
                  <span>Replay Animasi</span>
                </button>
              )}
              <span className="text-gray-500">Live Preview</span>
            </div>
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
          <div className="p-3 rounded-xl bg-[#151720] border border-[#212532] space-y-3">
            {/* Font Family & Format Buttons (B, I, U) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-gray-400 block">Jenis Huruf Sistem Operasi & Format Teks</label>
                {"queryLocalFonts" in window && !hasScannedFonts && (
                  <button
                    type="button"
                    onClick={handleScanFonts}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-900/50"
                  >
                    🔍 Deteksi Font OS
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-[#0f1116] border border-[#272b38] rounded-lg text-gray-200 text-xs focus:border-amber-500 focus:outline-none"
                >
                  {fontOptions.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsBold(!isBold)}
                    className={`w-7 h-7 rounded font-bold text-xs flex items-center justify-center transition-all ${isBold
                      ? "bg-amber-500 text-black shadow-sm font-extrabold"
                      : "bg-[#101216] text-gray-400 hover:text-white border border-[#272b38]"
                      }`}
                    title="Tebal (Bold)"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsItalic(!isItalic)}
                    className={`w-7 h-7 rounded italic text-xs flex items-center justify-center transition-all ${isItalic
                      ? "bg-amber-500 text-black shadow-sm font-bold"
                      : "bg-[#101216] text-gray-400 hover:text-white border border-[#272b38]"
                      }`}
                    title="Miring (Italic)"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUnderline(!isUnderline)}
                    className={`w-7 h-7 rounded underline text-xs flex items-center justify-center transition-all ${isUnderline
                      ? "bg-amber-500 text-black shadow-sm font-bold"
                      : "bg-[#101216] text-gray-400 hover:text-white border border-[#272b38]"
                      }`}
                    title="Garis Bawah (Underline)"
                  >
                    U
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#1e222e]">
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

          {/* Preset Animasi Teks */}
          <div className="p-3.5 rounded-xl bg-[#151720] border border-[#212532] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                <span>✨</span>
                <span>Preset Animasi Teks Masuk</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Text Effect
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Pilih Preset Animasi</label>
                <select
                  value={animPreset}
                  onChange={(e) => setAnimPreset(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0f1116] border border-[#272b38] rounded-lg text-gray-200 text-xs focus:border-amber-500 focus:outline-none"
                >
                  <option value="none">Tanpa Animasi (Normal)</option>
                  {TEXT_ANIMATION_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.previewIcon} {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Kecepatan Animasi</span>
                  <span className="font-mono text-amber-400">{animDuration.toFixed(2)}s</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.05"
                  value={animDuration}
                  onChange={(e) => setAnimDuration(parseFloat(e.target.value))}
                  disabled={animPreset === "none"}
                  className="w-full h-1.5 bg-[#232734] rounded appearance-none cursor-pointer accent-amber-500 disabled:opacity-30"
                />
              </div>
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
