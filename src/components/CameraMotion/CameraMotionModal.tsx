import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import {
  CAMERA_PRESETS,
  CameraPresetType,
  CameraMotionConfig,
  DEFAULT_CAMERA_MOTION,
} from "../../services/cameraMotion";

interface CameraMotionModalProps {
  onClose: () => void;
}

export default function CameraMotionModal({ onClose }: CameraMotionModalProps) {
  const meta = useProjectStore((s) => s.meta);
  const updateCameraMotion = useProjectStore((s) => s.updateCameraMotion);
  const resetCameraMotion = useProjectStore((s) => s.resetCameraMotion);

  const cameraConfig: CameraMotionConfig = meta.camera || { ...DEFAULT_CAMERA_MOTION };

  const [activePreset, setActivePreset] = useState<CameraPresetType>(cameraConfig.preset);
  const [enabled, setEnabled] = useState(cameraConfig.enabled);
  const [panX, setPanX] = useState(cameraConfig.panX);
  const [panY, setPanY] = useState(cameraConfig.panY);
  const [zoom, setZoom] = useState(cameraConfig.zoom);
  const [rotation, setRotation] = useState(cameraConfig.rotation);
  const [speed, setSpeed] = useState(cameraConfig.speed);
  const [shakeIntensity, setShakeIntensity] = useState(cameraConfig.shakeIntensity);

  const handleApply = (updates: Partial<CameraMotionConfig>) => {
    updateCameraMotion(updates);
  };

  const handleSelectPreset = (preset: CameraPresetType) => {
    setActivePreset(preset);
    let defaultZoom = zoom;
    let defaultShake = shakeIntensity;

    if (preset === "zoom_in_slow" || preset === "zoom_out_slow") {
      defaultZoom = 1.0;
    } else if (preset === "shake_handheld") {
      defaultShake = 3;
      defaultZoom = Math.max(zoom, 1.1);
    } else if (preset === "action_quake") {
      defaultShake = 7;
      defaultZoom = Math.max(zoom, 1.15);
    } else if (preset.startsWith("pan_") || preset.startsWith("tilt_")) {
      defaultZoom = Math.max(zoom, 1.15);
    }

    setZoom(defaultZoom);
    setShakeIntensity(defaultShake);

    handleApply({
      enabled: true,
      preset,
      zoom: defaultZoom,
      shakeIntensity: defaultShake,
    });
    setEnabled(true);
  };

  const handleReset = () => {
    resetCameraMotion();
    setEnabled(false);
    setActivePreset("static");
    setPanX(0);
    setPanY(0);
    setZoom(1.0);
    setRotation(0);
    setSpeed(1.0);
    setShakeIntensity(0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#12141c] border border-cyan-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-[#212533] flex items-center justify-between bg-[#161924]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 text-base">
              📹
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Cinematic Camera Motion Studio
                <span className="text-[10px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full font-mono">
                  Smart Viewport
                </span>
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Arahkan pandangan kamera, geser horizontal/vertikal (Pan & Tilt), Zoom otomatis, dan efek getar sinematik.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center text-lg transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Toggle Enable Master */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#191d2a] border border-[#262c3e]">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{enabled ? "🟢" : "⚪"}</span>
              <div>
                <p className="text-xs font-semibold text-gray-200">Aktifkan Gerakan Kamera (Camera Motion)</p>
                <p className="text-[10px] text-gray-400">
                  Saat aktif, video & gambar akan bergerak mengikuti kamera secara real-time di preview dan hasil ekspor.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !enabled;
                setEnabled(next);
                handleApply({ enabled: next });
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                enabled
                  ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {enabled ? "Aktif" : "Nonaktif"}
            </button>
          </div>

          {/* Preset Grid */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider text-[11px]">
                🎬 Pilihan Preset Gerakan Kamera Otomatis
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">11 Preset Sinematik</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {CAMERA_PRESETS.map((preset) => {
                const isSelected = enabled && activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? "bg-cyan-950/60 border-cyan-400 text-white shadow-lg shadow-cyan-500/15 ring-1 ring-cyan-400/50"
                        : "bg-[#181b26] border-[#252938] text-gray-300 hover:border-gray-600 hover:bg-[#1d212f]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xl">{preset.icon}</span>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/30 text-cyan-300 font-bold rounded">
                            AKTIF
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold truncate">{preset.name}</p>
                      <p className="text-[10px] text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kontrol Parameter Manual Kamera */}
          <div className="p-4 rounded-xl bg-[#171a25] border border-[#242939] space-y-4">
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider text-[11px] block">
              🎛️ Penyesuaian Offset & Kecepatan Kamera
            </span>

            {/* Slider Pan X & Pan Y */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Pan X (Geser Horizontal):</span>
                  <span className="text-cyan-400 font-mono font-bold">{panX}%</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  step="1"
                  value={panX}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPanX(val);
                    handleApply({ panX: val, enabled: true });
                    setEnabled(true);
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Pan Y (Geser Vertikal):</span>
                  <span className="text-cyan-400 font-mono font-bold">{panY}%</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  step="1"
                  value={panY}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPanY(val);
                    handleApply({ panY: val, enabled: true });
                    setEnabled(true);
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Slider Zoom & Speed */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#232737]">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Camera Zoom:</span>
                  <span className="text-cyan-400 font-mono font-bold">{zoom.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setZoom(val);
                    handleApply({ zoom: val, enabled: true });
                    setEnabled(true);
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Kecepatan Gerakan (Speed):</span>
                  <span className="text-cyan-400 font-mono font-bold">{speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSpeed(val);
                    handleApply({ speed: val, enabled: true });
                    setEnabled(true);
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Slider Shake Intensity & Roll Rotation */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#232737]">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Intensitas Getar (Camera Shake):</span>
                  <span className="text-cyan-400 font-mono font-bold">{shakeIntensity}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={shakeIntensity}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setShakeIntensity(val);
                    handleApply({ shakeIntensity: val, enabled: true });
                    setEnabled(true);
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Rotasi Roll Kamera:</span>
                  <span className="text-cyan-400 font-mono font-bold">{rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="1"
                  value={rotation}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setRotation(val);
                    handleApply({ rotation: val, enabled: true });
                    setEnabled(true);
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-[#212533] bg-[#161924] flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition"
          >
            Reset Kamera
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20 transition"
            >
              Selesai & Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
