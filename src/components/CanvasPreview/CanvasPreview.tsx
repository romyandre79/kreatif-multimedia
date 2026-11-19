import { useState, useRef, useEffect } from "react";
import { useProjectStore } from "../../stores/projectStore";

export default function CanvasPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentTime = useProjectStore((s) => s.currentTime);
  const duration = useProjectStore((s) => s.meta.duration);
  const setCurrentTime = useProjectStore((s) => s.setCurrentTime);
  const aspectRatio = useProjectStore((s) => s.meta.aspect_ratio);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw placeholder canvas
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid pattern
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Center crosshair
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy);
    ctx.lineTo(cx + 20, cy);
    ctx.moveTo(cx, cy - 20);
    ctx.lineTo(cx, cy + 20);
    ctx.stroke();

    // Placeholder text
    ctx.fillStyle = "#475569";
    ctx.font = "14px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Canvas Preview — Import media untuk mulai", cx, cy + 50);
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText(`Rasio: ${aspectRatio}`, cx, cy + 72);
  }, [aspectRatio]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          className="max-w-full max-h-full rounded-lg border border-gray-800 shadow-2xl"
          style={{ aspectRatio: aspectRatio.replace(":", " / ") }}
        />
      </div>

      {/* Transport Controls */}
      <div className="px-4 pb-3 flex items-center gap-3">
        <span className="text-xs text-gray-400 font-mono w-20">
          {formatTime(currentTime)}
        </span>

        {/* Scrubber */}
        <div className="flex-1 relative h-1.5 group">
          <div className="absolute inset-0 bg-gray-700 rounded-full" />
          <div
            className="absolute left-0 top-0 h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={currentTime}
            onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>

        <span className="text-xs text-gray-400 font-mono w-20 text-right">
          {formatTime(duration)}
        </span>

        {/* Playback Buttons */}
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => setCurrentTime(0)}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Ke Awal"
          >⏮</button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button
            onClick={() => setCurrentTime(duration)}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Ke Akhir"
          >⏭</button>
        </div>
      </div>
    </div>
  );
}
