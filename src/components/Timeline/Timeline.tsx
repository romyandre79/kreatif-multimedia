import { useRef, useState, useEffect, useCallback } from "react";
import { useProjectStore } from "../../stores/projectStore";

const TRACK_COLORS: Record<string, { bg: string; border: string; active: string }> = {
  video: { bg: "bg-blue-600/70", border: "border-blue-400", active: "ring-2 ring-blue-300" },
  image: { bg: "bg-emerald-600/70", border: "border-emerald-400", active: "ring-2 ring-emerald-300" },
  subtitle: { bg: "bg-amber-600/70", border: "border-amber-400", active: "ring-2 ring-amber-300" },
  audio: { bg: "bg-purple-600/70", border: "border-purple-400", active: "ring-2 ring-purple-300" },
};

const TRACK_ICONS: Record<string, string> = {
  video: "🎬",
  image: "🖼️",
  subtitle: "💬",
  audio: "🎵",
};

export default function Timeline() {
  const tracks = useProjectStore((s) => s.timeline.tracks);
  const currentTime = useProjectStore((s) => s.currentTime);
  const duration = useProjectStore((s) => s.meta.duration);
  const zoomLevel = useProjectStore((s) => s.zoomLevel);
  const selectedClipId = useProjectStore((s) => s.selectedClipId);

  const setCurrentTime = useProjectStore((s) => s.setCurrentTime);
  const setSelectedClipId = useProjectStore((s) => s.setSelectedClipId);
  const setZoomLevel = useProjectStore((s) => s.setZoomLevel);
  const addTrack = useProjectStore((s) => s.addTrack);
  const updateClipPosition = useProjectStore((s) => s.updateClipPosition);
  const trimClip = useProjectStore((s) => s.trimClip);
  const splitClipAtTime = useProjectStore((s) => s.splitClipAtTime);
  const deleteSelectedClip = useProjectStore((s) => s.deleteSelectedClip);

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [dragState, setDragState] = useState<{
    type: "move" | "trim-left" | "trim-right";
    clipId: string;
    originX: number;
    initialStart: number;
    initialEnd: number;
    targetTrackId?: string;
  } | null>(null);

  const pixelsPerSecond = zoomLevel;
  const timelineWidth = Math.max(duration * pixelsPerSecond, 1200);

  // Perhitungan snapping magnetic (snap ke playhead atau tepi clip lain dalam toleransi 8px)
  const calculateSnappedTime = useCallback(
    (targetTime: number, excludeClipId?: string): number => {
      const snapThresholdSec = 8 / pixelsPerSecond; // 8 pixels
      const snapPoints = [currentTime]; // Snap ke playhead

      // Kumpulkan semua titik awal & akhir clip lain
      for (const tr of tracks) {
        for (const cl of tr.clips) {
          if (cl.id !== excludeClipId) {
            snapPoints.push(cl.start);
            snapPoints.push(cl.end);
          }
        }
      }

      for (const point of snapPoints) {
        if (Math.abs(targetTime - point) <= snapThresholdSec) {
          return point;
        }
      }

      return targetTime;
    },
    [tracks, currentTime, pixelsPerSecond]
  );

  // Mouse drag global handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isScrubbing && timelineContainerRef.current) {
        const rect = timelineContainerRef.current.getBoundingClientRect();
        const scrollLeft = timelineContainerRef.current.scrollLeft;
        const clickX = e.clientX - rect.left + scrollLeft;
        const newTime = Math.max(0, clickX / pixelsPerSecond);
        setCurrentTime(newTime);
        return;
      }

      if (!dragState) return;

      const deltaX = e.clientX - dragState.originX;
      const deltaTime = deltaX / pixelsPerSecond;

      if (dragState.type === "move") {
        const rawNewStart = dragState.initialStart + deltaTime;
        const snappedStart = calculateSnappedTime(Math.max(0, rawNewStart), dragState.clipId);
        updateClipPosition(dragState.clipId, snappedStart, dragState.targetTrackId);
      } else if (dragState.type === "trim-left") {
        const rawNewStart = dragState.initialStart + deltaTime;
        const snappedStart = calculateSnappedTime(rawNewStart, dragState.clipId);
        trimClip(dragState.clipId, "left", snappedStart);
      } else if (dragState.type === "trim-right") {
        const rawNewEnd = dragState.initialEnd + deltaTime;
        const snappedEnd = calculateSnappedTime(rawNewEnd, dragState.clipId);
        trimClip(dragState.clipId, "right", snappedEnd);
      }
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      setDragState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isScrubbing,
    dragState,
    pixelsPerSecond,
    calculateSnappedTime,
    setCurrentTime,
    updateClipPosition,
    trimClip,
  ]);

  // Keyboard shortcut listener (Delete klip, Split dengan 'S')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedClipId) {
        deleteSelectedClip();
      } else if (e.key.toLowerCase() === "s" && selectedClipId) {
        splitClipAtTime(selectedClipId, currentTime);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedClipId, currentTime, deleteSelectedClip, splitClipAtTime]);

  // Generate skala waktu ruler (interval dinamis berdasarkan zoom level)
  const step = zoomLevel >= 60 ? 1 : zoomLevel >= 25 ? 5 : 10;
  const markers: number[] = [];
  for (let t = 0; t <= duration + 30; t += step) {
    markers.push(t);
  }

  return (
    <div className="flex flex-col h-full select-none text-gray-200">
      {/* Timeline Controls Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800 bg-gray-900/90 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-xs text-indigo-300">
            <span>🎞️ Multi-Track Timeline</span>
          </div>

          <div className="h-4 w-px bg-gray-700" />

          {/* Action Buttons */}
          <button
            onClick={() => selectedClipId && splitClipAtTime(selectedClipId, currentTime)}
            disabled={!selectedClipId}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700
              disabled:opacity-40 disabled:cursor-not-allowed border border-gray-700 transition-colors"
            title="Bagi klip pada posisi playhead (S)"
          >
            <span>✂️ Split</span>
            <kbd className="text-[9px] bg-gray-900 px-1 py-0.2 rounded text-gray-400">S</kbd>
          </button>

          <button
            onClick={deleteSelectedClip}
            disabled={!selectedClipId}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-red-950/40 text-red-300 hover:bg-red-900/60
              disabled:opacity-40 disabled:cursor-not-allowed border border-red-900/50 transition-colors"
            title="Hapus klip terpilih (Delete)"
          >
            <span>🗑️ Hapus</span>
          </button>
        </div>

        {/* Zoom & Add Track Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>🔍 Zoom:</span>
            <input
              type="range"
              min={10}
              max={100}
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseInt(e.target.value))}
              className="w-20 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="font-mono text-[10px] w-7">{zoomLevel}x</span>
          </div>

          <div className="h-4 w-px bg-gray-700" />

          <div className="flex items-center gap-1">
            <button
              onClick={() => addTrack("video")}
              className="text-[10px] px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded border border-blue-800/50 hover:bg-blue-800/50"
            >+ Video</button>
            <button
              onClick={() => addTrack("image")}
              className="text-[10px] px-2 py-0.5 bg-emerald-900/40 text-emerald-300 rounded border border-emerald-800/50 hover:bg-emerald-800/50"
            >+ Gambar</button>
            <button
              onClick={() => addTrack("audio")}
              className="text-[10px] px-2 py-0.5 bg-purple-900/40 text-purple-300 rounded border border-purple-800/50 hover:bg-purple-800/50"
            >+ Audio</button>
            <button
              onClick={() => addTrack("subtitle")}
              className="text-[10px] px-2 py-0.5 bg-amber-900/40 text-amber-300 rounded border border-amber-800/50 hover:bg-amber-800/50"
            >+ Subtitle</button>
          </div>
        </div>
      </div>

      {/* Timeline Workspace */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Track Headers Panel (Kiri, Sticky) */}
        <div className="w-44 shrink-0 border-r border-gray-800 bg-gray-900/95 flex flex-col z-20">
          {/* Header ruler space */}
          <div className="h-7 border-b border-gray-800 flex items-center px-2.5 text-[10px] text-gray-500 font-medium">
            TRACK LIST
          </div>
          <div className="flex-1 overflow-y-hidden">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="h-14 flex items-center justify-between px-2.5 border-b border-gray-800/60 bg-gray-900/50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{TRACK_ICONS[track.type] || "📁"}</span>
                  <div className="truncate">
                    <p className="text-xs font-medium text-gray-300 truncate">{track.name}</p>
                    <p className="text-[10px] text-gray-500 capitalize">{track.type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Tracks & Scrubber Area (Kanan, Scrollable) */}
        <div
          ref={timelineContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-gray-950/80"
          onClick={(e) => {
            // Unselect jika klik area kosong
            if (e.target === e.currentTarget) {
              setSelectedClipId(null);
            }
          }}
        >
          <div style={{ width: timelineWidth }} className="relative min-h-full">
            {/* Time Ruler (Atas) */}
            <div
              className="h-7 border-b border-gray-800 bg-gray-900/60 sticky top-0 z-30 cursor-pointer flex items-end"
              onMouseDown={(e) => {
                setIsScrubbing(true);
                const rect = e.currentTarget.getBoundingClientRect();
                const scrollLeft = timelineContainerRef.current?.scrollLeft || 0;
                const clickX = e.clientX - rect.left + scrollLeft;
                setCurrentTime(Math.max(0, clickX / pixelsPerSecond));
              }}
            >
              {markers.map((t) => (
                <div
                  key={t}
                  className="absolute bottom-0 text-[10px] text-gray-400 font-mono pointer-events-none"
                  style={{ left: t * pixelsPerSecond }}
                >
                  <div className="h-2 w-px bg-gray-600 mb-0.5" />
                  <span className="px-1">
                    {Math.floor(t / 60)}:{(t % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              ))}
            </div>

            {/* Red Playhead Line */}
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none"
              style={{ left: currentTime * pixelsPerSecond }}
            >
              <div className="w-px h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <div className="w-3.5 h-3.5 bg-red-500 -ml-[6px] -mt-7 rounded-sm rotate-45 transform" />
            </div>

            {/* Render Tracks & Clips */}
            <div>
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="h-14 relative border-b border-gray-800/40 bg-gray-900/20 group hover:bg-gray-800/20"
                >
                  {track.clips.map((clip) => {
                    const left = clip.start * pixelsPerSecond;
                    const width = Math.max((clip.end - clip.start) * pixelsPerSecond, 12);
                    const isSelected = selectedClipId === clip.id;
                    const styleConfig = TRACK_COLORS[track.type] || TRACK_COLORS.video;

                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                        }}
                        onMouseDown={(e) => {
                          // Mulai drag move jika bukan resize handle
                          if ((e.target as HTMLElement).dataset.handle) return;
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                          setDragState({
                            type: "move",
                            clipId: clip.id,
                            originX: e.clientX,
                            initialStart: clip.start,
                            initialEnd: clip.end,
                            targetTrackId: track.id,
                          });
                        }}
                        className={`absolute top-1.5 h-11 rounded-md border text-xs cursor-grab active:cursor-grabbing
                          transition-shadow shadow-md flex items-center overflow-hidden
                          ${styleConfig.bg} ${styleConfig.border} ${isSelected ? styleConfig.active : "hover:border-white/40"}`}
                        style={{ left, width }}
                      >
                        {/* Trim Handle Kiri */}
                        <div
                          data-handle="left"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedClipId(clip.id);
                            setDragState({
                              type: "trim-left",
                              clipId: clip.id,
                              originX: e.clientX,
                              initialStart: clip.start,
                              initialEnd: clip.end,
                            });
                          }}
                          className="w-2.5 h-full cursor-ew-resize bg-black/20 hover:bg-white/40 shrink-0 flex items-center justify-center transition-colors"
                          title="Tarik untuk memangkas awal (Trim in)"
                        >
                          <div className="w-0.5 h-4 bg-white/60 rounded" />
                        </div>

                        {/* Konten Klip */}
                        <div className="flex-1 px-2 min-w-0 pointer-events-none truncate">
                          <p className="font-medium text-white truncate text-[11px]">
                            {clip.source?.split("/").pop() || clip.text || "Klip Tanpa Judul"}
                          </p>
                          <p className="text-[9px] text-white/70 font-mono">
                            {(clip.end - clip.start).toFixed(1)}s ({clip.start.toFixed(1)}s - {clip.end.toFixed(1)}s)
                          </p>
                        </div>

                        {/* Trim Handle Kanan */}
                        <div
                          data-handle="right"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedClipId(clip.id);
                            setDragState({
                              type: "trim-right",
                              clipId: clip.id,
                              originX: e.clientX,
                              initialStart: clip.start,
                              initialEnd: clip.end,
                            });
                          }}
                          className="w-2.5 h-full cursor-ew-resize bg-black/20 hover:bg-white/40 shrink-0 flex items-center justify-center transition-colors"
                          title="Tarik untuk memangkas akhir (Trim out)"
                        >
                          <div className="w-0.5 h-4 bg-white/60 rounded" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
