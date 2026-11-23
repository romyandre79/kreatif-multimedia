import { useState, useEffect } from "react";
import {
  CustomTextAnimationConfig,
  MotionType,
  LoopAnimationType,
  MOTION_TYPE_OPTIONS,
  LOOP_ANIMATION_OPTIONS,
  saveCustomTextAnimation,
  evaluateCustomTextAnimation,
} from "../../services/customTextAnimation";
import { COMMON_SYSTEM_FONTS, getOperatingSystemFonts } from "../../services/systemFonts";
import FontDropdownPicker from "./FontDropdownPicker";

interface CustomTextAnimationModalProps {
  initialConfig?: CustomTextAnimationConfig | null;
  onClose: () => void;
  onSaved: (savedConfig: CustomTextAnimationConfig) => void;
}

export default function CustomTextAnimationModal({
  initialConfig,
  onClose,
  onSaved,
}: CustomTextAnimationModalProps) {
  const [name, setName] = useState(initialConfig?.name || "Animasi Kustom Baru");
  const [motion, setMotion] = useState<MotionType>(initialConfig?.motion || "slide_up");
  const [easing, setEasing] = useState<CustomTextAnimationConfig["easing"]>(initialConfig?.easing || "easeOut");
  const [duration, setDuration] = useState<number>(initialConfig?.duration || 0.6);
  const [loop, setLoop] = useState<LoopAnimationType>(initialConfig?.loop || "none");
  const [loopSpeed, setLoopSpeed] = useState<number>(initialConfig?.loopSpeed || 1.0);

  // Styling Preview
  const [previewText, setPreviewText] = useState("Teks Animasi Keren");
  const [fontFamily, setFontFamily] = useState(initialConfig?.style?.fontFamily || "Arial, sans-serif");
  const [textColor, setTextColor] = useState(initialConfig?.style?.color || "#38bdf8");
  const [bgColor, setBgColor] = useState(initialConfig?.style?.backgroundColor || "rgba(0,0,0,0.85)");
  const [isBold, setIsBold] = useState(initialConfig?.style?.isBold !== undefined ? initialConfig.style.isBold : true);
  const [isItalic, setIsItalic] = useState(Boolean(initialConfig?.style?.isItalic));
  const [glowColor, setGlowColor] = useState(initialConfig?.style?.shadowColor || "#0284c7");
  const [glowBlur, setGlowBlur] = useState(initialConfig?.style?.shadowBlur || 12);

  // Daftar Font Sistem Operasi
  const [fontOptions, setFontOptions] = useState(COMMON_SYSTEM_FONTS);

  useEffect(() => {
    getOperatingSystemFonts()
      .then((fonts) => {
        if (fonts && fonts.length > 0) setFontOptions(fonts);
      })
      .catch(() => {});
  }, []);

  // Live Animation Loop State di Modal Preview
  const [animTime, setAnimTime] = useState(0);

  useEffect(() => {
    let animFrame: number;
    let startTime = performance.now();

    const loopAnim = (now: number) => {
      const elapsedSec = (now - startTime) / 1000;
      // Siklus loop: durasi masuk + 2.5s display/loop
      const cycle = duration + 2.5;
      const currentCycleTime = elapsedSec % cycle;
      setAnimTime(currentCycleTime);
      animFrame = requestAnimationFrame(loopAnim);
    };

    animFrame = requestAnimationFrame(loopAnim);
    return () => cancelAnimationFrame(animFrame);
  }, [duration]);

  // Evaluasi transformasi preview saat ini
  const evalResult = evaluateCustomTextAnimation(
    {
      id: "preview",
      name,
      category: "custom",
      motion,
      easing,
      duration,
      loop,
      loopSpeed,
    },
    animTime,
    360,
    28,
    previewText.length,
    animTime
  );

  const selectedMotionInfo = MOTION_TYPE_OPTIONS.find((m) => m.id === motion);
  const selectedLoopInfo = LOOP_ANIMATION_OPTIONS.find((l) => l.id === loop);

  const handleSave = () => {
    if (!name.trim()) {
      alert("Nama animasi tidak boleh kosong!");
      return;
    }

    const newConfig: CustomTextAnimationConfig = {
      id: initialConfig?.id || `custom_anim_${Date.now()}`,
      name: name.trim(),
      category: "custom",
      previewIcon: selectedMotionInfo?.icon || "🪄",
      description: `Motion: ${selectedMotionInfo?.label || motion} + Loop: ${selectedLoopInfo?.label || loop}`,
      motion,
      easing,
      duration,
      loop,
      loopSpeed,
      style: {
        fontFamily,
        fontSize: 32,
        color: textColor,
        backgroundColor: bgColor,
        shadowColor: glowColor,
        shadowBlur: glowBlur,
        isBold,
        isItalic,
      },
    };

    saveCustomTextAnimation(newConfig);
    onSaved(newConfig);
    onClose();
  };

  const visibleText =
    motion === "typewriter"
      ? previewText.substring(0, evalResult.visibleCharsCount || previewText.length)
      : previewText;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#151722] border border-gray-700/80 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-gray-200">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-900/90 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪄</span>
            <div>
              <h2 className="text-sm font-bold text-white">Custom Text Animation Builder</h2>
              <p className="text-[11px] text-gray-400">Pilih dari 20 Motion Type Masuk & 20 Loop Animation Kontinu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Live Preview Screen */}
          <div className="h-44 bg-[#0a0c10] border border-gray-800 rounded-xl flex flex-col items-center justify-center relative overflow-hidden shadow-inner select-none">
            <div className="absolute top-2 left-3 text-[10px] font-mono text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE PREVIEW</span>
              <span className="text-cyan-400">({animTime.toFixed(2)}s)</span>
            </div>

            {/* Kotak Teks Teranimasi */}
            <div
              style={{
                opacity: evalResult.opacity,
                transform: `translate(${evalResult.offsetX}px, ${evalResult.offsetY}px) scale(${evalResult.scaleX}, ${evalResult.scaleY}) rotate(${evalResult.rotation}deg)`,
                backgroundColor: bgColor,
                color: textColor,
                fontFamily: fontFamily,
                fontWeight: isBold ? "bold" : "normal",
                fontStyle: isItalic ? "italic" : "normal",
                boxShadow: (glowBlur + evalResult.shadowBlurBonus) > 0 ? `0 0 ${glowBlur + evalResult.shadowBlurBonus}px ${glowColor}` : "none",
                transition: "none",
              }}
              className="px-5 py-2 rounded-lg text-xl font-sans tracking-wide shadow-lg border border-white/10"
            >
              {visibleText}
            </div>

            <div className="absolute bottom-2 text-[10px] text-gray-400 flex items-center gap-2 font-mono">
              <span>Masuk: <b className="text-cyan-300">{selectedMotionInfo?.icon} {selectedMotionInfo?.label}</b></span>
              <span>&bull;</span>
              <span>Loop: <b className="text-purple-300">{selectedLoopInfo?.icon} {selectedLoopInfo?.label}</b></span>
            </div>
          </div>

          {/* Form Pengaturan 20 Motion & 20 Loop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Kolom Kiri: 20 Motion In & Easing */}
            <div className="bg-[#12141c] p-3.5 rounded-lg border border-gray-800 space-y-3">
              <div className="font-semibold text-gray-200 border-b border-gray-800 pb-1.5 flex items-center justify-between">
                <span>🏃‍♂️ 1. Motion Type Masuk (20 Pilihan)</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-cyan-950 text-cyan-300 rounded font-mono">
                  20 Jenis
                </span>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Nama Animasi Kustom:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Beri nama animasi..."
                  className="w-full px-2.5 py-1.5 bg-[#1b1e2a] border border-gray-700/70 rounded text-gray-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Pilih Motion Type Masuk:</label>
                <select
                  value={motion}
                  onChange={(e) => setMotion(e.target.value as MotionType)}
                  className="w-full px-2.5 py-1.5 bg-[#1b1e2a] border border-gray-700/70 rounded text-gray-200 focus:outline-none focus:border-cyan-500 font-sans"
                >
                  {MOTION_TYPE_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.icon} {m.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-1 italic">
                  {selectedMotionInfo?.desc}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-800">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Kurva Easing:</label>
                  <select
                    value={easing}
                    onChange={(e) => setEasing(e.target.value as any)}
                    className="w-full px-2 py-1 bg-[#1b1e2a] border border-gray-700/70 rounded text-gray-200 text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="easeOut">Ease-Out (Halus di Akhir)</option>
                    <option value="easeInOut">Ease-InOut (Halus Awal-Akhir)</option>
                    <option value="bounce">Bounce (Memantul)</option>
                    <option value="elastic">Elastic (Kenyal)</option>
                    <option value="linear">Linear (Rata)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Durasi Masuk: {duration}s</label>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.05"
                    value={duration}
                    onChange={(e) => setDuration(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 mt-2"
                  />
                </div>
              </div>

              {/* 20 LOOP ANIMATION SELECTION */}
              <div className="pt-2 border-t border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-purple-300">
                    🔄 2. Loop Animation Selama Tayang (20 Pilihan):
                  </label>
                  <span className="text-[10px] px-1.5 py-0.2 bg-purple-950 text-purple-300 rounded font-mono">
                    20 Jenis
                  </span>
                </div>
                <select
                  value={loop}
                  onChange={(e) => setLoop(e.target.value as LoopAnimationType)}
                  className="w-full px-2.5 py-1.5 bg-[#1b1e2a] border border-gray-700/70 rounded text-gray-200 focus:outline-none focus:border-purple-500"
                >
                  {LOOP_ANIMATION_OPTIONS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.icon} {l.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 italic">
                  {selectedLoopInfo?.desc}
                </p>

                {loop !== "none" && (
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>Kecepatan Loop:</span>
                      <span className="font-mono text-purple-400">{loopSpeed}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={loopSpeed}
                      onChange={(e) => setLoopSpeed(parseFloat(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Kolom Kanan: Tipografi & Gaya Tampilan */}
            <div className="bg-[#12141c] p-3.5 rounded-lg border border-gray-800 space-y-3">
              <div className="font-semibold text-gray-200 border-b border-gray-800 pb-1.5 flex items-center justify-between">
                <span>🎨 3. Tipografi & Gaya Visual</span>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Contoh Teks Preview:</label>
                <input
                  type="text"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#1b1e2a] border border-gray-700/70 rounded text-gray-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Jenis Huruf (Font Family):</label>
                <FontDropdownPicker
                  value={fontFamily}
                  options={fontOptions}
                  onChange={(val) => setFontFamily(val)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Warna Huruf:</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-7 h-7 bg-transparent rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="flex-1 px-1.5 py-1 bg-[#1b1e2a] border border-gray-700/70 rounded text-gray-200 font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Warna Latar Kotak:</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={bgColor.startsWith("#") ? bgColor : "#000000"}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-7 h-7 bg-transparent rounded cursor-pointer"
                    />
                    <select
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1 px-1.5 py-1 bg-[#1b1e2a] border border-gray-700/70 rounded text-gray-200 text-[10px]"
                    >
                      <option value="rgba(0,0,0,0.85)">Hitam 85%</option>
                      <option value="rgba(15,23,42,0.9)">Biru Gelap</option>
                      <option value="#000000">Hitam Pekat</option>
                      <option value="rgba(0,0,0,0)">Transparan</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bold / Italic Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsBold(!isBold)}
                  className={`px-3 py-1 rounded border text-xs font-bold transition-colors ${
                    isBold ? "bg-cyan-600 border-cyan-500 text-white" : "bg-[#1b1e2a] border-gray-700 text-gray-400"
                  }`}
                >
                  B (Bold)
                </button>
                <button
                  type="button"
                  onClick={() => setIsItalic(!isItalic)}
                  className={`px-3 py-1 rounded border text-xs italic font-serif transition-colors ${
                    isItalic ? "bg-cyan-600 border-cyan-500 text-white" : "bg-[#1b1e2a] border-gray-700 text-gray-400"
                  }`}
                >
                  I (Italic)
                </button>
              </div>

              {/* Glow / Shadow */}
              <div className="pt-2 border-t border-gray-800 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-gray-400">Efek Kilau Glow / Bayangan:</label>
                  <input
                    type="color"
                    value={glowColor}
                    onChange={(e) => setGlowColor(e.target.value)}
                    className="w-5 h-5 bg-transparent rounded cursor-pointer"
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={glowBlur}
                  onChange={(e) => setGlowBlur(parseInt(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-gray-900/90 border-t border-gray-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg transition-all flex items-center gap-1.5"
          >
            <span>💾</span> Simpan Animasi Kustom
          </button>
        </div>
      </div>
    </div>
  );
}
