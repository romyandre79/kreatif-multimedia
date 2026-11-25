import { useState } from "react";
import { useProjectStore, Clip } from "../../stores/projectStore";
import { TEXT_ANIMATION_PRESETS } from "../../services/textAnimationPresets";
import { interpolateKeyframes } from "../../services/keyframe";
import { getCustomTextAnimations } from "../../services/customTextAnimation";
import { getCustomTransitions } from "../../services/customTransitions";
import {
  IMAGE_ANIMATION_IN_PRESETS,
  IMAGE_ANIMATION_OUT_PRESETS,
  IMAGE_ANIMATION_LOOP_PRESETS,
  ImageAnimationConfig,
} from "../../services/imageAnimationPresets";
import { useTranslation } from "../../stores/i18nStore";
import CustomTransitionModal from "./CustomTransitionModal";

export default function Inspector() {
  const { t } = useTranslation();
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const selectedClipId = useProjectStore((s) => s.selectedClipId);
  const currentTime = useProjectStore((s) => s.currentTime);
  const setCurrentTime = useProjectStore((s) => s.setCurrentTime);
  const tracks = useProjectStore((s) => s.timeline.tracks);
  const updateClipProperties = useProjectStore((s) => s.updateClipProperties);
  const changeClipSpeedWithRipple = useProjectStore((s) => s.changeClipSpeedWithRipple);
  const addOrUpdateKeyframe = useProjectStore((s) => s.addOrUpdateKeyframe);
  const removeKeyframe = useProjectStore((s) => s.removeKeyframe);
  const clearAllKeyframes = useProjectStore((s) => s.clearAllKeyframes);
  const resetClipTransform = useProjectStore((s) => s.resetClipTransform);

  let selectedClip: Clip | null = null;
  let trackType = "";

  for (const track of tracks) {
    const found = track.clips.find((c) => c.id === selectedClipId);
    if (found) {
      selectedClip = found;
      trackType = track.type;
      break;
    }
  }

  if (!selectedClip) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center text-gray-500 bg-[#13151a]">
        <div className="w-10 h-10 rounded-xl bg-[#1b1e26] border border-[#272b36] flex items-center justify-center mb-3 text-lg text-gray-400">
          ⚙️
        </div>
        <p className="text-xs font-semibold text-gray-300">{t("inspector.title", "Inspector Properties")}</p>
        <p className="text-[11px] mt-1 text-gray-500 max-w-[190px]">
          {t("inspector.empty_hint", "Pilih salah satu klip di Timeline untuk mengatur transformasi, chroma key, dan audio.")}
        </p>
      </div>
    );
  }

  const transform = selectedClip.transform || { scale: 1, x: 0, y: 0, rotation: 0 };
  const clipOpacity = selectedClip.opacity !== undefined ? selectedClip.opacity : 1;
  const clipVolume = selectedClip.volume !== undefined ? selectedClip.volume : 1;
  const chromaKey = selectedClip.chroma_key || {
    enabled: false,
    color: "#00FF00",
    similarity: 0.15,
    smoothness: 0.05,
  };
  const transitionIn = selectedClip.transition_in || { type: "none", duration: 0.5 };
  const transitionOut = selectedClip.transition_out || { type: "none", duration: 0.5 };

  // Status Relatif Waktu Klip Saat Ini terhadap Playhead
  const relativeTime = Math.max(0, Math.min(selectedClip.end - selectedClip.start, currentTime - selectedClip.start));
  const isPlayheadInside = currentTime >= selectedClip.start && currentTime <= selectedClip.end;

  // Cek apakah playhead tepat berada di atas salah satu keyframe
  const keyframes = selectedClip.keyframes || [];
  const activeKeyframe = keyframes.find((kf) => Math.abs(kf.time - relativeTime) < 0.05);

  const clipPlaybackSpeed = selectedClip.playbackSpeed !== undefined ? selectedClip.playbackSpeed : 1.0;

  // Nilai terinterpolasi pada detik saat ini
  const interpolatedProps = interpolateKeyframes(keyframes, relativeTime, {
    x: transform.x,
    y: transform.y,
    scale: transform.scale,
    rotation: transform.rotation,
    opacity: clipOpacity,
    volume: clipVolume,
    speed: clipPlaybackSpeed,
  });

  return (
    <div className="p-3.5 space-y-4 text-xs bg-[#13151a] min-h-full">
      {/* Clip Header Box */}
      <div className="p-2.5 rounded-lg bg-[#181b22] border border-[#232733] flex items-center justify-between">
        <div className="truncate">
          <p className="font-semibold text-gray-200 truncate text-xs">
            {selectedClip.source?.split("/").pop() || selectedClip.text || "Selected Clip"}
          </p>
          <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider">
            {trackType} Layer
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1f232d] text-gray-300">
          {(selectedClip.end - selectedClip.start).toFixed(2)}s
        </span>
      </div>

      {/* Video / Audio Speed Control (Tampil Paling Atas agar Langsung Terlihat & Mudah Diatur) */}
      {(trackType === "video" || trackType === "audio") && (
        <div className="rounded-lg bg-[#141822] border border-cyan-500/40 p-3 space-y-2.5 shadow-md shadow-cyan-950/30">
          <div className="flex justify-between items-center text-[11px] font-semibold text-gray-200 uppercase tracking-wide">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <span className="text-sm">⚡</span> Kecepatan (Speed Ramping)
            </span>
            <span className="font-mono text-cyan-300 font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60">
              {(activeKeyframe
                ? (activeKeyframe.properties.speed ?? clipPlaybackSpeed)
                : (keyframes.length > 0 && interpolatedProps.speed !== undefined
                    ? interpolatedProps.speed
                    : clipPlaybackSpeed)
              ).toFixed(2)}x
            </span>
          </div>

          <p className="text-[10px] text-gray-400 leading-relaxed">
            {activeKeyframe
              ? "Mengatur kecepatan khusus pada titik Keyframe yang dipilih:"
              : "Percepat atau perlambat klip video/audio ini:"}
          </p>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1 pt-0.5">
            {[0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 4.0, 8.0].map((presetSpd) => {
              const currentVal = activeKeyframe
                ? (activeKeyframe.properties.speed ?? clipPlaybackSpeed)
                : clipPlaybackSpeed;
              const isSelected = Math.abs(currentVal - presetSpd) < 0.05;
              return (
                <button
                  key={presetSpd}
                  type="button"
                  onClick={() => {
                    if (activeKeyframe) {
                      addOrUpdateKeyframe(selectedClip!.id, activeKeyframe.time, { speed: presetSpd });
                    } else {
                      changeClipSpeedWithRipple(selectedClip!.id, presetSpd);
                    }
                  }}
                  className={`flex-1 py-1 text-[10px] font-mono rounded font-semibold transition-all border ${
                    isSelected
                      ? "bg-cyan-500 text-black border-cyan-400 shadow-sm"
                      : "bg-[#10121a] text-gray-400 hover:text-white border-gray-800 hover:border-gray-600"
                  }`}
                >
                  {presetSpd}x
                </button>
              );
            })}
          </div>

          {/* Slider Presisi */}
          <div>
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>{activeKeyframe ? "Kecepatan di Keyframe Ini:" : "Kecepatan Keseluruhan Klip:"}</span>
              <span className="font-mono text-cyan-400 font-bold">
                {(activeKeyframe ? (activeKeyframe.properties.speed ?? clipPlaybackSpeed) : clipPlaybackSpeed).toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.25"
              max="8"
              step="0.05"
              value={activeKeyframe ? (activeKeyframe.properties.speed ?? clipPlaybackSpeed) : clipPlaybackSpeed}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (activeKeyframe) {
                  addOrUpdateKeyframe(selectedClip!.id, activeKeyframe.time, { speed: val });
                } else {
                  changeClipSpeedWithRipple(selectedClip!.id, val);
                }
              }}
              className="w-full h-1 bg-[#232732] rounded appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>
      )}

      {/* KEYFRAME CONTROLS (Tersedia untuk Video, Image, dan Audio) */}
      <div className="rounded-lg bg-[#181a24] border border-amber-500/30 p-3 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 text-sm">◆</span>
            <span className="font-semibold text-gray-200 text-[11px] tracking-wide uppercase">
              Keyframe Animator
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-600/40 rounded font-mono">
              {keyframes.length} Points
            </span>
            {keyframes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Hapus semua keyframe pada klip ini dan kembalikan ke posisi awal?")) {
                    clearAllKeyframes(selectedClip!.id);
                  }
                }}
                className="text-[10px] text-red-400 hover:text-red-300 hover:underline px-1 py-0.5"
                title="Hapus semua titik keyframe pada klip ini dan kembalikan normal"
              >
                Hapus Semua
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between bg-[#11131a] p-2 rounded border border-gray-800">
          <div className="text-[10px] text-gray-400">
            <span>Posisi Klip: </span>
            <span className="font-mono text-cyan-400 font-semibold">+{relativeTime.toFixed(2)}s</span>
            {!isPlayheadInside && (
              <span className="text-red-400 text-[9px] block">Playhead di luar klip</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Tombol Add / Remove Keyframe di Posisi Playhead */}
            {activeKeyframe ? (
              <button
                type="button"
                onClick={() => removeKeyframe(selectedClip!.id, activeKeyframe.id)}
                className="px-2 py-1 bg-red-950/80 hover:bg-red-900 border border-red-600/60 text-red-300 rounded text-[10px] font-medium transition-colors flex items-center gap-1"
                title="Hapus keyframe di detik ini"
              >
                <span>✕</span> Hapus Keyframe
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  addOrUpdateKeyframe(selectedClip!.id, relativeTime, {
                    x: transform.x,
                    y: transform.y,
                    scale: transform.scale,
                    rotation: transform.rotation,
                    opacity: clipOpacity,
                    volume: clipVolume,
                    speed: selectedClip!.playbackSpeed || 1.0,
                  });
                }}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold shadow transition-colors flex items-center gap-1"
                title="Tambahkan titik keyframe baru pada posisi playhead saat ini"
              >
                <span>◆+</span> Tambah Keyframe
              </button>
            )}
          </div>
        </div>

        {/* Daftar Keyframes Navigator & Easing */}
        {keyframes.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-gray-800/80">
            <div className="text-[10px] text-gray-400 flex items-center justify-between">
              <span>Navigasi Titik:</span>
              <span className="text-[9px] text-gray-500">Klik detik untuk lompat</span>
            </div>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-0.5">
              {keyframes.map((kf, i) => {
                const isActive = Math.abs(kf.time - relativeTime) < 0.05;
                return (
                  <div
                    key={kf.id}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                      isActive
                        ? "bg-amber-500/30 border-amber-400 text-amber-200 shadow-sm"
                        : "bg-[#14161f] border-gray-800 text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setCurrentTime(selectedClip!.start + kf.time)}
                      className="font-bold hover:underline"
                    >
                      #{i + 1} ({kf.time.toFixed(2)}s)
                    </button>
                    <button
                      type="button"
                      onClick={() => removeKeyframe(selectedClip!.id, kf.id)}
                      className="text-gray-500 hover:text-red-400 text-[10px] ml-0.5"
                      title="Hapus"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Transform Accordion */}
      {(trackType === "video" || trackType === "image") && (
        <div className="rounded-lg bg-[#171920] border border-[#21242e] p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-200 text-[11px] tracking-wide uppercase">
              Transform {keyframes.length > 0 && <span className="text-amber-400 font-normal lowercase">(saat ini di +{relativeTime.toFixed(1)}s)</span>}
            </span>
            <button
              type="button"
              onClick={() => resetClipTransform(selectedClip!.id)}
              className="text-[10px] text-gray-400 hover:text-cyan-300 hover:underline px-1 py-0.5"
              title="Reset posisi, scale, dan rotasi kembali ke nilai default (1x, tengah)"
            >
              🔄 Reset Normal
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                <span>Position X</span>
                {keyframes.length > 0 && <span className="font-mono text-amber-300 font-bold">{Math.round(interpolatedProps.x || 0)}</span>}
              </div>
              <input
                type="number"
                value={activeKeyframe ? (activeKeyframe.properties.x ?? transform.x) : transform.x}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  if (activeKeyframe) {
                    addOrUpdateKeyframe(selectedClip!.id, activeKeyframe.time, { x: val });
                  } else {
                    updateClipProperties(selectedClip!.id, {
                      transform: { ...transform, x: val },
                    });
                  }
                }}
                className="w-full px-2 py-1 bg-[#101216] border border-[#272b36] rounded text-gray-200 font-mono text-[11px] focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                <span>Position Y</span>
                {keyframes.length > 0 && <span className="font-mono text-amber-300 font-bold">{Math.round(interpolatedProps.y || 0)}</span>}
              </div>
              <input
                type="number"
                value={activeKeyframe ? (activeKeyframe.properties.y ?? transform.y) : transform.y}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  if (activeKeyframe) {
                    addOrUpdateKeyframe(selectedClip!.id, activeKeyframe.time, { y: val });
                  } else {
                    updateClipProperties(selectedClip!.id, {
                      transform: { ...transform, y: val },
                    });
                  }
                }}
                className="w-full px-2 py-1 bg-[#101216] border border-[#272b36] rounded text-gray-200 font-mono text-[11px] focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                <span>Scale</span>
                {keyframes.length > 0 && <span className="font-mono text-amber-300 font-bold">{(interpolatedProps.scale || 1).toFixed(2)}x</span>}
              </div>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="5"
                value={activeKeyframe ? (activeKeyframe.properties.scale ?? transform.scale) : transform.scale}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 1;
                  if (activeKeyframe) {
                    addOrUpdateKeyframe(selectedClip!.id, activeKeyframe.time, { scale: val });
                  } else {
                    updateClipProperties(selectedClip!.id, {
                      transform: { ...transform, scale: val },
                    });
                  }
                }}
                className="w-full px-2 py-1 bg-[#101216] border border-[#272b36] rounded text-gray-200 font-mono text-[11px] focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                <span>Rotation (°)</span>
                {keyframes.length > 0 && <span className="font-mono text-amber-300 font-bold">{Math.round(interpolatedProps.rotation || 0)}°</span>}
              </div>
              <input
                type="number"
                value={activeKeyframe ? (activeKeyframe.properties.rotation ?? transform.rotation) : transform.rotation}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  if (activeKeyframe) {
                    addOrUpdateKeyframe(selectedClip!.id, activeKeyframe.time, { rotation: val });
                  } else {
                    updateClipProperties(selectedClip!.id, {
                      transform: { ...transform, rotation: val },
                    });
                  }
                }}
                className="w-full px-2 py-1 bg-[#101216] border border-[#272b36] rounded text-gray-200 font-mono text-[11px] focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Chroma Key Accordion */}
      {(trackType === "video" || trackType === "image") && (
        <div className="rounded-lg bg-[#171920] border border-[#21242e] p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-200 text-[11px] tracking-wide uppercase">
              Chroma Key (Green Screen)
            </span>
            <input
              type="checkbox"
              checked={chromaKey.enabled}
              onChange={(e) =>
                updateClipProperties(selectedClip!.id, {
                  chroma_key: { ...chromaKey, enabled: e.target.checked },
                })
              }
              className="w-4 h-4 rounded text-cyan-500 bg-[#101216] border-[#2c303d] cursor-pointer"
            />
          </div>

          {chromaKey.enabled && (
            <div className="space-y-2.5 pt-2 border-t border-[#232733]">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Key Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={chromaKey.color}
                    onChange={(e) =>
                      updateClipProperties(selectedClip!.id, {
                        chroma_key: { ...chromaKey, color: e.target.value },
                      })
                    }
                    className="w-8 h-7 bg-transparent rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={chromaKey.color}
                    onChange={(e) =>
                      updateClipProperties(selectedClip!.id, {
                        chroma_key: { ...chromaKey, color: e.target.value },
                      })
                    }
                    className="flex-1 px-2.5 py-1 bg-[#101216] border border-[#272b36] rounded text-gray-200 font-mono uppercase text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Similarity (Toleransi)</span>
                  <span className="font-mono text-cyan-400">{chromaKey.similarity.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={chromaKey.similarity}
                  onChange={(e) =>
                    updateClipProperties(selectedClip!.id, {
                      chroma_key: { ...chromaKey, similarity: parseFloat(e.target.value) },
                    })
                  }
                  className="w-full h-1 bg-[#232732] rounded appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Smoothness (Kehalusan)</span>
                  <span className="font-mono text-cyan-400">{chromaKey.smoothness.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={chromaKey.smoothness}
                  onChange={(e) =>
                    updateClipProperties(selectedClip!.id, {
                      chroma_key: { ...chromaKey, smoothness: parseFloat(e.target.value) },
                    })
                  }
                  className="w-full h-1 bg-[#232732] rounded appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subtitle Input & Text Animation Preset */}
      {trackType === "subtitle" && (
        <div className="rounded-lg bg-[#171920] border border-[#21242e] p-3 space-y-3">
          <span className="font-semibold text-gray-200 text-[11px] tracking-wide uppercase">
            Subtitle Script & Animasi Teks
          </span>
          <textarea
            rows={4}
            value={selectedClip.text || ""}
            onChange={(e) =>
              updateClipProperties(selectedClip!.id, { text: e.target.value })
            }
            className="w-full px-2.5 py-2 bg-[#101216] border border-[#272b36] rounded text-gray-200 text-xs focus:border-cyan-500 focus:outline-none resize-none"
            placeholder="Tulis naskah teks di sini..."
          />

          {/* Text Animation Presets */}
          <div className="pt-2 border-t border-[#232733] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-gray-400 font-medium">Animasi Masuk Teks</label>
              <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                Preset
              </span>
            </div>
            <select
              value={selectedClip.text_animation?.preset || "none"}
              onChange={(e) =>
                updateClipProperties(selectedClip!.id, {
                  text_animation: {
                    preset: e.target.value as any,
                    duration: selectedClip!.text_animation?.duration || 0.6,
                  },
                })
              }
              className="w-full px-2.5 py-1.5 bg-[#101216] border border-[#272b36] rounded text-gray-200 text-xs focus:border-amber-500 focus:outline-none"
            >
              <option value="none">Tanpa Animasi (Normal)</option>
              {getCustomTextAnimations().length > 0 && (
                <optgroup label="🪄 Animasi Buatan Sendiri (Custom)">
                  {getCustomTextAnimations().map((ca) => (
                    <option key={ca.id} value={ca.id}>
                      {ca.previewIcon || "🪄"} {ca.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="✨ Preset Bawaan">
                {TEXT_ANIMATION_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.previewIcon} {p.name}
                  </option>
                ))}
              </optgroup>
            </select>

            {selectedClip.text_animation?.preset && selectedClip.text_animation.preset !== "none" && (
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Kecepatan Animasi</span>
                  <span className="font-mono text-amber-400">
                    {(selectedClip.text_animation.duration || 0.5).toFixed(2)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.05"
                  value={selectedClip.text_animation.duration || 0.5}
                  onChange={(e) =>
                    updateClipProperties(selectedClip!.id, {
                      text_animation: {
                        preset: selectedClip!.text_animation!.preset,
                        duration: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full h-1 bg-[#232732] rounded appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Opacity Control */}
      {(trackType === "video" || trackType === "image") && (
        <div className="rounded-lg bg-[#171920] border border-[#21242e] p-3 space-y-2.5">
          <div className="flex justify-between items-center text-[11px] font-semibold text-gray-200 uppercase tracking-wide">
            <span>Opacity / Transparansi</span>
            {keyframes.length > 0 && (
              <span className="font-mono text-amber-300 font-bold lowercase">
                saat ini {Math.round((interpolatedProps.opacity !== undefined ? interpolatedProps.opacity : clipOpacity) * 100)}%
              </span>
            )}
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Tingkat Kecerahan/Alpha</span>
              <span className="font-mono text-cyan-400">
                {Math.round((activeKeyframe ? (activeKeyframe.properties.opacity ?? clipOpacity) : clipOpacity) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={activeKeyframe ? (activeKeyframe.properties.opacity ?? clipOpacity) : clipOpacity}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (activeKeyframe) {
                  addOrUpdateKeyframe(selectedClip!.id, activeKeyframe.time, { opacity: val });
                } else {
                  updateClipProperties(selectedClip!.id, { opacity: val });
                }
              }}
              className="w-full h-1 bg-[#232732] rounded appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        </div>
      )}

      {/* Audio Volume & Mute Controls (Bisa untuk Track Audio dan Track Video) */}
      {(trackType === "audio" || trackType === "video") && (
        <div className="rounded-lg bg-[#171920] border border-[#21242e] p-3 space-y-2.5">
          <div className="flex justify-between items-center text-[11px] font-semibold text-gray-200 uppercase tracking-wide">
            <span>Audio & Suara {trackType === "video" ? "Video" : ""}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  updateClipProperties(selectedClip!.id, {
                    muted: !(selectedClip!.muted ?? false),
                  })
                }
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                  selectedClip!.muted
                    ? "bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                }`}
                title={selectedClip!.muted ? "Klik untuk Menghidupkan Suara" : "Klik untuk Mematikan Suara"}
              >
                <span>{selectedClip!.muted ? "🔇 Suara Mati" : "🔊 Suara Hidup"}</span>
              </button>
              {keyframes.length > 0 && (
                <span className="font-mono text-amber-300 font-bold lowercase">
                  saat ini {Math.round((interpolatedProps.volume !== undefined ? interpolatedProps.volume : clipVolume) * 100)}%
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Volume Suara</span>
              <span className="font-mono text-cyan-400">
                {selectedClip!.muted ? "0% (Muted)" : `${Math.round((activeKeyframe ? (activeKeyframe.properties.volume ?? clipVolume) : clipVolume) * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              disabled={selectedClip!.muted}
              value={activeKeyframe ? (activeKeyframe.properties.volume ?? clipVolume) : clipVolume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (activeKeyframe) {
                  addOrUpdateKeyframe(selectedClip!.id, activeKeyframe.time, { volume: val });
                } else {
                  updateClipProperties(selectedClip!.id, { volume: val });
                }
              }}
              className="w-full h-1 bg-[#232732] rounded appearance-none cursor-pointer accent-cyan-500 disabled:opacity-30"
            />
          </div>
        </div>
      )}

      {/* Animasi Khusus Klip Gambar / Overlay / Stiker */}
      {trackType === "image" && (
        <div className="rounded-lg bg-[#161a24] border border-cyan-500/30 p-3 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400 text-sm">🖼️</span>
              <span className="font-semibold text-gray-200 text-[11px] tracking-wide uppercase">
                Animasi Gambar & Stiker
              </span>
            </div>
            <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/50">
              Preset
            </span>
          </div>

          {/* Animasi Masuk (Intro Motion) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-gray-300">
              <label className="font-medium">Animasi Masuk (Intro Motion)</label>
            </div>
            <select
              value={selectedClip.image_animation?.inPreset || "none"}
              onChange={(e) => {
                const currentAnim: ImageAnimationConfig = selectedClip!.image_animation || {};
                updateClipProperties(selectedClip!.id, {
                  image_animation: {
                    ...currentAnim,
                    inPreset: e.target.value,
                    inDuration: currentAnim.inDuration || 0.5,
                  },
                });
              }}
              className="w-full px-2.5 py-1.5 bg-[#101216] border border-[#272b36] rounded text-gray-200 text-xs focus:border-cyan-500 focus:outline-none"
            >
              {IMAGE_ANIMATION_IN_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>

            {selectedClip.image_animation?.inPreset && selectedClip.image_animation.inPreset !== "none" && (
              <div className="pt-1">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Kecepatan / Durasi Masuk</span>
                  <span className="font-mono text-cyan-400">
                    {(selectedClip.image_animation.inDuration || 0.5).toFixed(2)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.05"
                  value={selectedClip.image_animation.inDuration || 0.5}
                  onChange={(e) => {
                    const currentAnim: ImageAnimationConfig = selectedClip!.image_animation || {};
                    updateClipProperties(selectedClip!.id, {
                      image_animation: {
                        ...currentAnim,
                        inDuration: parseFloat(e.target.value),
                      },
                    });
                  }}
                  className="w-full h-1 bg-[#232732] rounded appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            )}
          </div>

          {/* Animasi Loop Kontinu */}
          <div className="pt-2 border-t border-gray-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-gray-300">
              <label className="font-medium">Gerakan Loop Kontinu</label>
            </div>
            <select
              value={selectedClip.image_animation?.loopPreset || "none"}
              onChange={(e) => {
                const currentAnim: ImageAnimationConfig = selectedClip!.image_animation || {};
                updateClipProperties(selectedClip!.id, {
                  image_animation: {
                    ...currentAnim,
                    loopPreset: e.target.value,
                    loopSpeed: currentAnim.loopSpeed || 1.0,
                  },
                });
              }}
              className="w-full px-2.5 py-1.5 bg-[#101216] border border-[#272b36] rounded text-gray-200 text-xs focus:border-cyan-500 focus:outline-none"
            >
              {IMAGE_ANIMATION_LOOP_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>

            {selectedClip.image_animation?.loopPreset && selectedClip.image_animation.loopPreset !== "none" && (
              <div className="pt-1">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Kecepatan Loop</span>
                  <span className="font-mono text-cyan-400">
                    {(selectedClip.image_animation.loopSpeed || 1.0).toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={selectedClip.image_animation.loopSpeed || 1.0}
                  onChange={(e) => {
                    const currentAnim: ImageAnimationConfig = selectedClip!.image_animation || {};
                    updateClipProperties(selectedClip!.id, {
                      image_animation: {
                        ...currentAnim,
                        loopSpeed: parseFloat(e.target.value),
                      },
                    });
                  }}
                  className="w-full h-1 bg-[#232732] rounded appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            )}
          </div>

          {/* Animasi Keluar (Out Motion) */}
          <div className="pt-2 border-t border-gray-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-gray-300">
              <label className="font-medium">Animasi Keluar (Out Motion)</label>
            </div>
            <select
              value={selectedClip.image_animation?.outPreset || "none"}
              onChange={(e) => {
                const currentAnim: ImageAnimationConfig = selectedClip!.image_animation || {};
                updateClipProperties(selectedClip!.id, {
                  image_animation: {
                    ...currentAnim,
                    outPreset: e.target.value,
                    outDuration: currentAnim.outDuration || 0.5,
                  },
                });
              }}
              className="w-full px-2.5 py-1.5 bg-[#101216] border border-[#272b36] rounded text-gray-200 text-xs focus:border-cyan-500 focus:outline-none"
            >
              {IMAGE_ANIMATION_OUT_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>

            {selectedClip.image_animation?.outPreset && selectedClip.image_animation.outPreset !== "none" && (
              <div className="pt-1">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Kecepatan / Durasi Keluar</span>
                  <span className="font-mono text-cyan-400">
                    {(selectedClip.image_animation.outDuration || 0.5).toFixed(2)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.05"
                  value={selectedClip.image_animation.outDuration || 0.5}
                  onChange={(e) => {
                    const currentAnim: ImageAnimationConfig = selectedClip!.image_animation || {};
                    updateClipProperties(selectedClip!.id, {
                      image_animation: {
                        ...currentAnim,
                        outDuration: parseFloat(e.target.value),
                      },
                    });
                  }}
                  className="w-full h-1 bg-[#232732] rounded appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video / Image Transitions (Peralihan Antar Video/Gambar) */}
      {(trackType === "video" || trackType === "image") && (
        <div className="rounded-lg bg-[#171920] border border-[#21242e] p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-200 text-[11px] tracking-wide uppercase">
              Peralihan Video (Transition)
            </span>
            <button
              onClick={() => setShowTransitionModal(true)}
              className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30 transition flex items-center gap-1"
              title="Kelola & Buat Transisi Kustom"
            >
              ⚙️ Kelola Transisi
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Transisi Masuk (In)</label>
              <select
                value={transitionIn.type}
                onChange={(e) => {
                  const val = e.target.value;
                  const customTrans = getCustomTransitions().find((ct) => ct.id === val);
                  updateClipProperties(selectedClip!.id, {
                    transition_in: {
                      ...transitionIn,
                      type: val,
                      duration: customTrans ? customTrans.defaultDuration : transitionIn.duration || 0.5,
                    },
                  });
                }}
                className="w-full px-2 py-1.5 bg-[#101216] border border-[#272b36] rounded text-gray-200 text-[11px] focus:border-cyan-500 focus:outline-none"
              >
                <option value="none">Tanpa Transisi (Cut)</option>
                {getCustomTransitions().length > 0 && (
                  <optgroup label="🎬 Transisi Buatan Saya">
                    {getCustomTransitions().map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        ⚡ {ct.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="✨ Preset Bawaan">
                  <option value="morph">🌀 Morph (Warp & Blend)</option>
                  <option value="fade_in">✨ Fade In</option>
                  <option value="cross_dissolve">🌫️ Dissolve / Blur In</option>
                  <option value="slide_left">⬅️ Slide Left</option>
                  <option value="slide_right">➡️ Slide Right</option>
                  <option value="slide_up">⬆️ Slide Up</option>
                  <option value="slide_down">⬇️ Slide Down</option>
                  <option value="zoom_in">🔍 Zoom In</option>
                  <option value="zoom_out">🔎 Zoom Out</option>
                  <option value="wipe_left">🧹 Wipe Left</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Transisi Keluar (Out)</label>
              <select
                value={transitionOut.type}
                onChange={(e) => {
                  const val = e.target.value;
                  const customTrans = getCustomTransitions().find((ct) => ct.id === val);
                  updateClipProperties(selectedClip!.id, {
                    transition_out: {
                      ...transitionOut,
                      type: val,
                      duration: customTrans ? customTrans.defaultDuration : transitionOut.duration || 0.5,
                    },
                  });
                }}
                className="w-full px-2 py-1.5 bg-[#101216] border border-[#272b36] rounded text-gray-200 text-[11px] focus:border-cyan-500 focus:outline-none"
              >
                <option value="none">Tanpa Transisi (Cut)</option>
                {getCustomTransitions().length > 0 && (
                  <optgroup label="🎬 Transisi Buatan Saya">
                    {getCustomTransitions().map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        ⚡ {ct.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="✨ Preset Bawaan">
                  <option value="morph">🌀 Morph (Warp & Dissolve)</option>
                  <option value="fade_out">✨ Fade Out</option>
                  <option value="cross_dissolve">🌫️ Dissolve / Blur Out</option>
                  <option value="slide_left">⬅️ Slide Left</option>
                  <option value="slide_right">➡️ Slide Right</option>
                  <option value="slide_up">⬆️ Slide Up</option>
                  <option value="slide_down">⬇️ Slide Down</option>
                  <option value="zoom_in">🔍 Zoom In</option>
                  <option value="zoom_out">🔎 Zoom Out</option>
                  <option value="wipe_right">🧹 Wipe Right</option>
                </optgroup>
              </select>
            </div>
          </div>

          {(transitionIn.type !== "none" || transitionOut.type !== "none") && (
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Durasi Transisi</span>
                <span className="font-mono text-cyan-400">
                  {((transitionIn.duration || transitionOut.duration || 0.5)).toFixed(2)}s
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.0"
                step="0.05"
                value={transitionIn.duration || transitionOut.duration || 0.5}
                onChange={(e) => {
                  const dur = parseFloat(e.target.value);
                  updateClipProperties(selectedClip!.id, {
                    transition_in: { ...transitionIn, duration: dur },
                    transition_out: { ...transitionOut, duration: dur },
                  });
                }}
                className="w-full h-1 bg-[#232732] rounded appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          )}
        </div>
      )}
      {/* Modal Kelola Transisi Kustom */}
      {showTransitionModal && (
        <CustomTransitionModal onClose={() => setShowTransitionModal(false)} />
      )}
    </div>
  );
}
