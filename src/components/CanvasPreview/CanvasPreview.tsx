import { useState, useRef, useEffect, useCallback } from "react";
import { useProjectStore, Clip, Track } from "../../stores/projectStore";
import { playSpokenSpeech } from "../../services/naturalTts";

export default function CanvasPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const mediaCacheRef = useRef<Map<string, HTMLImageElement | HTMLVideoElement | HTMLAudioElement>>(new Map());

  const tracks = useProjectStore((s) => s.timeline.tracks);
  const currentTime = useProjectStore((s) => s.currentTime);
  const duration = useProjectStore((s) => s.meta.duration);
  const setCurrentTime = useProjectStore((s) => s.setCurrentTime);
  const aspectRatio = useProjectStore((s) => s.meta.aspect_ratio || "16:9");
  const resolution = useProjectStore((s) => s.meta.resolution || { width: 1920, height: 1080 });

  const isPlaying = useProjectStore((s) => s.isPlaying);
  const setIsPlaying = useProjectStore((s) => s.setIsPlaying);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const spokenSubtitleRef = useRef<Set<string>>(new Set());

  // Shortcut keyboard spasi untuk Play / Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        const nextState = !isPlayingRef.current;
        if (!nextState) {
          if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        } else {
          spokenSubtitleRef.current.clear();
          lastTimeRef.current = performance.now();
        }
        setIsPlaying(nextState);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsPlaying]);
  const [zoomScale, setZoomScale] = useState<number>(1); // 1 = 100% (Fit)
  const [isEditingZoom, setIsEditingZoom] = useState(false);
  const [zoomInputText, setZoomInputText] = useState("100");
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ startX: number; startY: number; initPanX: number; initPanY: number } | null>(null);

  // Helper untuk memeriksa apakah URL atau base64 merupakan media video
  const isVideoSource = (source: string) => {
    return (
      source.startsWith("data:video/") ||
      source.includes(".mp4") ||
      source.includes(".webm") ||
      source.includes(".mov") ||
      source.includes(".mkv")
    );
  };

  // Helper untuk mendapatkan / me-load elemen Image, Video, atau Audio
  const getMediaElement = useCallback((source: string, declaredType: "image" | "video" | "audio") => {
    // Deteksi tipe aktual: jika di track image tapi URL adalah video, gunakan video element
    const actualType = declaredType === "audio" ? "audio" : isVideoSource(source) ? "video" : "image";

    let el = mediaCacheRef.current.get(source);
    if (!el) {
      if (actualType === "image") {
        const img = new Image();
        img.src = source;
        mediaCacheRef.current.set(source, img);
        el = img;
      } else if (actualType === "video") {
        const vid = document.createElement("video");
        vid.src = source;
        vid.crossOrigin = "anonymous";
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = "auto";
        vid.loop = true;
        mediaCacheRef.current.set(source, vid);
        el = vid;
      } else if (actualType === "audio") {
        const aud = document.createElement("audio");
        aud.src = source;
        aud.preload = "auto";
        mediaCacheRef.current.set(source, aud);
        el = aud;
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
      if (track.visible === false) continue; // Hormati flag layer hidden
      for (const clip of track.clips) {
        if (currentTime >= clip.start && currentTime <= clip.end) {
          activeClips.push({ clip, track });
        }
      }
    }

    // 1. Sinkronisasi Pemutaran Audio Track (MP3 / WAV / BGM)
    for (const track of tracks) {
      if (track.type === "audio") {
        for (const clip of track.clips) {
          if (clip.source) {
            const audio = getMediaElement(clip.source, "audio") as HTMLAudioElement;
            if (audio) {
              const isCurrentlyActive = currentTime >= clip.start && currentTime <= clip.end;

              // Matikan audio jika track dimute atau disembunyikan
              if (track.muted || track.visible === false) {
                if (!audio.paused) audio.pause();
                continue;
              }

              if (isCurrentlyActive && isPlaying) {
                const targetTime = currentTime - clip.start + (clip.source_start || 0);
                // Hanya resync jika drift waktu cukup besar (> 0.6 detik) agar audio tidak tersendat/stutter
                if (Math.abs(audio.currentTime - targetTime) > 0.6) {
                  audio.currentTime = Math.max(0, targetTime);
                }
                audio.volume = clip.volume ?? 1.0;
                if (audio.paused) {
                  audio.play().catch(() => {});
                }
              } else {
                if (!audio.paused) {
                  audio.pause();
                }
              }
            }
          }
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

    // 2. Render visual layers (Video & Image)
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

    // 3. Subtitle Rendering & Live Spoken Speech
    for (const { clip, track } of activeClips) {
      if (track.type === "subtitle" && clip.text) {
        // Jika sedang play dan subtitle ini belum dibacakan suaranya di sesi play saat ini
        if (isPlaying && !spokenSubtitleRef.current.has(clip.id)) {
          spokenSubtitleRef.current.add(clip.id);
          // Cek apakah ada klip audio bersamaan di timeline untuk dialog ini yang sumber audionya valid dan dapat diputar
          const hasLinkedAudioClip = tracks.some(
            (t) =>
              t.type === "audio" &&
              t.clips.some((c) => {
                if (Math.abs(c.start - clip.start) < 0.25 && c.source) {
                  // Jika klip audio mengarah ke dummy file yang tidak ada, jangan anggap playable audio
                  return !c.source.startsWith("cache/audio/") && !c.source.startsWith("mock");
                }
                return false;
              })
          );

          // Jalankan speech synthesis jika tidak ada klip audio playable di timeline
          if (!hasLinkedAudioClip) {
            const cleanSpeechText = clip.text.replace(/^\[.*?\]:\s*/, "");
            playSpokenSpeech(cleanSpeechText, "id-ID", 1.0);
          }
        }

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
    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const deltaSec = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      if (isPlayingRef.current) {
        const nextTime = currentTimeRef.current + deltaSec;
        if (nextTime >= duration) {
          currentTimeRef.current = 0;
          setCurrentTime(0);
          setIsPlaying(false);
          isPlayingRef.current = false;
        } else {
          currentTimeRef.current = nextTime;
          setCurrentTime(nextTime);
        }
      }

      renderFrame();
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [duration, renderFrame, setCurrentTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const f = Math.floor((seconds % 1) * 30);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}:${f.toString().padStart(2, "0")}`;
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-[#0b0c0e] select-none">
      {/* Top Monitor Bar */}
      <div className="h-8 border-b border-[#1b1d24] px-4 flex items-center justify-between text-[11px] text-gray-400 shrink-0 bg-[#0e1014]">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-200">Player Monitor</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#171920] border border-[#242731] text-cyan-400 font-mono">
            {aspectRatio}
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            {resolution.width}×{resolution.height}
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500">Zoom:</span>
          <button
            onClick={() => setZoomScale((z) => Math.max(0.25, parseFloat((z - 0.25).toFixed(2))))}
            className="w-5 h-5 flex items-center justify-center rounded bg-[#181a24] hover:bg-[#252936] text-gray-300 border border-[#272b38] text-xs font-bold"
            title="Zoom Out (-)"
          >
            -
          </button>

          {/* Editable Zoom Percentage Input */}
          {isEditingZoom ? (
            <input
              type="text"
              autoFocus
              value={zoomInputText}
              onChange={(e) => setZoomInputText(e.target.value.replace(/[^0-9]/g, ""))}
              onBlur={() => {
                const val = parseInt(zoomInputText, 10);
                if (!isNaN(val) && val >= 10 && val <= 500) {
                  setZoomScale(parseFloat((val / 100).toFixed(2)));
                } else if (!isNaN(val) && val < 10) {
                  setZoomScale(0.1);
                } else if (!isNaN(val) && val > 500) {
                  setZoomScale(5);
                }
                setIsEditingZoom(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = parseInt(zoomInputText, 10);
                  if (!isNaN(val) && val >= 10 && val <= 500) {
                    setZoomScale(parseFloat((val / 100).toFixed(2)));
                  } else if (!isNaN(val) && val < 10) {
                    setZoomScale(0.1);
                  } else if (!isNaN(val) && val > 500) {
                    setZoomScale(5);
                  }
                  setIsEditingZoom(false);
                } else if (e.key === "Escape") {
                  setIsEditingZoom(false);
                }
              }}
              className="font-mono text-[10px] text-cyan-300 w-12 text-center bg-[#090b10] px-1 py-0.5 rounded border border-cyan-500 outline-none"
            />
          ) : (
            <span
              onClick={() => {
                setZoomInputText(String(Math.round(zoomScale * 100)));
                setIsEditingZoom(true);
              }}
              className="font-mono text-[10px] text-cyan-400 w-12 text-center bg-[#12141c] hover:bg-[#1a1d28] hover:border-cyan-500/60 cursor-pointer px-1 py-0.5 rounded border border-[#1f2330] transition-colors"
              title="Klik untuk mengetik persentase zoom (10% - 500%)"
            >
              {Math.round(zoomScale * 100)}%
            </span>
          )}

          <button
            onClick={() => setZoomScale((z) => Math.min(5, parseFloat((z + 0.25).toFixed(2))))}
            className="w-5 h-5 flex items-center justify-center rounded bg-[#181a24] hover:bg-[#252936] text-gray-300 border border-[#272b38] text-xs font-bold"
            title="Zoom In (+)"
          >
            +
          </button>
          <button
            onClick={() => {
              setZoomScale(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            className="px-2 py-0.5 rounded bg-[#181a24] hover:bg-[#252936] text-[10px] text-gray-300 border border-[#272b38]"
            title="Kembalikan ke Ukuran Normal (Fit 100%)"
          >
            Fit (100%)
          </button>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-cyan-400 font-bold">{formatTime(currentTime)}</span>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Canvas Viewport (Mendukung Zoom & Drag Pan) */}
      <div
        className="flex-1 flex items-center justify-center p-4 min-h-0 min-w-0 relative overflow-hidden bg-[#07080a] cursor-default"
        onWheel={(e) => {
          // Zoom dengan mouse wheel ketika kursor berada di atas area canvas
          if (e.ctrlKey || e.metaKey || e.altKey) {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.15 : -0.15;
            setZoomScale((z) => Math.max(0.25, Math.min(4, parseFloat((z + delta).toFixed(2)))));
          }
        }}
        onMouseDown={(e) => {
          // Klik tengah atau tahan klik saat zoom > 1 untuk menggeser (Pan)
          if (e.button === 1 || zoomScale > 1) {
            setIsPanning(true);
            panStartRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              initPanX: panOffset.x,
              initPanY: panOffset.y,
            };
          }
        }}
        onMouseMove={(e) => {
          if (isPanning && panStartRef.current) {
            const dx = e.clientX - panStartRef.current.startX;
            const dy = e.clientY - panStartRef.current.startY;
            setPanOffset({
              x: panStartRef.current.initPanX + dx,
              y: panStartRef.current.initPanY + dy,
            });
          }
        }}
        onMouseUp={() => {
          setIsPanning(false);
          panStartRef.current = null;
        }}
        onMouseLeave={() => {
          setIsPanning(false);
          panStartRef.current = null;
        }}
      >
        <div
          className={`relative shadow-2xl rounded-md overflow-hidden border border-[#21242d] bg-[#000000] flex items-center justify-center transition-transform ${
            isPanning ? "cursor-grabbing" : zoomScale > 1 ? "cursor-grab" : ""
          }`}
          style={{
            aspectRatio: aspectRatio.replace(":", " / "),
            maxHeight: "100%",
            maxWidth: "100%",
            height: aspectRatio === "9:16" || aspectRatio === "4:5" ? "100%" : "auto",
            width: aspectRatio === "9:16" || aspectRatio === "4:5" ? "auto" : "100%",
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
            transformOrigin: "center center",
          }}
        >
          <canvas
            ref={canvasRef}
            width={resolution.width || (aspectRatio === "9:16" ? 1080 : 1920)}
            height={resolution.height || (aspectRatio === "9:16" ? 1920 : 1080)}
            className="w-full h-full object-contain block pointer-events-none"
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
            onClick={() => {
              const nextState = !isPlaying;
              if (!nextState) {
                if ("speechSynthesis" in window) window.speechSynthesis.cancel();
              } else {
                spokenSubtitleRef.current.clear();
                lastTimeRef.current = performance.now();
              }
              setIsPlaying(nextState);
            }}
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
