/**
 * ImageOverlayModal.tsx
 * Modal Dialog untuk Menambahkan Gambar / Stiker / Overlay di atas Video atau Gambar
 * dengan konfigurasi instan:
 * - Pilihan file gambar dari komputer pengguna (PNG, JPG, SVG, WebP, GIF)
 * - Posisi awal (Tengah, Pojok Kanan Atas, dsb)
 * - Skala ukuran (0.1x - 2.0x)
 * - Pilihan Preset Animasi Masuk (Intro Motion), Loop Kontinu, dan Keluar (Out Motion)
 * - Durasi kemunculan di timeline
 */

import { useState, useRef, useEffect } from "react";
import { useProjectStore } from "../../stores/projectStore";
import {
  IMAGE_ANIMATION_IN_PRESETS,
  IMAGE_ANIMATION_OUT_PRESETS,
  IMAGE_ANIMATION_LOOP_PRESETS,
  evaluateImageAnimation,
  ImageAnimationConfig,
} from "../../services/imageAnimationPresets";

interface ImageOverlayModalProps {
  onClose: () => void;
  onAdded?: (clipId: string) => void;
}

export default function ImageOverlayModal({ onClose, onAdded }: ImageOverlayModalProps) {
  const currentTime = useProjectStore((s) => s.currentTime);
  const tracks = useProjectStore((s) => s.timeline.tracks);
  const addTrack = useProjectStore((s) => s.addTrack);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [imageFileName, setImageFileName] = useState<string>("");

  // Transform Config
  const [scale, setScale] = useState<number>(0.5);
  const [posX, setPosX] = useState<number>(0);
  const [posY, setPosY] = useState<number>(0);
  const [duration, setDuration] = useState<number>(4.0);

  // Animation Config
  const [inPreset, setInPreset] = useState<string>("pop_bounce");
  const [inDuration, setInDuration] = useState<number>(0.6);
  const [loopPreset, setLoopPreset] = useState<string>("floating");
  const [loopSpeed, setLoopSpeed] = useState<number>(1.0);
  const [outPreset, setOutPreset] = useState<string>("zoom_shrink");
  const [outDuration, setOutDuration] = useState<number>(0.5);

  // Live Animation Loop State
  const [animProgressSec, setAnimProgressSec] = useState<number>(0);

  useEffect(() => {
    let animFrame: number;
    let start = performance.now();

    const loop = (now: number) => {
      const elapsed = (now - start) / 1000;
      const cycle = duration + 1.0;
      const t = elapsed % cycle;
      setAnimProgressSec(t);
      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [duration]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === "string") {
        setImagePreviewUrl(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Evaluasi animasi untuk live preview box
  const animConfig: ImageAnimationConfig = {
    inPreset,
    inDuration,
    loopPreset,
    loopSpeed,
    outPreset,
    outDuration,
  };

  const evalTransform = evaluateImageAnimation(
    animConfig,
    animProgressSec,
    duration,
    300,
    180
  );

  const handleApply = () => {
    if (!imagePreviewUrl) {
      alert("Silakan pilih file gambar terlebih dahulu!");
      return;
    }

    // 1. Cari atau buat Image Track baru di timeline
    const imageTrack = tracks.find((t) => t.type === "image");

    if (!imageTrack) {
      addTrack("image");
    }

    // 2. Buat klip baru pada track image
    const clipId = `clip-img-${Date.now()}`;
    const startSec = Math.max(0, currentTime);
    const endSec = startSec + duration;

    // Masukkan klip via projectStore
    const store = useProjectStore.getState();
    const targetTrack = store.timeline.tracks.find((t) => t.type === "image") || store.timeline.tracks[0];

    const newClip = {
      id: clipId,
      trackId: targetTrack.id,
      source: imagePreviewUrl,
      start: startSec,
      end: endSec,
      source_start: 0,
      source_end: duration,
      transform: {
        scale: scale,
        x: posX,
        y: posY,
        rotation: 0,
      },
      opacity: 1,
      transition_in: { type: "none", duration: 0.5 },
      transition_out: { type: "none", duration: 0.5 },
      image_animation: animConfig,
    };

    // Update track clips di projectStore
    const updatedTracks = store.timeline.tracks.map((t) => {
      if (t.id === targetTrack.id) {
        return {
          ...t,
          clips: [...t.clips, newClip],
        };
      }
      return t;
    });

    useProjectStore.setState({
      timeline: {
        ...store.timeline,
        tracks: updatedTracks,
      },
      selectedClipId: clipId,
    });

    if (onAdded) onAdded(clipId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#141620] border border-gray-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-gray-200">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-900/90 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🖼️</span>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Tambah Gambar / Stiker & Animasi
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                  Overlay Layer
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                Sisipkan gambar atau stiker di atas video/gambar timeline lengkap dengan animasi gerakan dinamis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Sisi Kiri: Live Preview & File Picker (5 Col) */}
          <div className="md:col-span-5 space-y-4 flex flex-col justify-between">
            {/* Box Layar Preview */}
            <div className="h-56 bg-[#0a0c10] border border-gray-800 rounded-xl relative overflow-hidden flex items-center justify-center shadow-inner">
              <div className="absolute top-2 left-3 text-[10px] font-mono text-gray-400 flex items-center gap-2 z-10">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>LIVE PREVIEW ANIMASI</span>
                <span className="text-cyan-400">({animProgressSec.toFixed(2)}s)</span>
              </div>

              {/* Background Mockup Video / Layer */}
              <div className="absolute inset-0 bg-gradient-to-tr from-gray-950 via-gray-900 to-indigo-950/40 opacity-70 flex items-center justify-center">
                <span className="text-[11px] text-gray-600 font-mono">Video / Background Timeline</span>
              </div>

              {/* Gambar / Stiker dengan Animasi */}
              {imagePreviewUrl ? (
                <div
                  style={{
                    opacity: evalTransform.opacity,
                    transform: `translate(${posX + evalTransform.offsetX}px, ${posY + evalTransform.offsetY}px) scale(${scale * evalTransform.scale}) rotate(${evalTransform.rotation}deg)`,
                    transition: "none",
                  }}
                  className="max-w-[75%] max-h-[75%] z-20 pointer-events-none drop-shadow-2xl"
                >
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    className="max-h-36 max-w-full object-contain rounded"
                  />
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer text-center p-6 border-2 border-dashed border-gray-700/80 hover:border-cyan-500 rounded-xl text-gray-400 hover:text-cyan-300 transition z-10 group"
                >
                  <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">📂</div>
                  <p className="text-xs font-semibold">Klik untuk Memilih Gambar</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Mendukung PNG (transparan), JPG, SVG, WebP</p>
                </div>
              )}
            </div>

            {/* Tombol Ganti File & Status */}
            <div className="bg-[#10121a] p-3 rounded-xl border border-gray-800 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 truncate max-w-[170px]">
                  {imageFileName || "Belum ada file dipilih"}
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-[11px] font-medium transition"
                >
                  Pilih Gambar...
                </button>
              </div>

              {/* Slider Durasi Tampil */}
              <div className="pt-2 border-t border-gray-800/80">
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Durasi Tampil di Timeline:</span>
                  <span className="font-mono text-cyan-400 font-bold">{duration.toFixed(1)} detik</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="0.5"
                  value={duration}
                  onChange={(e) => setDuration(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Konfigurator Transformasi & Animasi (7 Col) */}
          <div className="md:col-span-7 space-y-3.5 bg-[#10121a] p-4 rounded-xl border border-gray-800 text-xs">
            {/* Pengaturan Ukuran & Posisi */}
            <div className="space-y-2 pb-3 border-b border-gray-800">
              <span className="font-semibold text-gray-200 block text-[11px] uppercase tracking-wider">
                1. Ukuran & Posisi Gambar
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                    <span>Skala Ukuran:</span>
                    <span className="font-mono text-cyan-400 font-bold">{scale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                    <span>Posisi X:</span>
                    <span className="font-mono text-cyan-400">{posX}px</span>
                  </div>
                  <input
                    type="range"
                    min="-200"
                    max="200"
                    step="5"
                    value={posX}
                    onChange={(e) => setPosX(parseInt(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                    <span>Posisi Y:</span>
                    <span className="font-mono text-cyan-400">{posY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    step="5"
                    value={posY}
                    onChange={(e) => setPosY(parseInt(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Pilihan Animasi Masuk (Intro Motion) */}
            <div className="space-y-1.5 pb-3 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-200 text-[11px] uppercase tracking-wider">
                  2. Animasi Masuk (Intro)
                </span>
                <span className="text-[10px] font-mono text-cyan-400">
                  {inDuration.toFixed(2)}s
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={inPreset}
                  onChange={(e) => setInPreset(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#171924] border border-gray-700/80 rounded text-gray-200 focus:outline-none focus:border-cyan-500"
                >
                  {IMAGE_ANIMATION_IN_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="range"
                  min="0.2"
                  max="1.5"
                  step="0.05"
                  value={inDuration}
                  onChange={(e) => setInDuration(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 my-auto"
                />
              </div>
            </div>

            {/* Pilihan Animasi Loop Kontinu */}
            <div className="space-y-1.5 pb-3 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-200 text-[11px] uppercase tracking-wider">
                  3. Gerakan Loop Kontinu (Selama Muncul)
                </span>
                <span className="text-[10px] font-mono text-cyan-400">
                  {loopSpeed.toFixed(1)}x
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={loopPreset}
                  onChange={(e) => setLoopPreset(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#171924] border border-gray-700/80 rounded text-gray-200 focus:outline-none focus:border-cyan-500"
                >
                  {IMAGE_ANIMATION_LOOP_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={loopSpeed}
                  onChange={(e) => setLoopSpeed(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 my-auto"
                />
              </div>
            </div>

            {/* Pilihan Animasi Keluar (Out Motion) */}
            <div className="space-y-1.5 pb-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-200 text-[11px] uppercase tracking-wider">
                  4. Animasi Keluar (Outro)
                </span>
                <span className="text-[10px] font-mono text-cyan-400">
                  {outDuration.toFixed(2)}s
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={outPreset}
                  onChange={(e) => setOutPreset(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#171924] border border-gray-700/80 rounded text-gray-200 focus:outline-none focus:border-cyan-500"
                >
                  {IMAGE_ANIMATION_OUT_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="range"
                  min="0.2"
                  max="1.5"
                  step="0.05"
                  value={outDuration}
                  onChange={(e) => setOutDuration(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 my-auto"
                />
              </div>
            </div>

            {/* Tombol Aksi Bawah */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!imagePreviewUrl}
                className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white font-bold rounded-lg shadow-lg text-xs transition flex items-center gap-1.5"
              >
                <span>➕</span> Masukkan ke Timeline
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
