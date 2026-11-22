import { useState, useRef, useEffect } from "react";
import { useProjectStore, Clip } from "../../stores/projectStore";

interface InternalAudioEditorModalProps {
  clip: Clip;
  trackType: string;
  onClose: () => void;
}

export default function InternalAudioEditorModal({
  clip,
  trackType,
  onClose,
}: InternalAudioEditorModalProps) {
  const updateClipProperties = useProjectStore((s) => s.updateClipProperties);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [volume, setVolume] = useState<number>(clip.volume ?? 1);
  const [fadeIn, setFadeIn] = useState<number>(clip.fade_in ?? 0);
  const [fadeOut, setFadeOut] = useState<number>(clip.fade_out ?? 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(clip.end - clip.start || 10);
  const [isLoop, setIsLoop] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Equalizer 3-band filter (Bass, Mid, Treble) simulated/saved
  const [bassGain, setBassGain] = useState<number>(0);
  const [midGain, setMidGain] = useState<number>(0);
  const [trebleGain, setTrebleGain] = useState<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const clipDuration = Math.max(0.1, clip.end - clip.start);

  // Setup Web Audio API node graph untuk real-time audio shaping
  useEffect(() => {
    if (!clip.source || !audioRef.current) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;

      if (!sourceNodeRef.current && audioRef.current) {
        sourceNodeRef.current = ctx.createMediaElementSource(audioRef.current);

        // Lowshelf for Bass (150Hz)
        bassFilterRef.current = ctx.createBiquadFilter();
        bassFilterRef.current.type = "lowshelf";
        bassFilterRef.current.frequency.value = 150;
        bassFilterRef.current.gain.value = bassGain;

        // Peaking for Mid (1000Hz)
        midFilterRef.current = ctx.createBiquadFilter();
        midFilterRef.current.type = "peaking";
        midFilterRef.current.frequency.value = 1000;
        midFilterRef.current.Q.value = 1.0;
        midFilterRef.current.gain.value = midGain;

        // Highshelf for Treble (3000Hz)
        trebleFilterRef.current = ctx.createBiquadFilter();
        trebleFilterRef.current.type = "highshelf";
        trebleFilterRef.current.frequency.value = 3000;
        trebleFilterRef.current.gain.value = trebleGain;

        gainNodeRef.current = ctx.createGain();
        gainNodeRef.current.gain.value = isMuted ? 0 : volume;

        // Connect graph
        sourceNodeRef.current
          .connect(bassFilterRef.current)
          .connect(midFilterRef.current)
          .connect(trebleFilterRef.current)
          .connect(gainNodeRef.current)
          .connect(ctx.destination);
      }
    } catch (err) {
      console.warn("WebAudio graph setup warning:", err);
    }

    return () => {
      // Audio element cleanup
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [clip.source]);

  // Sync Equalizer filters
  useEffect(() => {
    if (bassFilterRef.current) bassFilterRef.current.gain.value = bassGain;
  }, [bassGain]);

  useEffect(() => {
    if (midFilterRef.current) midFilterRef.current.gain.value = midGain;
  }, [midGain]);

  useEffect(() => {
    if (trebleFilterRef.current) trebleFilterRef.current.gain.value = trebleGain;
  }, [trebleGain]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Draw Audio Waveform Visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Background Waveform area
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(6, 182, 212, 0.4)");
    gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.8)");
    gradient.addColorStop(1, "rgba(147, 51, 234, 0.4)");

    const bars = 80;
    const barWidth = width / bars;
    const midY = height / 2;

    // Pseudo-waveform generated consistently based on clip ID and name
    const seed = (clip.id + (clip.source || "")).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);

    for (let i = 0; i < bars; i++) {
      const normalizedTime = (i / bars) * duration;
      // Hitung envelope fade-in dan fade-out visual
      let ampFade = 1.0;
      if (fadeIn > 0 && normalizedTime < fadeIn) {
        ampFade = normalizedTime / fadeIn;
      } else if (fadeOut > 0 && normalizedTime > duration - fadeOut) {
        ampFade = Math.max(0, (duration - normalizedTime) / fadeOut);
      }

      const wave1 = Math.sin((i + seed) * 0.45);
      const wave2 = Math.cos((i * 1.8 + seed) * 0.3);
      const wave3 = Math.sin((i * 3.2 + seed) * 0.7);
      const combined = (Math.abs(wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2) * 0.8 + 0.15) * ampFade * (volume / 1.5);
      const barHeight = Math.min(height * 0.9, combined * height);

      const x = i * barWidth;
      const isPlayed = normalizedTime <= currentTime;

      ctx.fillStyle = isPlayed ? "#38bdf8" : "#334155";
      ctx.fillRect(x + 1, midY - barHeight / 2, barWidth - 2, barHeight);
    }

    // Playhead Line
    const playheadX = (currentTime / (duration || 1)) * width;
    ctx.fillStyle = "#f43f5e";
    ctx.fillRect(playheadX - 1, 0, 2, height);

    // Fade-in boundary indicator
    if (fadeIn > 0) {
      const fiX = (fadeIn / duration) * width;
      ctx.strokeStyle = "rgba(34, 197, 94, 0.7)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(fiX, 0);
      ctx.lineTo(fiX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Fade-out boundary indicator
    if (fadeOut > 0) {
      const foX = ((duration - fadeOut) / duration) * width;
      ctx.strokeStyle = "rgba(239, 68, 68, 0.7)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(foX, 0);
      ctx.lineTo(foX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [currentTime, duration, volume, fadeIn, fadeOut, clip.id, clip.source]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleApplyChanges = () => {
    updateClipProperties(clip.id, {
      volume,
      fade_in: fadeIn,
      fade_out: fadeOut,
    });
    onClose();
  };

  const clipFileName = clip.source?.split("/").pop() || "Audio File";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#12141a] border border-[#232733] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#1c1f28] bg-[#161821] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400 text-lg border border-purple-500/20">
              🎛️
            </span>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Internal Audio Editor & Studio FX
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {trackType}
                </span>
              </h2>
              <p className="text-[11px] text-gray-400 truncate max-w-sm">
                Klip: <span className="text-gray-200 font-medium">{clipFileName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Audio Waveform Canvas */}
          <div className="rounded-xl bg-[#0c0d12] border border-[#1f222d] p-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
              <span className="font-mono text-cyan-400">
                {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
              </span>
              <div className="flex gap-2">
                {fadeIn > 0 && (
                  <span className="text-green-400 text-[10px] bg-green-950/60 px-1.5 py-0.5 rounded border border-green-800">
                    Fade In {fadeIn}s
                  </span>
                )}
                {fadeOut > 0 && (
                  <span className="text-rose-400 text-[10px] bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800">
                    Fade Out {fadeOut}s
                  </span>
                )}
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={600}
              height={100}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const newT = (clickX / rect.width) * duration;
                if (audioRef.current) {
                  audioRef.current.currentTime = newT;
                }
                setCurrentTime(newT);
              }}
              className="w-full h-24 rounded bg-[#08090c] cursor-pointer border border-[#161822]"
            />

            {/* Hidden native audio element for sound control */}
            {clip.source && (
              <audio
                ref={audioRef}
                src={clip.source}
                loop={isLoop}
                onTimeUpdate={() => {
                  if (audioRef.current) {
                    setCurrentTime(audioRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (audioRef.current && !isNaN(audioRef.current.duration)) {
                    setDuration(audioRef.current.duration);
                  }
                }}
                onEnded={() => setIsPlaying(false)}
              />
            )}

            {/* Transport Bar */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#1a1d26]">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-600/30"
                >
                  {isPlaying ? "⏸️ Jeda" : "▶️ Putar"}
                </button>
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = 0;
                    }
                    setCurrentTime(0);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1a1c24] hover:bg-[#252834] text-gray-300 text-xs border border-[#2b2f3d]"
                  title="Kembali ke Awal"
                >
                  ⏮️ Reset
                </button>
                <button
                  onClick={() => setIsLoop(!isLoop)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                    isLoop
                      ? "bg-purple-600/20 border-purple-500 text-purple-300 font-semibold"
                      : "bg-[#1a1c24] hover:bg-[#252834] border-[#2b2f3d] text-gray-400"
                  }`}
                  title="Ulangi Audio Terus-Menerus"
                >
                  🔁 Loop
                </button>
              </div>

              {/* Speed Rate */}
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span>Speed:</span>
                {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setPlaybackRate(rate)}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                      playbackRate === rate
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-[#161820] text-gray-400 hover:text-white"
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Volume & Fades */}
            <div className="rounded-xl bg-[#151720] border border-[#212532] p-3.5 space-y-3">
              <span className="font-semibold text-gray-200 text-xs flex items-center gap-1.5">
                🔊 Gain & Fade Envelope
              </span>

              {/* Master Volume */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-xs hover:text-white"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? "🔇" : "🔈"}
                    </button>
                    <span>Volume Audio</span>
                  </div>
                  <span className="font-mono text-cyan-400">
                    {isMuted ? "Muted" : `${Math.round(volume * 100)}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={volume}
                  disabled={isMuted}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#232734] rounded appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Fade In */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Fade In (Masuk Lembut)</span>
                  <span className="font-mono text-emerald-400">{fadeIn.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.min(5, clipDuration / 2)}
                  step="0.1"
                  value={fadeIn}
                  onChange={(e) => setFadeIn(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#232734] rounded appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Fade Out */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Fade Out (Keluar Perlahan)</span>
                  <span className="font-mono text-rose-400">{fadeOut.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.min(5, clipDuration / 2)}
                  step="0.1"
                  value={fadeOut}
                  onChange={(e) => setFadeOut(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#232734] rounded appearance-none cursor-pointer accent-rose-500"
                />
              </div>
            </div>

            {/* Equalizer (Tone Shaping) */}
            <div className="rounded-xl bg-[#151720] border border-[#212532] p-3.5 space-y-3">
              <span className="font-semibold text-gray-200 text-xs flex items-center gap-1.5">
                🎚️ 3-Band Equalizer (Tone FX)
              </span>

              {/* Bass Slider */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Bass (Low 150Hz)</span>
                  <span className="font-mono text-cyan-400">
                    {bassGain > 0 ? `+${bassGain}dB` : `${bassGain}dB`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="1"
                  value={bassGain}
                  onChange={(e) => setBassGain(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#232734] rounded appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Mid Slider */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Mid (Vokal 1kHz)</span>
                  <span className="font-mono text-purple-400">
                    {midGain > 0 ? `+${midGain}dB` : `${midGain}dB`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="1"
                  value={midGain}
                  onChange={(e) => setMidGain(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#232734] rounded appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              {/* Treble Slider */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Treble (High 3kHz)</span>
                  <span className="font-mono text-amber-400">
                    {trebleGain > 0 ? `+${trebleGain}dB` : `${trebleGain}dB`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="1"
                  value={trebleGain}
                  onChange={(e) => setTrebleGain(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#232734] rounded appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setBassGain(0);
                    setMidGain(0);
                    setTrebleGain(0);
                  }}
                  className="text-[10px] text-gray-400 hover:text-white underline"
                >
                  Reset EQ ke Netral
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-[#1c1f28] bg-[#161821] flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            Perubahan volume & fade tersimpan langsung ke klip timeline.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#20232e] hover:bg-[#292c3a] text-gray-300 text-xs font-medium transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleApplyChanges}
              className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition-all flex items-center gap-1.5"
            >
              💾 Simpan ke Klip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
