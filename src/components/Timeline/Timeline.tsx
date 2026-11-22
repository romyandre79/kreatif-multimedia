import { useRef, useState, useEffect, useCallback } from "react";
import { useProjectStore, Clip } from "../../stores/projectStore";
import InternalAudioEditorModal from "../InternalEditor/InternalAudioEditorModal";
import InternalImageEditorModal from "../InternalEditor/InternalImageEditorModal";
import InternalSubtitleEditorModal from "../InternalEditor/InternalSubtitleEditorModal";

const TRACK_STYLES: Record<string, { bg: string; border: string; glow: string; text: string }> = {
  video: { bg: "bg-[#18314a]/90", border: "border-[#2b5d8f]", glow: "shadow-blue-500/20", text: "text-blue-300" },
  image: { bg: "bg-[#163832]/90", border: "border-[#276e5f]", glow: "shadow-emerald-500/20", text: "text-emerald-300" },
  subtitle: { bg: "bg-[#3e2e13]/90", border: "border-[#7a591e]", glow: "shadow-amber-500/20", text: "text-amber-300" },
  audio: { bg: "bg-[#2d1b46]/90", border: "border-[#5b3291]", glow: "shadow-purple-500/20", text: "text-purple-300" },
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
  const isPlaying = useProjectStore((s) => s.isPlaying);
  const setIsPlaying = useProjectStore((s) => s.setIsPlaying);

  const setCurrentTime = useProjectStore((s) => s.setCurrentTime);
  const setSelectedClipId = useProjectStore((s) => s.setSelectedClipId);
  const setZoomLevel = useProjectStore((s) => s.setZoomLevel);
  const addTrack = useProjectStore((s) => s.addTrack);
  const updateTrack = useProjectStore((s) => s.updateTrack);
  const removeTrack = useProjectStore((s) => s.removeTrack);
  const reorderTracks = useProjectStore((s) => s.reorderTracks);
  const updateClipPosition = useProjectStore((s) => s.updateClipPosition);
  const trimClip = useProjectStore((s) => s.trimClip);
  const splitClipAtTime = useProjectStore((s) => s.splitClipAtTime);
  const deleteSelectedClip = useProjectStore((s) => s.deleteSelectedClip);

  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingTrackName, setEditingTrackName] = useState<string>("");

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const trackHeadersRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [dragState, setDragState] = useState<{
    type: "move" | "trim-left" | "trim-right";
    clipId: string;
    originX: number;
    initialStart: number;
    initialEnd: number;
    targetTrackId?: string;
  } | null>(null);

  // State untuk modal Internal Editor saat klip di-double click
  const [editingClipInfo, setEditingClipInfo] = useState<{
    clip: Clip;
    trackType: string;
  } | null>(null);

  const pixelsPerSecond = zoomLevel;
  const timelineWidth = Math.max(duration * pixelsPerSecond, 1400);

  const calculateSnappedTime = useCallback(
    (targetTime: number, excludeClipId?: string): number => {
      const snapThresholdSec = 10 / pixelsPerSecond;
      const snapPoints = [currentTime];

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

  const step = zoomLevel >= 60 ? 1 : zoomLevel >= 25 ? 5 : 10;
  const markers: number[] = [];
  for (let t = 0; t <= duration + 30; t += step) {
    markers.push(t);
  }

  return (
    <div className="flex flex-col h-full bg-[#111317] border-t border-[#1f222b] select-none text-gray-300">
      {/* Timeline Quick Bar */}
      <div className="h-9 px-3 border-b border-[#1b1d24] bg-[#14161c] flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          {/* Play/Pause Button in Timeline Quick Bar */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-medium transition-all ${
              isPlaying
                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/30"
            }`}
            title="Play / Pause Timeline (Spasi)"
          >
            {isPlaying ? (
              <>
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                <span className="text-[11px]">Pause</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span className="text-[11px]">Play</span>
              </>
            )}
          </button>

          <div className="w-px h-3.5 bg-[#252834] mx-0.5" />

          {/* Split Button */}
          <button
            onClick={() => selectedClipId && splitClipAtTime(selectedClipId, currentTime)}
            disabled={!selectedClipId}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1c1f27] hover:bg-[#252934] text-gray-300 border border-[#272b36] disabled:opacity-30 disabled:hover:bg-[#1c1f27] transition-all"
            title="Split Klip pada Playhead (S)"
          >
            <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
            </svg>
            <span className="text-[11px] font-medium">Split</span>
            <kbd className="text-[9px] text-gray-500 font-mono ml-0.5">S</kbd>
          </button>

          {/* Delete Button */}
          <button
            onClick={deleteSelectedClip}
            disabled={!selectedClipId}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#201416] hover:bg-[#321d20] text-red-300 border border-[#441f23] disabled:opacity-30 disabled:hover:bg-[#201416] transition-all"
            title="Hapus Klip (Delete)"
          >
            <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-[11px] font-medium">Hapus</span>
          </button>
        </div>

        {/* Right Tools (Zoom & Add Track) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-[10px]">Zoom</span>
            <input
              type="range"
              min={15}
              max={100}
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseInt(e.target.value))}
              className="w-20 h-1 bg-[#232732] rounded appearance-none cursor-pointer"
            />
          </div>

          <div className="w-px h-3.5 bg-[#252834]" />

          <div className="flex items-center gap-1">
            <button
              onClick={() => addTrack("video")}
              className="text-[10px] px-2 py-0.5 rounded bg-[#162130] hover:bg-[#1f3148] text-blue-300 border border-[#21354f]"
            >
              + Video
            </button>
            <button
              onClick={() => addTrack("image")}
              className="text-[10px] px-2 py-0.5 rounded bg-[#132622] hover:bg-[#1a3832] text-emerald-300 border border-[#1b3d36]"
            >
              + Gambar
            </button>
            <button
              onClick={() => addTrack("audio")}
              className="text-[10px] px-2 py-0.5 rounded bg-[#231733] hover:bg-[#34224c] text-purple-300 border border-[#3b2359]"
            >
              + Audio
            </button>
            <button
              onClick={() => addTrack("subtitle")}
              className="text-[10px] px-2 py-0.5 rounded bg-[#291f11] hover:bg-[#3d2f19] text-amber-300 border border-[#48371c]"
            >
              + Subtitle
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Main Canvas */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Track Headers (Layer CRUD & Controls) */}
        <div className="w-56 shrink-0 border-r border-[#1b1d24] bg-[#13151a] flex flex-col z-20">
          <div className="h-6 border-b border-[#1b1d24] px-3 flex items-center justify-between text-[10px] text-gray-500 font-semibold tracking-wider uppercase shrink-0">
            <span>Layers ({tracks.length})</span>
            <span className="text-[9px] text-gray-600 font-normal">Reorder / Mute / Del</span>
          </div>
          <div
            ref={trackHeadersRef}
            className="flex-1 overflow-y-hidden"
            onWheel={(e) => {
              if (timelineContainerRef.current) {
                timelineContainerRef.current.scrollTop += e.deltaY;
              }
            }}
          >
            {tracks.map((track, index) => {
              const isEditing = editingTrackId === track.id;
              const isFirst = index === 0;
              const isLast = index === tracks.length - 1;

              return (
                <div
                  key={track.id}
                  className={`h-12 border-b border-[#1c1e27] px-2.5 flex items-center justify-between text-xs transition-colors group ${
                    track.visible === false ? "bg-[#111217] opacity-60" : "bg-[#14161c] hover:bg-[#181a22]"
                  }`}
                >
                  {/* Left: Icon & Name (Editable) */}
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                    <span className="text-xs shrink-0 select-none" title={track.type}>
                      {TRACK_ICONS[track.type]}
                    </span>

                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingTrackName}
                        onChange={(e) => setEditingTrackName(e.target.value)}
                        onBlur={() => {
                          if (editingTrackName.trim()) {
                            updateTrack(track.id, { name: editingTrackName.trim() });
                          }
                          setEditingTrackId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (editingTrackName.trim()) {
                              updateTrack(track.id, { name: editingTrackName.trim() });
                            }
                            setEditingTrackId(null);
                          } else if (e.key === "Escape") {
                            setEditingTrackId(null);
                          }
                        }}
                        className="bg-[#0b0c10] border border-cyan-500 rounded px-1.5 py-0.5 text-[11px] text-white w-full outline-none"
                      />
                    ) : (
                      <span
                        onDoubleClick={() => {
                          setEditingTrackId(track.id);
                          setEditingTrackName(track.name);
                        }}
                        className="truncate text-[11px] font-medium text-gray-300 hover:text-white cursor-pointer select-none"
                        title="Klik 2x untuk ubah nama layer"
                      >
                        {track.name}
                      </span>
                    )}
                  </div>

                  {/* Right: Layer Controls (Up/Down, Mute/Visible, Delete) */}
                  <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    {/* Reorder Up */}
                    <button
                      onClick={() => !isFirst && reorderTracks(index, index - 1)}
                      disabled={isFirst}
                      className="p-1 rounded hover:bg-[#252834] text-gray-500 hover:text-gray-200 disabled:opacity-20 text-[10px]"
                      title="Pindahkan Layer ke Atas"
                    >
                      ▲
                    </button>

                    {/* Reorder Down */}
                    <button
                      onClick={() => !isLast && reorderTracks(index, index + 1)}
                      disabled={isLast}
                      className="p-1 rounded hover:bg-[#252834] text-gray-500 hover:text-gray-200 disabled:opacity-20 text-[10px]"
                      title="Pindahkan Layer ke Bawah"
                    >
                      ▼
                    </button>

                    {/* Visibility Toggle */}
                    <button
                      onClick={() => updateTrack(track.id, { visible: track.visible === false ? true : false })}
                      className={`p-1 rounded hover:bg-[#252834] text-[11px] transition-colors ${
                        track.visible === false ? "text-red-400" : "text-gray-400 hover:text-white"
                      }`}
                      title={track.visible === false ? "Tampilkan Layer" : "Sembunyikan Layer"}
                    >
                      {track.visible === false ? "🙈" : "👁️"}
                    </button>

                    {/* Audio Mute Toggle (khusus layer audio) */}
                    {track.type === "audio" && (
                      <button
                        onClick={() => updateTrack(track.id, { muted: !track.muted })}
                        className={`p-1 rounded hover:bg-[#252834] text-[11px] transition-colors ${
                          track.muted ? "text-red-400" : "text-gray-400 hover:text-white"
                        }`}
                        title={track.muted ? "Unmute Layer Audio" : "Mute Layer Audio"}
                      >
                        {track.muted ? "🔇" : "🔊"}
                      </button>
                    )}

                    {/* Delete Track (dengan konfirmasi jika ada klip) */}
                    <button
                      onClick={() => {
                        if (track.clips.length > 0) {
                          if (
                            !window.confirm(
                              `Hapus "${track.name}" beserta ${track.clips.length} klip di dalamnya?`
                            )
                          ) {
                            return;
                          }
                        }
                        removeTrack(track.id);
                      }}
                      className="p-1 rounded hover:bg-red-950/40 text-gray-500 hover:text-red-400 text-[11px] transition-colors"
                      title="Hapus Layer Ini"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable Tracks Area */}
        <div
          ref={timelineContainerRef}
          onScroll={(e) => {
            // Sinkronkan vertical scroll posisi layer header kiri dengan timeline canvas
            if (trackHeadersRef.current) {
              trackHeadersRef.current.scrollTop = e.currentTarget.scrollTop;
            }
          }}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#0c0d10]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedClipId(null);
            }
          }}
        >
          <div style={{ width: timelineWidth }} className="relative min-h-full">
            {/* Time Ruler */}
            <div
              className="h-6 border-b border-[#1b1d24] bg-[#121419] sticky top-0 z-30 cursor-pointer flex items-end"
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
                  className="absolute bottom-0 text-[9px] text-gray-500 font-mono pointer-events-none"
                  style={{ left: t * pixelsPerSecond }}
                >
                  <div className="h-1.5 w-px bg-[#2a2e3b] mb-0.5" />
                  <span className="px-1">{t}s</span>
                </div>
              ))}
            </div>

            {/* Cyan Playhead */}
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none"
              style={{ left: currentTime * pixelsPerSecond }}
            >
              <div className="w-px h-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <div className="w-2.5 h-3 bg-cyan-400 -ml-[4.5px] -mt-6 rounded-b-sm" />
            </div>

            {/* Tracks */}
            <div>
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="h-12 relative border-b border-[#171922] bg-[#0e1014]/60 hover:bg-[#12141a]/60"
                >
                  {track.clips.map((clip) => {
                    const left = clip.start * pixelsPerSecond;
                    const width = Math.max((clip.end - clip.start) * pixelsPerSecond, 14);
                    const isSelected = selectedClipId === clip.id;
                    const style = TRACK_STYLES[track.type] || TRACK_STYLES.video;

                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                          setEditingClipInfo({ clip, trackType: track.type });
                        }}
                        title={`Double-click untuk buka Editor Internal (${track.type})`}
                        onMouseDown={(e) => {
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
                        className={`absolute top-1.5 h-9 rounded-md border text-xs cursor-grab active:cursor-grabbing
                          flex items-center overflow-hidden transition-shadow select-none
                          ${style.bg} ${style.border} ${
                          isSelected
                            ? "ring-2 ring-cyan-400 border-cyan-400 shadow-lg " + style.glow
                            : "hover:border-white/50"
                        }`}
                        style={{ left, width }}
                      >
                        {/* Trim Handle Left */}
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
                          className="w-2 h-full cursor-ew-resize bg-black/30 hover:bg-white/40 shrink-0 flex items-center justify-center"
                        />

                        {/* Clip Content */}
                        <div className="flex-1 px-2 min-w-0 pointer-events-none truncate">
                          <p className={`font-semibold truncate text-[11px] ${style.text}`}>
                            {clip.source?.split("/").pop() || clip.text || "Untitled Clip"}
                          </p>
                          <p className="text-[9px] text-gray-400 font-mono">
                            {(clip.end - clip.start).toFixed(1)}s
                          </p>
                        </div>

                        {/* Trim Handle Right */}
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
                          className="w-2 h-full cursor-ew-resize bg-black/30 hover:bg-white/40 shrink-0 flex items-center justify-center"
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Modals Editor Internal Sesuai Tipe Klip */}
      {editingClipInfo && editingClipInfo.trackType === "audio" && (
        <InternalAudioEditorModal
          clip={editingClipInfo.clip}
          trackType={editingClipInfo.trackType}
          onClose={() => setEditingClipInfo(null)}
        />
      )}
      {editingClipInfo && (editingClipInfo.trackType === "image" || editingClipInfo.trackType === "video") && (
        <InternalImageEditorModal
          clip={editingClipInfo.clip}
          trackType={editingClipInfo.trackType}
          onClose={() => setEditingClipInfo(null)}
        />
      )}
      {editingClipInfo && editingClipInfo.trackType === "subtitle" && (
        <InternalSubtitleEditorModal
          clip={editingClipInfo.clip}
          trackType={editingClipInfo.trackType}
          onClose={() => setEditingClipInfo(null)}
        />
      )}
    </div>
  );
}
