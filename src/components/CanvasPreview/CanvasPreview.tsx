import { useState, useRef, useEffect, useCallback } from "react";
import { useProjectStore, Clip, Track } from "../../stores/projectStore";

export default function CanvasPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Cache resource elemen video & gambar di memori agar rendering 60 FPS halus
  const mediaCacheRef = useRef<Map<string, HTMLImageElement | HTMLVideoElement>>(new Map());

  const [isPlaying, setIsPlaying] = useState(false);

  const tracks = useProjectStore((s) => s.timeline.tracks);
  const currentTime = useProjectStore((s) => s.currentTime);
  const duration = useProjectStore((s) => s.meta.duration);
  const setCurrentTime = useProjectStore((s) => s.setCurrentTime);
  const aspectRatio = useProjectStore((s) => s.meta.aspect_ratio);

  // Helper untuk mendapatkan / me-load elemen Image atau Video
  const getMediaElement = useCallback((source: string, type: "image" | "video") => {
    let el = mediaCacheRef.current.get(source);
    if (!el) {
      if (type === "image") {
        const img = new Image();
        img.src = source;
        mediaCacheRef.current.set(source, img);
        el = img;
      } else if (type === "video") {
        const vid = document.createElement("video");
        vid.src = source;
        vid.crossOrigin = "anonymous";
        vid.muted = true; // Preview muted agar autoplay lancar
        vid.playsInline = true;
        vid.preload = "auto";
        mediaCacheRef.current.set(source, vid);
        el = vid;
      }
    }
    return el;
  }, []);

  // Fungsi Render Frame Canvas berdasarkan currentTime
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Bersihkan background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    // Kumpulkan semua klip yang aktif di currentTime, urutkan berdasarkan track layer
    const activeClips: { clip: Clip; track: Track }[] = [];
    for (const track of tracks) {
      for (const clip of track.clips) {
        if (currentTime >= clip.start && currentTime <= clip.end) {
          activeClips.push({ clip, track });
        }
      }
    }

    if (activeClips.length === 0) {
      // Jika tidak ada klip yang aktif, tampilkan grid transparan / checkerboard
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.fillStyle = "#64748b";
      ctx.font = "14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Tidak ada klip aktif pada posisi playhead ini", width / 2, height / 2);
      ctx.font = "11px Inter, sans-serif";
      ctx.fillText(`Playhead: ${currentTime.toFixed(2)}s / ${duration.toFixed(1)}s`, width / 2, height / 2 + 24);
      return;
    }

    // 2. Render layer Video & Image
    for (const { clip, track } of activeClips) {
      if ((track.type === "video" || track.type === "image") && clip.source) {
        const media = getMediaElement(clip.source, track.type);

        if (media instanceof HTMLImageElement && media.complete && media.naturalWidth > 0) {
          ctx.save();
          drawTransformedMedia(ctx, media, clip, width, height);
          ctx.restore();
        } else if (media instanceof HTMLVideoElement) {
          // Sinkronisasi waktu video dengan playhead timeline
          const clipInternalTime = currentTime - clip.start + (clip.source_start || 0);
          if (Math.abs(media.currentTime - clipInternalTime) > 0.15) {
            media.currentTime = Math.max(0, clipInternalTime);
          }

          if (isPlaying && media.paused) {
            media.play().catch(() => {});
          } else if (!isPlaying && !media.paused) {
            media.pause();
          }

          if (media.readyState >= 2) {
            ctx.save();
            drawTransformedMedia(ctx, media, clip, width, height);
            ctx.restore();
          }
        }
      }
    }

    // 3. Render Subtitle Track (Paling Atas)
    for (const { clip, track } of activeClips) {
      if (track.type === "subtitle" && clip.text) {
        ctx.save();
        ctx.font = "bold 24px 'Noto Sans', Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        const text = clip.text;
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        const boxPadding = 12;
        const boxHeight = 36;
        const boxY = height - 48;
        const boxX = width / 2 - textWidth / 2 - boxPadding;

        // Background kotak subtitle hitam transparan
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.roundRect
          ? ctx.roundRect(boxX, boxY - boxHeight + 8, textWidth + boxPadding * 2, boxHeight, 6)
          : ctx.fillRect(boxX, boxY - boxHeight + 8, textWidth + boxPadding * 2, boxHeight);
        ctx.fill();

        // Teks putih dengan shadow halus
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
        ctx.shadowBlur = 4;
        ctx.fillText(text, width / 2, boxY);
        ctx.restore();
      }
    }
  }, [currentTime, duration, tracks, isPlaying, getMediaElement]);

  // Fungsi Transform & Chroma Key Rendering
  const drawTransformedMedia = (
    ctx: CanvasRenderingContext2D,
    media: HTMLImageElement | HTMLVideoElement,
    clip: Clip,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    const transform = clip.transform || { scale: 1, x: 0, y: 0, rotation: 0 };
    const chroma = clip.chroma_key;

    const cx = canvasWidth / 2 + transform.x;
    const cy = canvasHeight / 2 + transform.y;

    ctx.translate(cx, cy);
    if (transform.rotation) {
      ctx.rotate((transform.rotation * Math.PI) / 180);
    }
    ctx.scale(transform.scale, transform.scale);

    const mWidth = (media as HTMLVideoElement).videoWidth || (media as HTMLImageElement).naturalWidth || canvasWidth;
    const mHeight = (media as HTMLVideoElement).videoHeight || (media as HTMLImageElement).naturalHeight || canvasHeight;

    // Menghitung aspect fit ke canvas
    const scale = Math.min(canvasWidth / mWidth, canvasHeight / mHeight);
    const drawW = mWidth * scale;
    const drawH = mHeight * scale;

    if (chroma && chroma.enabled) {
      // Render dengan software chroma key sampling (CPU filter untuk Canvas 2D)
      const offscreen = document.createElement("canvas");
      offscreen.width = drawW;
      offscreen.height = drawH;
      const offCtx = offscreen.getContext("2d");
      if (offCtx) {
        offCtx.drawImage(media, 0, 0, drawW, drawH);
        const imgData = offCtx.getImageData(0, 0, drawW, drawH);
        const data = imgData.data;

        // Parse hex color key (misal "#00FF00")
        const hex = chroma.color.replace("#", "");
        const keyR = parseInt(hex.substring(0, 2) || "0", 16);
        const keyG = parseInt(hex.substring(2, 4) || "255", 16);
        const keyB = parseInt(hex.substring(4, 6) || "0", 16);
        const simThreshold = (chroma.similarity || 0.15) * 441; // Euclidean distance max ~441.6

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const dist = Math.sqrt((r - keyR) ** 2 + (g - keyG) ** 2 + (b - keyB) ** 2);

          if (dist < simThreshold) {
            data[i + 3] = 0; // Transparan
          }
        }
        offCtx.putImageData(imgData, 0, 0);
        ctx.drawImage(offscreen, -drawW / 2, -drawH / 2, drawW, drawH);
      }
    } else {
      ctx.drawImage(media, -drawW / 2, -drawH / 2, drawW, drawH);
    }
  };

  // Playback Loop dengan requestAnimationFrame
  useEffect(() => {
    let animId: number;

    const tick = (now: number) => {
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (isPlaying) {
        const nextTime = currentTime + deltaSec;
        if (nextTime >= duration) {
          setCurrentTime(0);
          setIsPlaying(false);
        } else {
          setCurrentTime(nextTime);
        }
      }

      renderFrame();
      animId = requestAnimationFrame(tick);
    };

    lastTimeRef.current = performance.now();
    animId = requestAnimationFrame(tick);
    animationFrameRef.current = animId;

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentTime, duration, renderFrame, setCurrentTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full select-none bg-gray-950">
      {/* Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-3 min-h-0 relative">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="max-w-full max-h-full rounded-lg border border-gray-800 shadow-2xl bg-black object-contain"
          style={{ aspectRatio: aspectRatio.replace(":", " / ") }}
        />
      </div>

      {/* Transport Controls */}
      <div className="px-4 pb-2.5 flex items-center gap-3 bg-gray-900/60 border-t border-gray-800/80 pt-2 shrink-0">
        <span className="text-xs text-indigo-400 font-mono w-20">
          {formatTime(currentTime)}
        </span>

        {/* Scrubber */}
        <div className="flex-1 relative h-2 group flex items-center">
          <div className="absolute inset-0 bg-gray-800 rounded-full" />
          <div
            className="absolute left-0 top-0 h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration}
            step={0.05}
            value={currentTime}
            onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>

        <span className="text-xs text-gray-500 font-mono w-20 text-right">
          {formatTime(duration)}
        </span>

        {/* Playback Buttons */}
        <div className="flex items-center gap-1.5 ml-2">
          <button
            onClick={() => setCurrentTime(0)}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors text-xs"
            title="Ke Awal"
          >
            ⏮
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors shadow-lg shadow-indigo-950/40 text-xs"
            title={isPlaying ? "Pause (Spasi)" : "Play (Spasi)"}
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>
          <button
            onClick={() => setCurrentTime(duration)}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors text-xs"
            title="Ke Akhir"
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  );
}
