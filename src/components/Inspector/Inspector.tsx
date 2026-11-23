import { useProjectStore, Clip } from "../../stores/projectStore";
import { TEXT_ANIMATION_PRESETS } from "../../services/textAnimationPresets";

export default function Inspector() {
  const selectedClipId = useProjectStore((s) => s.selectedClipId);
  const tracks = useProjectStore((s) => s.timeline.tracks);
  const updateClipProperties = useProjectStore((s) => s.updateClipProperties);

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
        <p className="text-xs font-semibold text-gray-300">Inspector Properties</p>
        <p className="text-[11px] mt-1 text-gray-500 max-w-[190px]">
          Pilih salah satu klip di Timeline untuk mengatur transformasi, chroma key, dan audio.
        </p>
      </div>
    );
  }

  const transform = selectedClip.transform || { scale: 1, x: 0, y: 0, rotation: 0 };
  const chromaKey = selectedClip.chroma_key || {
    enabled: false,
    color: "#00FF00",
    similarity: 0.15,
    smoothness: 0.05,
  };
  const transitionIn = selectedClip.transition_in || { type: "none", duration: 0.5 };
  const transitionOut = selectedClip.transition_out || { type: "none", duration: 0.5 };

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

      {/* Transform Accordion */}
      {(trackType === "video" || trackType === "image") && (
        <div className="rounded-lg bg-[#171920] border border-[#21242e] p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-200 text-[11px] tracking-wide uppercase">
              Transform
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Position X</label>
              <input
                type="number"
                value={transform.x}
                onChange={(e) =>
                  updateClipProperties(selectedClip!.id, {
                    transform: { ...transform, x: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-full px-2 py-1 bg-[#101216] border border-[#272b36] rounded text-gray-200 font-mono text-[11px] focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Position Y</label>
              <input
                type="number"
                value={transform.y}
                onChange={(e) =>
                  updateClipProperties(selectedClip!.id, {
                    transform: { ...transform, y: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-full px-2 py-1 bg-[#101216] border border-[#272b36] rounded text-gray-200 font-mono text-[11px] focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Scale</label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="5"
                value={transform.scale}
                onChange={(e) =>
                  updateClipProperties(selectedClip!.id, {
                    transform: { ...transform, scale: parseFloat(e.target.value) || 1 },
                  })
                }
                className="w-full px-2 py-1 bg-[#101216] border border-[#272b36] rounded text-gray-200 font-mono text-[11px] focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Rotation (°)</label>
              <input
                type="number"
                value={transform.rotation}
                onChange={(e) =>
                  updateClipProperties(selectedClip!.id, {
                    transform: { ...transform, rotation: parseFloat(e.target.value) || 0 },
                  })
                }
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
              {TEXT_ANIMATION_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.previewIcon} {p.name}
                </option>
              ))}
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

      {/* Audio Volume */}
      {trackType === "audio" && (
        <div className="rounded-lg bg-[#171920] border border-[#21242e] p-3 space-y-2.5">
          <span className="font-semibold text-gray-200 text-[11px] tracking-wide uppercase">
            Audio Control
          </span>
          <div>
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Volume</span>
              <span className="font-mono text-cyan-400">{Math.round((selectedClip.volume ?? 1) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={selectedClip.volume ?? 1}
              onChange={(e) =>
                updateClipProperties(selectedClip!.id, { volume: parseFloat(e.target.value) })
              }
              className="w-full h-1 bg-[#232732] rounded appearance-none cursor-pointer"
            />
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
            <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
              Preset
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Transisi Masuk (In)</label>
              <select
                value={transitionIn.type}
                onChange={(e) =>
                  updateClipProperties(selectedClip!.id, {
                    transition_in: { ...transitionIn, type: e.target.value },
                  })
                }
                className="w-full px-2 py-1.5 bg-[#101216] border border-[#272b36] rounded text-gray-200 text-[11px] focus:border-cyan-500 focus:outline-none"
              >
                <option value="none">Tanpa Transisi (Cut)</option>
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
              </select>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Transisi Keluar (Out)</label>
              <select
                value={transitionOut.type}
                onChange={(e) =>
                  updateClipProperties(selectedClip!.id, {
                    transition_out: { ...transitionOut, type: e.target.value },
                  })
                }
                className="w-full px-2 py-1.5 bg-[#101216] border border-[#272b36] rounded text-gray-200 text-[11px] focus:border-cyan-500 focus:outline-none"
              >
                <option value="none">Tanpa Transisi (Cut)</option>
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
    </div>
  );
}
