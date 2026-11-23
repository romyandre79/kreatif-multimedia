import { useState, useEffect } from "react";
import {
  CustomTransitionPreset,
  BUILT_IN_TRANSITIONS,
  getCustomTransitions,
  saveCustomTransition,
  deleteCustomTransition,
  evaluateTransitionTransform,
} from "../../services/customTransitions";

interface CustomTransitionModalProps {
  onClose: () => void;
  onSelectTransition?: (transitionType: string) => void;
}

export default function CustomTransitionModal({
  onClose,
  onSelectTransition,
}: CustomTransitionModalProps) {
  const [activeTab, setActiveTab] = useState<"all" | "builtin" | "custom">("all");
  const [customList, setCustomList] = useState<CustomTransitionPreset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form State
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formName, setFormName] = useState("Transisi Kustom Baru");
  const [formBaseEffect, setFormBaseEffect] = useState<CustomTransitionPreset["baseEffect"]>("slide");
  const [formDirection, setFormDirection] = useState<CustomTransitionPreset["direction"]>("left");
  const [formStartScale, setFormStartScale] = useState(0.2);
  const [formRotation, setFormRotation] = useState(180);
  const [formEasing, setFormEasing] = useState<CustomTransitionPreset["easing"]>("easeOut");
  const [formDuration, setFormDuration] = useState(0.6);

  // Live Animation Loop State
  const [animProgress, setAnimProgress] = useState(0);

  const reloadData = () => {
    const list = getCustomTransitions();
    setCustomList(list);
    if (!selectedId) {
      if (list.length > 0) {
        setSelectedId(list[0].id);
      } else if (BUILT_IN_TRANSITIONS.length > 0) {
        setSelectedId(BUILT_IN_TRANSITIONS[0].id);
        const def = BUILT_IN_TRANSITIONS[0];
        setFormName(def.name);
        setFormBaseEffect(def.baseEffect);
        setFormDirection(def.direction || "left");
        setFormStartScale(def.startScale !== undefined ? def.startScale : 0.2);
        setFormRotation(def.rotationDegrees !== undefined ? def.rotationDegrees : 180);
        setFormEasing(def.easing || "easeInOut");
        setFormDuration(def.defaultDuration || 0.5);
      }
    }
  };

  useEffect(() => {
    reloadData();
  }, []);

  useEffect(() => {
    let animFrame: number;
    let startTime = performance.now();

    const loop = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const cycle = formDuration + 1.2;
      const tInCycle = elapsed % cycle;
      const progress = Math.min(1, tInCycle / formDuration);
      setAnimProgress(progress);
      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [formDuration]);

  // Evaluasi preview aktif
  const currentPreviewPreset: CustomTransitionPreset = {
    id: "preview",
    name: formName,
    baseEffect: formBaseEffect,
    direction: formDirection,
    startScale: formStartScale,
    rotationDegrees: formRotation,
    easing: formEasing,
    defaultDuration: formDuration,
  };

  const evalResult = evaluateTransitionTransform(
    currentPreviewPreset,
    true,
    animProgress,
    280,
    160
  );

  const handleSave = () => {
    if (!formName.trim()) {
      alert("Nama transisi tidak boleh kosong!");
      return;
    }

    // Jika yang sedang dipilih adalah item bawaan (builtIn), simpan sebagai preset kustom baru
    const isBuiltInSelected = BUILT_IN_TRANSITIONS.some((b) => b.id === selectedId);
    const targetId = isCreatingNew || !selectedId || isBuiltInSelected ? `trans_${Date.now()}` : selectedId;

    const newPreset: CustomTransitionPreset = {
      id: targetId,
      name: formName.trim(),
      icon: formBaseEffect === "zoom" ? "🔍" : formBaseEffect === "slide" ? "➡️" : formBaseEffect === "rotate" ? "🌪️" : formBaseEffect === "morph" ? "🌀" : "✨",
      baseEffect: formBaseEffect,
      direction: formDirection,
      startScale: formStartScale,
      rotationDegrees: formRotation,
      easing: formEasing,
      defaultDuration: formDuration,
      description: `Efek ${formBaseEffect} kustom (${formDuration}s)`,
    };

    saveCustomTransition(newPreset);
    reloadData();
    setSelectedId(newPreset.id);
    setIsCreatingNew(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Hapus transisi kustom ini?")) {
      deleteCustomTransition(id);
      reloadData();
      if (selectedId === id) setSelectedId(null);
    }
  };

  const handleEditClick = (preset: CustomTransitionPreset) => {
    setSelectedId(preset.id);
    setIsCreatingNew(false);
    setFormName(preset.name);
    setFormBaseEffect(preset.baseEffect);
    setFormDirection(preset.direction || "left");
    setFormStartScale(preset.startScale !== undefined ? preset.startScale : 0.2);
    setFormRotation(preset.rotationDegrees !== undefined ? preset.rotationDegrees : 180);
    setFormEasing(preset.easing || "easeOut");
    setFormDuration(preset.defaultDuration || 0.6);
  };

  const handleDuplicateAsCustom = (preset: CustomTransitionPreset) => {
    setIsCreatingNew(true);
    setSelectedId(null);
    setFormName(`${preset.name} (Salinan)`);
    setFormBaseEffect(preset.baseEffect);
    setFormDirection(preset.direction || "left");
    setFormStartScale(preset.startScale !== undefined ? preset.startScale : 0.2);
    setFormRotation(preset.rotationDegrees !== undefined ? preset.rotationDegrees : 180);
    setFormEasing(preset.easing || "easeOut");
    setFormDuration(preset.defaultDuration || 0.6);
  };

  const handleAddNewClick = () => {
    setIsCreatingNew(true);
    setSelectedId(null);
    setFormName("Transisi Kustom Baru");
    setFormBaseEffect("zoom");
    setFormDirection("left");
    setFormStartScale(0.1);
    setFormRotation(360);
    setFormEasing("elastic");
    setFormDuration(0.7);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#151722] border border-gray-700/80 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-gray-200">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-900/90 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🎬</span>
            <div>
              <h2 className="text-sm font-bold text-white">Video Transition Manager (CRUD)</h2>
              <p className="text-[11px] text-gray-400">Buat, modifikasi, dan kelola transisi video kustom buatan Anda sendiri</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body: Dua Kolom (Daftar & Form Editor) */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Kolom Kiri (4 Col): List Transisi */}
          <div className="md:col-span-4 bg-[#11131a] p-3 rounded-xl border border-gray-800 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-300">Preset Transisi</span>
              <button
                type="button"
                onClick={handleAddNewClick}
                className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-bold transition-colors shadow flex items-center gap-1"
              >
                <span>+</span> Baru
              </button>
            </div>

            {/* Filter Tab: Semua, Bawaan, Kustom */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#181a24] rounded-lg border border-gray-800 mb-2.5 text-[10px]">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`py-1 rounded text-center font-medium transition ${
                  activeTab === "all" ? "bg-cyan-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Semua ({BUILT_IN_TRANSITIONS.length + customList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("builtin")}
                className={`py-1 rounded text-center font-medium transition ${
                  activeTab === "builtin" ? "bg-cyan-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Bawaan ({BUILT_IN_TRANSITIONS.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("custom")}
                className={`py-1 rounded text-center font-medium transition ${
                  activeTab === "custom" ? "bg-cyan-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Kustom ({customList.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
              {/* Grup Transisi Kustom */}
              {(activeTab === "all" || activeTab === "custom") && customList.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  <div className="text-[10px] uppercase font-bold text-cyan-400 px-1 flex items-center gap-1">
                    <span>⚡</span> Transisi Kustom ({customList.length})
                  </div>
                  {customList.map((item) => {
                    const isSelected = selectedId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleEditClick(item)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all group ${
                          isSelected
                            ? "bg-cyan-950/70 border-cyan-500/70 text-cyan-200 shadow-sm"
                            : "bg-[#181a24] border-gray-800 text-gray-300 hover:border-gray-700"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <span>{item.icon || "⚡"}</span>
                            <span className="truncate">{item.name}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {item.baseEffect} &bull; {item.defaultDuration}s
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          {onSelectTransition && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectTransition(item.id);
                                onClose();
                              }}
                              className="px-1.5 py-0.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-[10px] font-bold"
                              title="Terapkan ke klip ini"
                            >
                              Pilih
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            className="p-1 hover:text-red-400 text-gray-500 text-xs transition-colors"
                            title="Hapus transisi"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Grup Transisi Bawaan (Default) */}
              {(activeTab === "all" || activeTab === "builtin") && (
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-amber-400 px-1 flex items-center gap-1">
                    <span>✨</span> Transisi Default ({BUILT_IN_TRANSITIONS.length})
                  </div>
                  {BUILT_IN_TRANSITIONS.map((item) => {
                    const isSelected = selectedId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleEditClick(item)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all group ${
                          isSelected
                            ? "bg-amber-950/70 border-amber-500/70 text-amber-200 shadow-sm"
                            : "bg-[#181a24] border-gray-800 text-gray-300 hover:border-gray-700"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <span>{item.icon || "✨"}</span>
                            <span className="truncate">{item.name}</span>
                            <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/30">
                              Bawaan
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {item.baseEffect} &bull; {item.defaultDuration}s
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          {onSelectTransition && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectTransition(item.id);
                                onClose();
                              }}
                              className="px-1.5 py-0.5 bg-amber-700 hover:bg-amber-600 text-white rounded text-[10px] font-bold"
                              title="Terapkan ke klip ini"
                            >
                              Pilih
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateAsCustom(item);
                            }}
                            className="p-1 hover:text-amber-300 text-gray-500 text-xs transition-colors"
                            title="Salin dan jadikan kustom"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === "custom" && customList.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-xs">
                  Belum ada transisi kustom.<br />Klik <b>+ Baru</b> atau salin dari transisi bawaan!
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan (8 Col): Live Preview & Form Editor */}
          <div className="md:col-span-8 space-y-4">
            {/* Live Preview Screen */}
            <div className="h-44 bg-[#0a0c10] border border-gray-800 rounded-xl relative overflow-hidden flex items-center justify-center shadow-inner select-none">
              <div className="absolute top-2 left-3 text-[10px] font-mono text-gray-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>PREVIEW TRANSISI</span>
                <span className="text-cyan-400">({(animProgress * formDuration).toFixed(2)}s)</span>
              </div>

              {/* Latar Belakang Kotak Adegan Lama */}
              <div className="absolute inset-4 rounded-lg bg-indigo-950/40 border border-indigo-700/30 flex items-center justify-center text-xs text-indigo-400 font-mono">
                Adegan Sebelumnya (A)
              </div>

              {/* Kotak Adegan Baru yang Mengalami Transisi */}
              <div
                style={{
                  opacity: evalResult.opacity,
                  transform: `translate(${evalResult.offsetX}px, ${evalResult.offsetY}px) scale(${evalResult.scale}) rotate(${evalResult.rotation}deg)`,
                  transition: "none",
                }}
                className="absolute inset-4 rounded-lg bg-gradient-to-br from-emerald-600 to-cyan-700 border border-white/20 shadow-2xl flex flex-col items-center justify-center text-white"
              >
                <span className="text-2xl mb-1">{currentPreviewPreset.icon || "🎬"}</span>
                <span className="font-bold text-xs uppercase tracking-wider">Adegan Masuk (B)</span>
                <span className="text-[10px] opacity-80 mt-0.5">{formName}</span>
              </div>
            </div>

            {/* Form Pengaturan Parameter Transisi */}
            <div className="bg-[#12141c] p-4 rounded-xl border border-gray-800 space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="font-semibold text-gray-200">
                  {isCreatingNew
                    ? "✨ Buat Transisi Baru"
                    : BUILT_IN_TRANSITIONS.some((b) => b.id === selectedId)
                    ? `✨ Transisi Default: ${formName}`
                    : `✏️ Edit Transisi Kustom: ${formName}`}
                </span>
                {BUILT_IN_TRANSITIONS.some((b) => b.id === selectedId) && !isCreatingNew && (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Preset Bawaan (Dapat Dimodifikasi & Disimpan sebagai Kustom)
                  </span>
                )}
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Nama Transisi:</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Misal: Zoom Blast In..."
                  className="w-full px-2.5 py-1.5 bg-[#1b1e2a] border border-gray-700/70 rounded text-gray-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Efek Dasar (Base Effect):</label>
                  <select
                    value={formBaseEffect}
                    onChange={(e) => setFormBaseEffect(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-[#1b1e2a] border border-gray-700/70 rounded text-gray-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="slide">➡️ Slide (Meluncur)</option>
                    <option value="zoom">🔍 Zoom (Membesar / Mengecil)</option>
                    <option value="rotate">🌪️ Rotate & Spin (Berputar)</option>
                    <option value="morph">🌀 Morph (Warp & Blend)</option>
                    <option value="glitch">⚡ Glitch (Distorsi Digital)</option>
                    <option value="flip">🃏 Flip 3D (Membalik Kartu)</option>
                    <option value="wipe">🧹 Wipe (Usapan Tirai)</option>
                    <option value="fade">✨ Fade (Transparan Pudar)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Kurva Easing:</label>
                  <select
                    value={formEasing}
                    onChange={(e) => setFormEasing(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-[#1b1e2a] border border-gray-700/70 rounded text-gray-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="easeOut">Ease-Out (Halus di Akhir)</option>
                    <option value="easeInOut">Ease-InOut (Halus Awal-Akhir)</option>
                    <option value="bounce">Bounce (Memantul)</option>
                    <option value="elastic">Elastic (Kenyal)</option>
                    <option value="linear">Linear (Rata)</option>
                  </select>
                </div>
              </div>

              {/* Opsi Tambahan Tergantung Efek Dasar */}
              {formBaseEffect === "slide" && (
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Arah Luncur (Direction):</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: "left", label: "⬅️ Kiri" },
                      { id: "right", label: "➡️ Kanan" },
                      { id: "up", label: "⬆️ Atas" },
                      { id: "down", label: "⬇️ Bawah" },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setFormDirection(d.id as any)}
                        className={`py-1 rounded border text-center text-xs transition-colors ${
                          formDirection === d.id
                            ? "bg-cyan-600 border-cyan-500 text-white font-bold"
                            : "bg-[#1b1e2a] border-gray-700 text-gray-400"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formBaseEffect === "zoom" && (
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>Skala Mulai (Start Scale):</span>
                    <span className="font-mono text-cyan-400">{formStartScale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="3.0"
                    step="0.05"
                    value={formStartScale}
                    onChange={(e) => setFormStartScale(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              )}

              {formBaseEffect === "rotate" && (
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>Sudut Putaran (Degrees):</span>
                    <span className="font-mono text-cyan-400">{formRotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-720"
                    max="720"
                    step="45"
                    value={formRotation}
                    onChange={(e) => setFormRotation(parseInt(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              )}

              {/* Slider Durasi Default */}
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Durasi Transisi Default:</span>
                  <span className="font-mono text-cyan-400">{formDuration.toFixed(2)}s</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.05"
                  value={formDuration}
                  onChange={(e) => setFormDuration(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              {/* Save Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg text-xs transition-all flex items-center gap-1.5"
                >
                  <span>💾</span> Simpan Transisi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
