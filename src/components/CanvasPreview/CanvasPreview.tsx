import { useState, useRef, useEffect, useCallback } from "react";
import { useProjectStore, Clip, Track } from "../../stores/projectStore";

export default function CanvasPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const mediaCacheRef = useRef<Map<string, HTMLImageElement | HTMLVideoElement>>(new Map());

  const [isPlaying, setIsPlaying] = useState(false);

  const tracks = useProjectStore((s) => s.timeline.tracks);
  const currentTime = useProjectStore((s) => s.currentTime);
  const duration = useProjectStore((s) => s.meta.duration);
  const setCurrentTime = useProjectStore((s) => s.setCurrentTime);
  const aspectRatio = useProjectStore((s) => s.meta.aspect_ratio);

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
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = "auto";
        mediaCacheRef.current.set(source, vid);
        el = vid;
      }
    }
    return el;
  }, []);

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = "#090a0d";
    ctx.fillRect(0, 0, width, height);

    const activeClips: { clip: Clip; track: Track }[] = [];
    for (const track of tracks) {
      for (const clip of track.clips) {
        if (currentTime >= clip.start && currentTime <= clip.end) {
          activeClips.push({ clip, track });
        }
      }
    }

    if (activeClips.length === 0) {
      // Sleek Minimal Grid
      ctx.strokeStyle = "#16181f";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.fillStyle = "#3a3f4d";
      ctx.font = "500 13px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Tidak ada media aktif pada timeline ini", width / 2, height / 2 - 4);
      ctx.font = "11px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#272a34";
      ctx.fillText(`${aspectRatio} • ${width}×${height}`, width / 2, height / 2 + 18);
      return;
    }

    // Render layers
    for (const { clip, track } of activeClips) {
      if ((track.type === "video" || track.type === "image") && clip.source) {
        const media = getMediaElement(clip.source, track.type);

        if (media instanceof HTMLImageElement && media.complete && media.naturalWidth > 0) {
          ctx.save();
          drawTransformedMedia(ctx, media, clip, width, height);
          ctx.restore();
        } else if (media instanceof HTMLVideoElement) {
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

    // Subtitle Rendering
    for (const { clip, track } of activeClips) {
      if (track.type === "subtitle" && clip.text) {
        ctx.save();
        ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        const text = clip.text;
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        const boxPadding = 16;
        const boxHeight = 44;
        const boxY = height - 44;
        const boxX = width / 2 - textWidth / 2 - boxPadding;

        ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(boxX, boxY - boxHeight + 8, textWidth + boxPadding * 2, boxHeight, 8);
          ctx.fill();
        } else {
          ctx.fillRect(boxX, boxY - boxHeight + 8, textWidth + boxPadding * 2, boxHeight);
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, width / 2, boxY);
        ctx.restore();
      }
    }
  }, [currentTime, duration, tracks, isPlaying, getMediaElement, aspectRatio]);

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

    const scale = Math.min(canvasWidth / mWidth, canvasHeight / mHeight);
    const drawW = mWidth * scale;
    const drawH = mHeight * scale;

    if (chroma && chroma.enabled) {
      const offscreen = document.createElement("canvas");
      offscreen.width = drawW;
      offscreen.height = drawH;
      const offCtx = offscreen.getContext("2d");
      if (offCtx) {
        offCtx.drawImage(media, 0, 0, drawW, drawH);
        const imgData = offCtx.getImageData(0, 0, drawW, drawH);
        const data = imgData.data;

        const hex = chroma.color.replace("#", "");
        const keyR = parseInt(hex.substring(0, 2) || "0", 16);
        const keyG = parseInt(hex.substring(2, 4) || "255", 16);
        const keyB = parseInt(hex.substring(4, 6) || "0", 16);
        const simThreshold = (chroma.similarity || 0.15) * 441;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const dist = Math.sqrt((r - keyR) ** 2 + (g - keyG) ** 2 + (b - keyB) ** 2);

          if (dist < simThreshold) {
            data[i + 3] = 0;
          }
        }
        offCtx.putImageData(imgData, 0, 0);
        ctx.drawImage(offscreen, -drawW / 2, -drawH / 2, drawW, drawH);
      }
    } else {
      ctx.drawImage(media, -drawW / 2, -drawH / 2, drawW, drawH);
    }
  };

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

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentTime, duration, renderFrame, setCurrentTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const f = Math.floor((seconds % 1) * 30);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}:${f.toString().padStart(2, "0")}`;
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-[#0b0c0e] select-none">
      {/* Top Monitor Bar */}
      <div className="h-8 border-b border-[#1b1d24] px-4 flex items-center justify-between text-[11px] text-gray-400 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-200">Player Monitor</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#171920] border border-[#242731] text-cyan-400 font-mono">
            {aspectRatio}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-cyan-400 font-bold">{formatTime(currentTime)}</span>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="flex-1 flex items-center justify-center p-3 min-h-0 min-w-0 relative overflow-hidden">
        <div className="relative shadow-2xl rounded-md overflow-hidden border border-[#21242d] bg-[#000000] max-h-full max-w-full flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="block object-contain"
            style={{
              maxHeight: "calc(100vh - 24rem)",
              maxWidth: "100%",
              width: "auto",
              height: "auto",
              aspectRatio: aspectRatio.replace(":", " / "),
            }}
          />
        </div>
      </div>

      {/* Bottom Transport Strip */}
      <div className="h-11 border-t border-[#1b1d24] bg-[#111317] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentTime(0)}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-[#1f222b] transition-colors"
            title="Awal (Home)"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`h-7 px-3 flex items-center gap-1.5 rounded font-medium text-xs transition-all ${
              isPlaying
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30"
            }`}
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <>
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                <span>Pause</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Play</span>
              </>
            )}
          </button>

          <button
            onClick={() => setCurrentTime(duration)}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-[#1f222b] transition-colors"
            title="Akhir (End)"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* Scrubber slider */}
        <div className="flex-1 mx-4 relative flex items-center">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.05}
            value={currentTime}
            onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
            className="w-full h-1 bg-[#232732] rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="text-[11px] font-mono text-gray-500">
          30 FPS
        </div>
      </div>
    </div>
  );
}
