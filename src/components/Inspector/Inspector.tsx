import { useProjectStore, Clip } from "../../stores/projectStore";

export default function Inspector() {
  const selectedClipId = useProjectStore((s) => s.selectedClipId);
  const tracks = useProjectStore((s) => s.timeline.tracks);
  const updateClipProperties = useProjectStore((s) => s.updateClipProperties);

  // Cari klip yang sedang dipilih di semua tracks
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
      <div className="p-4 flex flex-col items-center justify-center h-full text-center text-gray-500">
        <div className="text-3xl mb-2">🔍</div>
        <p className="text-sm font-medium text-gray-400">Tidak ada klip terpilih</p>
        <p className="text-xs mt-1 text-gray-500 max-w-[200px]">
          Klik salah satu balok klip di Timeline untuk mengatur properti, crop, atau chroma key.
        </p>
      </div>
    );
  }

  const transform = selectedClip.transform || { scale: 1, x: 0, y: 0, rotation: 0 };
  const crop = selectedClip.crop || { x: 0, y: 0, width: 1920, height: 1080 };
  const chromaKey = selectedClip.chroma_key || {
    enabled: false,
    color: "#00FF00",
    similarity: 0.15,
    smoothness: 0.05,
  };
  const transitionIn = selectedClip.transition_in || { type: "none", duration: 0.5 };
  const transitionOut = selectedClip.transition_out || { type: "none", duration: 0.5 };

  return (
    <div className="p-3.5 space-y-4 text-xs">
      {/* Header Info */}
      <div className="border-b border-gray-800 pb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">
            {selectedClip.source?.split("/").pop() || selectedClip.text || "Klip Properti"}
          </h3>
          <p className="text-[10px] text-indigo-400 uppercase tracking-wider mt-0.5">
            Tipe Track: {trackType}
          </p>
        </div>
        <span className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-400 rounded font-mono">
          {(selectedClip.end - selectedClip.start).toFixed(2)}s
        </span>
      </div>

      {/* Transform Section (Video / Image) */}
      {(trackType === "video" || trackType === "image") && (
        <div className="space-y-2 bg-gray-800/40 p-2.5 rounded-lg border border-gray-800">
          <p className="font-semibold text-gray-300 uppercase tracking-wider text-[11px]">
            📐 Transformasi
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Posisi X (px)</label>
              <input
                type="number"
                value={transform.x}
                onChange={(e) =>
                  updateClipProperties(selectedClip!.id, {
                    transform: { ...transform, x: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Posisi Y (px)</label>
              <input
                type="number"
                value={transform.y}
                onChange={(e) =>
                  updateClipProperties(selectedClip!.id, {
                    transform: { ...transform, y: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Scale (Ukuran)</label>
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
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Rotasi (°)</label>
              <input
                type="number"
                value={transform.rotation}
                onChange={(e) =>
                  updateClipProperties(selectedClip!.id, {
                    transform: { ...transform, rotation: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Crop Section (Video / Image) */}
      {(trackType === "video" || trackType === "image") && (
        <div className="space-y-2 bg-gray-800/40 p-2.5 rounded-lg border border-gray-800">
          <p className="font-semibold text-gray-300 uppercase tracking-wider text-[11px]">
            ✂️ Crop Klip
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Crop X (px)</label>
              <input
                type="number"
                value={crop.x}
                onChange={(e) =>
                  updateClipProperties(selectedClip!.id, {
                    crop: { ...crop, x: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Crop Y (px)</label>
              <input
                type="number"
                value={crop.y}
                onChange={(e) =>
                  updateClipProperties(selectedClip!.id, {
                    crop: { ...crop, y: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Lebar (Width)</label>
              <input
                type="number"
                value={crop.width}
                onChange={(e) =>
                  updateClipProperties(selectedClip!.id, {
                    crop: { ...crop, width: parseFloat(e.target.value) || 1920 },
                  })
                }
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Tinggi (Height)</label>
              <input
                type="number"
                value={crop.height}
                onChange={(e) =>
                  updateClipProperties(selectedClip!.id, {
                    crop: { ...crop, height: parseFloat(e.target.value) || 1080 },
                  })
                }
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Chroma Keying Section (Video / Image) */}
      {(trackType === "video" || trackType === "image") && (
        <div className="space-y-2.5 bg-gray-800/40 p-2.5 rounded-lg border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-300 uppercase tracking-wider text-[11px]">
              🟢 Chroma Key (Green Screen)
            </span>
            <input
              type="checkbox"
              checked={chromaKey.enabled}
              onChange={(e) =>
                updateClipProperties(selectedClip!.id, {
                  chroma_key: { ...chromaKey, enabled: e.target.checked },
                })
              }
              className="w-4 h-4 rounded text-indigo-600 bg-gray-700 border-gray-600 cursor-pointer"
            />
          </div>

          {chromaKey.enabled && (
            <div className="space-y-2 pt-1 border-t border-gray-700/50">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Warna Kunci</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={chromaKey.color}
                    onChange={(e) =>
                      updateClipProperties(selectedClip!.id, {
                        chroma_key: { ...chromaKey, color: e.target.value },
                      })
                    }
                    className="w-8 h-7 bg-transparent cursor-pointer rounded"
                  />
                  <input
                    type="text"
                    value={chromaKey.color}
                    onChange={(e) =>
                      updateClipProperties(selectedClip!.id, {
                        chroma_key: { ...chromaKey, color: e.target.value },
                      })
                    }
                    className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200 uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Toleransi (Similarity)</span>
                  <span className="font-mono">{chromaKey.similarity.toFixed(2)}</span>
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
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Kehalusan Tepian (Smoothness)</span>
                  <span className="font-mono">{chromaKey.smoothness.toFixed(2)}</span>
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
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subtitle Text Section */}
      {trackType === "subtitle" && (
        <div className="space-y-2 bg-gray-800/40 p-2.5 rounded-lg border border-gray-800">
          <p className="font-semibold text-gray-300 uppercase tracking-wider text-[11px]">
            💬 Teks Subtitle
          </p>
          <textarea
            rows={3}
            value={selectedClip.text || ""}
            onChange={(e) =>
              updateClipProperties(selectedClip!.id, { text: e.target.value })
            }
            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-gray-200 resize-none"
            placeholder="Tulis naskah teks subtitle di sini..."
          />
        </div>
      )}

      {/* Audio Volume & Fade */}
      {trackType === "audio" && (
        <div className="space-y-2 bg-gray-800/40 p-2.5 rounded-lg border border-gray-800">
          <p className="font-semibold text-gray-300 uppercase tracking-wider text-[11px]">
            🔊 Pengaturan Audio
          </p>
          <div>
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Volume</span>
              <span className="font-mono">{Math.round((selectedClip.volume ?? 1) * 100)}%</span>
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
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Fade In (s)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={selectedClip.fade_in ?? 0}
                onChange={(e) =>
                  updateClipProperties(selectedClip!.id, { fade_in: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Fade Out (s)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={selectedClip.fade_out ?? 0}
                onChange={(e) =>
                  updateClipProperties(selectedClip!.id, { fade_out: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Transition Section */}
      <div className="space-y-2 bg-gray-800/40 p-2.5 rounded-lg border border-gray-800">
        <p className="font-semibold text-gray-300 uppercase tracking-wider text-[11px]">
          ✨ Efek Transisi
        </p>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Transisi Masuk (In)</label>
            <select
              value={transitionIn.type}
              onChange={(e) =>
                updateClipProperties(selectedClip!.id, {
                  transition_in: { ...transitionIn, type: e.target.value },
                })
              }
              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200"
            >
              <option value="none">Tidak Ada</option>
              <option value="fade_in">Fade In</option>
              <option value="cross_dissolve">Cross Dissolve</option>
              <option value="slide_up">Slide Up</option>
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
              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200"
            >
              <option value="none">Tidak Ada</option>
              <option value="fade_out">Fade Out</option>
              <option value="cross_dissolve">Cross Dissolve</option>
              <option value="wipe_left">Wipe Left</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
