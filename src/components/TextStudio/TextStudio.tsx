import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import {
  TEXT_ANIMATION_PRESETS,
  TextAnimationPreset,
} from "../../services/textAnimationPresets";
import {
  COMMON_SYSTEM_FONTS,
  getOperatingSystemFonts,
} from "../../services/systemFonts";

export default function TextStudio() {
  const tracks = useProjectStore((s) => s.timeline.tracks);
  const currentTime = useProjectStore((s) => s.currentTime);
  const addClipToTrack = useProjectStore((s) => s.addClipToTrack);
  const setSelectedClipId = useProjectStore((s) => s.setSelectedClipId);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customText, setCustomText] = useState("");

  // State Tipografi Teks: Jenis Huruf, Bold, Italic, Underline
  const [fontFamily, setFontFamily] = useState<string>("Arial, sans-serif");
  const [isBold, setIsBold] = useState<boolean>(true);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);

  // Daftar Font Sistem Operasi
  const [osFontList, setOsFontList] = useState<{ label: string; value: string }[]>(COMMON_SYSTEM_FONTS);
  const [hasScannedOsFonts, setHasScannedOsFonts] = useState<boolean>(false);

  // Ambil font OS lokal
  const handleScanLocalFonts = async () => {
    try {
      const fonts = await getOperatingSystemFonts();
      setOsFontList(fonts);
      setHasScannedOsFonts(true);
    } catch (err) {
      console.warn("Gagal scan font OS:", err);
    }
  };

  // Filter kategori
  const categories = [
    { id: "all", label: "✨ Semua (55)" },
    { id: "fade", label: "🌫️ Fade & Dissolve" },
    { id: "slide", label: "⬆️ Slide & Move" },
    { id: "zoom", label: "🔍 Zoom & Pop" },
    { id: "bounce", label: "🏀 Bounce & Spring" },
    { id: "rotate", label: "🌪️ Rotate & Flip" },
    { id: "glow", label: "🌟 Glow & Neon" },
    { id: "cinema", label: "🎬 Cinematic" },
    { id: "creative", label: "📱 Viral & Media" },
  ];

  const filteredPresets = TEXT_ANIMATION_PRESETS.filter((p) => {
    const matchCategory = activeCategory === "all" || p.category === activeCategory;
    const matchQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchQuery;
  });

  // Handler kirim preset teks ke track Subtitle di Timeline
  const handleInsertTextToTimeline = (preset: TextAnimationPreset) => {
    // Cari track subtitle yang ada, atau buat baru
    let subTrack = tracks.find((t) => t.type === "subtitle");
    if (!subTrack) {
      useProjectStore.getState().addTrack("subtitle");
      subTrack = useProjectStore.getState().timeline.tracks.find((t) => t.type === "subtitle");
    }
    if (!subTrack) return;

    const textToInsert = customText.trim() || preset.defaultText;
    const clipDuration = Math.max(3.0, (preset.duration || 0.6) * 3);

    addClipToTrack(subTrack.id, {
      text: textToInsert,
      start: currentTime,
      end: currentTime + clipDuration,
      style: {
        fontFamily: fontFamily || preset.style.fontFamily || "sans-serif",
        fontSize: preset.style.fontSize || 32,
        color: preset.style.color || "#ffffff",
        backgroundColor: preset.style.backgroundColor || "rgba(0,0,0,0.85)",
        shadowColor: preset.style.shadowColor,
        shadowBlur: preset.style.shadowBlur,
        isBold,
        isItalic,
        isUnderline,
      },
      text_animation: {
        preset: preset.id,
        duration: preset.duration || 0.6,
      },
    });

    const updatedTracks = useProjectStore.getState().timeline.tracks;
    const targetTrack = updatedTracks.find((t) => t.id === subTrack!.id);
    const lastClip = targetTrack?.clips[targetTrack.clips.length - 1];
    if (lastClip) {
      setSelectedClipId(lastClip.id);
    }

    alert(`✓ Teks animasi "${preset.name}" berhasil dimasukkan ke Timeline pada detik ${currentTime.toFixed(1)}s! Anda dapat mengedit teksnya kapan saja.`);
  };

  return (
    <div className="flex flex-col h-full text-xs text-gray-200">
      {/* Header & Quick Text Editor Input */}
      <div className="space-y-2 mb-2.5 shrink-0 select-none">

        {/* Search Input */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="Cari dari 50+ preset animasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-2.5 py-1.5 bg-[#0e1014] border border-[#232733] rounded-lg text-gray-200 text-xs focus:border-cyan-500 focus:outline-none"
          />
          <span className="px-2 py-1.5 bg-[#181a22] border border-[#252834] rounded-lg text-[10px] font-mono text-cyan-400">
            {filteredPresets.length} Preset
          </span>
        </div>

        {/* Categories Horizontal Scroller */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2 py-1 rounded font-medium shrink-0 transition-colors ${activeCategory === cat.id
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "bg-[#14161d] text-gray-400 hover:text-gray-200 border border-[#21242e]"
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preset List Container */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {filteredPresets.length === 0 ? (
          <div className="p-6 text-center text-gray-500 rounded-xl bg-[#0f1116] border border-[#1d202b]">
            <p className="text-2xl mb-1">🔍</p>
            <p className="text-xs font-semibold text-gray-300">Preset tidak ditemukan</p>
            <p className="text-[10px] mt-1 text-gray-500">
              Coba cari dengan kata kunci lain atau pilih Semua Kategori.
            </p>
          </div>
        ) : (
          filteredPresets.map((preset) => {
            const previewTextToRender = customText.trim() || preset.defaultText;
            return (
              <div
                key={preset.id}
                className="p-2.5 rounded-xl bg-[#13151c] border border-[#20232e] hover:border-cyan-500/40 transition-all flex flex-col gap-2 group"
              >
                {/* Visual Preview Box */}
                <div
                  className="p-2.5 rounded-lg text-center flex items-center justify-center transition-all overflow-hidden border border-[#232733]"
                  style={{
                    backgroundColor: preset.style.backgroundColor || "#000000",
                    boxShadow: preset.style.shadowColor
                      ? `0 0 14px ${preset.style.shadowColor}`
                      : undefined,
                  }}
                >
                  <span
                    className="truncate max-w-[240px]"
                    style={{
                      fontFamily: fontFamily || preset.style.fontFamily || "sans-serif",
                      fontWeight: isBold ? "bold" : "normal",
                      fontStyle: isItalic ? "italic" : "normal",
                      textDecoration: isUnderline ? "underline" : "none",
                      color: preset.style.color || "#ffffff",
                      fontSize: "13px",
                    }}
                  >
                    {previewTextToRender}
                  </span>
                </div>

                {/* Preset Info */}
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{preset.previewIcon}</span>
                      <h4 className="font-semibold text-gray-200 text-xs truncate">
                        {preset.name}
                      </h4>
                    </div>
                    <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                      {preset.description}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                    {preset.duration}s
                  </span>
                </div>

                {/* Actions: Insert into Timeline */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-[#1b1e28]">
                  <button
                    onClick={() => handleInsertTextToTimeline(preset)}
                    className="w-full py-1.5 px-3 rounded-lg bg-cyan-600/90 hover:bg-cyan-500 text-white text-[11px] font-semibold transition-all shadow-sm shadow-cyan-950/40 flex items-center justify-center gap-1.5"
                  >
                    <span>➕</span>
                    <span>Insert ke Timeline</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
