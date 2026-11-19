import { useProjectStore } from "../../stores/projectStore";

const TRACK_COLORS: Record<string, string> = {
  video: "bg-blue-600/60",
  image: "bg-green-600/60",
  subtitle: "bg-yellow-600/60",
  audio: "bg-purple-600/60",
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
  const addTrack = useProjectStore((s) => s.addTrack);

  const pixelsPerSecond = 30;
  const timelineWidth = Math.max(duration * pixelsPerSecond, 800);
  const playheadPosition = currentTime * pixelsPerSecond;

  // Generate time markers (every 5 seconds)
  const markers = [];
  for (let t = 0; t <= duration; t += 5) {
    markers.push(t);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Timeline Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800 bg-gray-900/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-300">🎞️ Timeline</span>
          <span className="text-[10px] text-gray-500">{tracks.length} tracks</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => addTrack("video")}
            className="text-[10px] px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded hover:bg-blue-800/50 transition-colors"
          >+ Video</button>
          <button
            onClick={() => addTrack("image")}
            className="text-[10px] px-2 py-0.5 bg-green-900/50 text-green-300 rounded hover:bg-green-800/50 transition-colors"
          >+ Gambar</button>
          <button
            onClick={() => addTrack("audio")}
            className="text-[10px] px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded hover:bg-purple-800/50 transition-colors"
          >+ Audio</button>
          <button
            onClick={() => addTrack("subtitle")}
            className="text-[10px] px-2 py-0.5 bg-yellow-900/50 text-yellow-300 rounded hover:bg-yellow-800/50 transition-colors"
          >+ Subtitle</button>
        </div>
      </div>

      {/* Timeline Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Track Labels (fixed left) */}
        <div className="w-36 shrink-0 border-r border-gray-800 bg-gray-900">
          {/* Ruler header space */}
          <div className="h-6 border-b border-gray-800" />
          {tracks.map((track) => (
            <div
              key={track.id}
              className="h-12 flex items-center px-2 gap-1.5 border-b border-gray-800/50 hover:bg-gray-800/30"
            >
              <span className="text-xs">{TRACK_ICONS[track.type] || "📁"}</span>
              <span className="text-xs text-gray-300 truncate">{track.name}</span>
            </div>
          ))}
        </div>

        {/* Scrollable Timeline Area */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div style={{ width: timelineWidth, minHeight: "100%" }} className="relative">
            {/* Time Ruler */}
            <div className="h-6 border-b border-gray-800 bg-gray-900/50 sticky top-0 z-10 flex items-end">
              {markers.map((t) => (
                <div
                  key={t}
                  className="absolute bottom-0 text-[9px] text-gray-500"
                  style={{ left: t * pixelsPerSecond }}
                >
                  <div className="h-2 w-px bg-gray-700 mb-0.5" />
                  {Math.floor(t / 60)}:{(t % 60).toString().padStart(2, "0")}
                </div>
              ))}
            </div>

            {/* Tracks */}
            {tracks.map((track) => (
              <div
                key={track.id}
                className="h-12 relative border-b border-gray-800/50"
              >
                {track.clips.map((clip) => {
                  const left = clip.start * pixelsPerSecond;
                  const width = (clip.end - clip.start) * pixelsPerSecond;
                  return (
                    <div
                      key={clip.id}
                      className={`absolute top-1 h-10 rounded-md border border-white/10 cursor-pointer
                        hover:brightness-125 transition-all ${TRACK_COLORS[track.type] || "bg-gray-600/60"}`}
                      style={{ left, width: Math.max(width, 4) }}
                      title={`${clip.source || clip.text || clip.id}\n${clip.start.toFixed(1)}s — ${clip.end.toFixed(1)}s`}
                    >
                      <div className="px-1.5 py-0.5 text-[9px] text-white/80 truncate h-full flex items-center">
                        {clip.source?.split("/").pop() || clip.text || clip.id}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
              style={{ left: playheadPosition }}
            >
              <div className="w-2.5 h-3 bg-red-500 -ml-[5px] rounded-b-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
