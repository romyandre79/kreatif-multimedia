import { useState, useRef, useEffect, useCallback } from "react";
import { useProjectStore, Clip, Track } from "../../stores/projectStore";
import { interpolateKeyframes, calculateSpeedRampedInternalTime } from "../../services/keyframe";
import { getCustomTextAnimations, evaluateCustomTextAnimation } from "../../services/customTextAnimation";
import { getCustomTransitions, evaluateTransitionTransform } from "../../services/customTransitions";
import { evaluateImageAnimation } from "../../services/imageAnimationPresets";
import { evaluateCameraTransform } from "../../services/cameraMotion";

export default function CanvasPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const mediaCacheRef = useRef<Map<string, HTMLImageElement | HTMLVideoElement | HTMLAudioElement>>(new Map());
  const chromaCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const tracks = useProjectStore((s) => s.timeline.tracks);
  const currentTime = useProjectStore((s) => s.currentTime);
  const duration = useProjectStore((s) => s.meta.duration);
  const setCurrentTime = useProjectStore((s) => s.setCurrentTime);
  const aspectRatio = useProjectStore((s) => s.meta.aspect_ratio || "16:9");
  const resolution = useProjectStore((s) => s.meta.resolution || { width: 1920, height: 1080 });
  const cameraConfig = useProjectStore((s) => s.meta.camera);

  const isPlaying = useProjectStore((s) => s.isPlaying);
  const setIsPlaying = useProjectStore((s) => s.setIsPlaying);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;
  const currentTimeRef = useRef(useProjectStore.getState().currentTime);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const timeDisplayRef = useRef<HTMLSpanElement>(null);
  const spokenSubtitleRef = useRef<Set<string>>(new Set());
  const activeAudioClipsRef = useRef<Set<string>>(new Set());
  const activeVideoClipsRef = useRef<Set<string>>(new Set());

  // Sinkronkan currentTimeRef hanya saat TIDAK sedang playing (misal saat user scrub timeline / klik playhead)
  useEffect(() => {
    if (!isPlayingRef.current) {
      currentTimeRef.current = currentTime;
      if (timeDisplayRef.current) {
        timeDisplayRef.current.textContent = formatTime(currentTime);
      }
      renderFrame();
    }
  }, [currentTime]);

  // Reset audio & video playback state saat playhead di-pause atau di-stop
  // Serta otomatis bersihkan mediaCache dari aset yang sudah dihapus dari timeline agar RAM tidak bocor (Garbage Collection)
  useEffect(() => {
    if (!isPlaying) {
      activeAudioClipsRef.current.clear();
      activeVideoClipsRef.current.clear();
      spokenSubtitleRef.current.clear();

      // Himpun semua source URL yang saat ini masih aktif di timeline
      const activeSources = new Set<string>();
      tracksRef.current.forEach((t) => {
        t.clips.forEach((c) => {
          if (c.source) activeSources.add(c.source);
        });
      });

      // Bersihkan dan buang elemen media yang sudah tidak ada di timeline
      mediaCacheRef.current.forEach((el, src) => {
        if (!activeSources.has(src)) {
          if (el instanceof HTMLMediaElement) {
            el.pause();
            el.removeAttribute("src");
            el.load();
          }
          mediaCacheRef.current.delete(src);
        } else {
          if (el instanceof HTMLMediaElement && !el.paused) {
            el.pause();
          }
        }
      });
    }
  }, [isPlaying, tracks]);

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
        aud.loop = false;
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
    const currTime = currentTimeRef.current;
    const currentTracks = tracksRef.current;
    const currentlyPlaying = isPlayingRef.current;

    ctx.fillStyle = "#090a0d";
    ctx.fillRect(0, 0, width, height);

    const activeClips: { clip: Clip; track: Track }[] = [];
    for (const track of currentTracks) {
      if (track.visible === false) continue; // Hormati flag layer hidden
      for (const clip of track.clips) {
        if (currTime >= clip.start && currTime <= clip.end) {
          activeClips.push({ clip, track });
        }
      }
    }

    // 1. Sinkronisasi Pemutaran Audio Track (MP3 / WAV / BGM)
    for (const track of currentTracks) {
      if (track.type === "audio") {
        for (const clip of track.clips) {
          if (clip.source) {
            const audio = getMediaElement(clip.source, "audio") as HTMLAudioElement;
            if (audio) {
              const isCurrentlyActive = currTime >= clip.start && currTime <= clip.end;

              // Matikan audio jika track dimute atau disembunyikan
              if (track.muted || track.visible === false) {
                if (!audio.paused) audio.pause();
                activeAudioClipsRef.current.delete(clip.id);
                continue;
              }

              if (isCurrentlyActive && currentlyPlaying) {
                const audioDuration = audio.duration && isFinite(audio.duration) ? audio.duration : 0;
                const relativeClipTime = Math.max(0, currTime - clip.start);
                const { internalTime, currentSpeed } = calculateSpeedRampedInternalTime(
                  clip.keyframes,
                  relativeClipTime,
                  clip.playbackSpeed || 1.0,
                  clip.source_start || 0
                );

                let targetTime = internalTime;

                // Jika klip di timeline lebih panjang dari durasi file audio asli (misal BGM / loop audio)
                if (audioDuration > 0 && targetTime >= audioDuration) {
                  targetTime = targetTime % audioDuration;
                }

                // Terapkan kecepatan playback pada elemen audio
                if (Math.abs(audio.playbackRate - currentSpeed) > 0.05) {
                  audio.playbackRate = Math.max(0.25, Math.min(8.0, currentSpeed));
                }

                // Evaluasi volume keyframe jika ada
                let effectiveVolume = clip.volume ?? 1.0;
                if (clip.keyframes && clip.keyframes.length > 0) {
                  const relTime = currTime - clip.start;
                  const kf = interpolateKeyframes(clip.keyframes, relTime, { volume: effectiveVolume });
                  if (kf.volume !== undefined) effectiveVolume = kf.volume;
                }
                audio.volume = Math.max(0, Math.min(1, effectiveVolume));

                if (!activeAudioClipsRef.current.has(clip.id)) {
                  // Mulai audio saat playhead memasuki klip ini
                  activeAudioClipsRef.current.add(clip.id);
                  audio.currentTime = Math.max(0, targetTime);
                  audio.play().catch(() => {});
                } else {
                  // Jika audio sudah berjalan tapi terhenti karena file habis sebelum klip selesai, putar ulang (loop)
                  if (audio.ended && audioDuration > 0) {
                    audio.currentTime = Math.max(0, targetTime);
                    audio.play().catch(() => {});
                  } else if (audio.paused && !audio.ended) {
                    audio.play().catch(() => {});
                  }
                }
              } else {
                if (!audio.paused) {
                  audio.pause();
                }
                activeAudioClipsRef.current.delete(clip.id);
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

    // Evaluasi Gerakan Kamera Sinematik (Pan, Tilt, Zoom, Shake, Orbit)
    const camTransform = evaluateCameraTransform(cameraConfig, currTime, width, height);

    ctx.save();
    if (cameraConfig?.enabled) {
      // Pusatkan transformasi kamera di titik tengah kanvas
      ctx.translate(width / 2 + camTransform.offsetX, height / 2 + camTransform.offsetY);
      if (camTransform.rotation !== 0) {
        ctx.rotate((camTransform.rotation * Math.PI) / 180);
      }
      if (camTransform.scale !== 1) {
        ctx.scale(camTransform.scale, camTransform.scale);
      }
      ctx.translate(-width / 2, -height / 2);
    }

    // 2. Render visual layers (Video & Image)
    for (const { clip, track } of activeClips) {
      if ((track.type === "video" || track.type === "image") && clip.source) {
        const media = getMediaElement(clip.source, track.type);

        if (media instanceof HTMLImageElement && media.complete && media.naturalWidth > 0) {
          ctx.save();
          drawTransformedMedia(ctx, media, clip, width, height, currTime);
          ctx.restore();
        } else if (media instanceof HTMLVideoElement) {
          const videoDuration = media.duration && isFinite(media.duration) ? media.duration : 0;
          const relativeClipTime = Math.max(0, currTime - clip.start);
          const { internalTime, currentSpeed } = calculateSpeedRampedInternalTime(
            clip.keyframes,
            relativeClipTime,
            clip.playbackSpeed || 1.0,
            clip.source_start || 0
          );

          let targetVideoTime = internalTime;
          if (videoDuration > 0 && targetVideoTime >= videoDuration) {
            targetVideoTime = targetVideoTime % videoDuration;
          }

          if (currentlyPlaying) {
            // Terapkan kecepatan putar pada elemen HTMLVideoElement
            if (Math.abs(media.playbackRate - currentSpeed) > 0.05) {
              media.playbackRate = Math.max(0.25, Math.min(8.0, currentSpeed));
            }

            // Terapkan kontrol audio / suara video (Mute dan Volume)
            const isVideoTrackMuted = track.muted || track.visible === false;
            const isClipMuted = clip.muted ?? false;
            if (isVideoTrackMuted || isClipMuted) {
              media.muted = true;
              media.volume = 0;
            } else {
              media.muted = false;
              let effectiveVol = clip.volume ?? 1.0;
              // Jika ada keyframe volume pada video
              if (clip.keyframes && clip.keyframes.length > 0) {
                const kf = interpolateKeyframes(clip.keyframes, relativeClipTime, { volume: effectiveVol });
                if (kf.volume !== undefined) effectiveVol = kf.volume;
              }
              media.volume = Math.max(0, Math.min(1, effectiveVol));
            }

            if (!activeVideoClipsRef.current.has(clip.id)) {
              // Mulai video sekali saja saat playhead masuk ke klip ini
              activeVideoClipsRef.current.add(clip.id);
              media.currentTime = Math.max(0, targetVideoTime);
              media.play().catch(() => {});
            } else {
              // Saat video sudah running normal, HANYA sinkronkan jika drift waktu sangat jauh (> 1.2 detik)
              // Hal ini mencegah browser menjeda decoder video (stuttering / putus-putus)
              if (Math.abs(media.currentTime - targetVideoTime) > 1.2) {
                media.currentTime = Math.max(0, targetVideoTime);
              }
              if (media.paused) {
                media.play().catch(() => {});
              }
            }
          } else {
            if (!media.paused) {
              media.pause();
            }
            activeVideoClipsRef.current.delete(clip.id);
            // Saat di-pause atau di-scrub oleh user, update frame ke target time
            if (Math.abs(media.currentTime - targetVideoTime) > 0.05) {
              media.currentTime = Math.max(0, targetVideoTime);
            }
          }

          // Render video ke canvas
          if (media.readyState >= 1) {
            ctx.save();
            drawTransformedMedia(ctx, media, clip, width, height, currTime);
            ctx.restore();
          }
        }
      }
    }

    // 3. Subtitle Rendering (dengan animasi teks dinamis & automatic word wrapping)
    for (const { clip, track } of activeClips) {
      if (track.type === "subtitle" && clip.text) {
        ctx.save();
        const baseFontSize = (clip.style?.fontSize as number) || Math.max(18, Math.round(height * 0.032));
        const lineHeight = Math.round(baseFontSize * 1.35);
        const fontColor = (clip.style?.color as string) || "#ffffff";
        const bgColor = (clip.style?.backgroundColor as string) || "rgba(0, 0, 0, 0.82)";

        // Hitung Animasi Teks Masuk
        const anim = clip.text_animation || { preset: "none", duration: 0.5 };
        const animPreset = anim.preset || "none";
        const animDur = anim.duration || 0.5;
        const timeSinceStart = Math.max(0, currTime - clip.start);
        const animProgress = Math.min(1, timeSinceStart / animDur);

        // State transformasi & opacity dari animasi teks
        let textOpacity = 1;
        let textScale = 1;
        let textOffsetY = 0;
        let textOffsetX = 0;
        let textRotation = 0;
        let displayText = clip.text;

        // Custom shadow styling dari clip style
        if (clip.style?.shadowColor) {
          ctx.shadowColor = clip.style.shadowColor as string;
          ctx.shadowBlur = (clip.style.shadowBlur as number) || 12;
        }

        // Cek apakah animasi ini merupakan Custom Text Animation buatan user
        const customAnimations = getCustomTextAnimations();
        const customAnim = customAnimations.find((ca) => ca.id === animPreset);

        if (customAnim) {
          const evalRes = evaluateCustomTextAnimation(
            customAnim,
            timeSinceStart,
            width,
            baseFontSize,
            clip.text.length,
            currTime
          );
          textOpacity = evalRes.opacity;
          textScale = evalRes.scaleX;
          textOffsetX = evalRes.offsetX;
          textOffsetY = evalRes.offsetY;
          textRotation = evalRes.rotation;
          if (evalRes.shadowBlurBonus > 0) {
            ctx.shadowBlur = ((clip.style?.shadowBlur as number) || 12) + evalRes.shadowBlurBonus;
          }
          if (evalRes.visibleCharsCount !== undefined) {
            displayText = clip.text.substring(0, evalRes.visibleCharsCount);
          }
        } else if (animPreset === "fade" || animPreset === "fade_blur" || animPreset === "fade_slow" || animPreset === "fade_black_box" || animPreset === "fade_gold" || animPreset === "fade_minimalist") {
          textOpacity = animProgress;
        } else if (animPreset === "fade_flash") {
          textOpacity = animProgress < 0.3 ? 0.3 + animProgress * 2.3 : 1;
        } else if (animPreset === "pop" || animPreset === "elastic_pop") {
          textOpacity = Math.min(1, animProgress * 1.5);
          textScale = animProgress < 0.7 ? 0.3 + animProgress * 1.2 : 1.14 - (animProgress - 0.7) * 0.46;
        } else if (animPreset === "slide_up" || animPreset === "slide_elastic_up" || animPreset === "slide_overshoot") {
          textOpacity = animProgress;
          textOffsetY = (1 - animProgress) * (baseFontSize * 1.5);
        } else if (animPreset === "slide_down") {
          textOpacity = animProgress;
          textOffsetY = -(1 - animProgress) * (baseFontSize * 1.5);
        } else if (animPreset === "slide_left") {
          textOpacity = animProgress;
          textOffsetX = (1 - animProgress) * (width * 0.4);
        } else if (animPreset === "slide_right") {
          textOpacity = animProgress;
          textOffsetX = -(1 - animProgress) * (width * 0.4);
        } else if (animPreset === "slide_diagonal") {
          textOpacity = animProgress;
          textOffsetX = (1 - animProgress) * (width * 0.25);
          textOffsetY = (1 - animProgress) * (baseFontSize * 1.5);
        } else if (animPreset === "bounce" || animPreset === "heavy_drop_bounce" || animPreset === "soft_spring" || animPreset === "cartoon_boing" || animPreset === "rebound_slam" || animPreset === "quiver_bounce" || animPreset === "triple_bounce") {
          textOpacity = Math.min(1, animProgress * 2);
          textScale = 0.4 + Math.sin(animProgress * Math.PI) * 0.7 + (animProgress >= 1 ? 0.6 : 0);
          if (animProgress >= 1) textScale = 1;
        } else if (animPreset === "zoom_in" || animPreset === "zoom_blur_blast" || animPreset === "snap_zoom") {
          textOpacity = animProgress;
          textScale = 0.2 + animProgress * 0.8;
        } else if (animPreset === "zoom_out") {
          textOpacity = animProgress;
          textScale = 1.8 - animProgress * 0.8;
        } else if (animPreset === "pulsing_scale") {
          textScale = 1 + Math.sin(currTime * 8) * 0.08;
        } else if (animPreset === "rotate_spin_in" || animPreset === "barrel_roll") {
          textOpacity = animProgress;
          textScale = 0.3 + animProgress * 0.7;
          textRotation = (1 - animProgress) * 360;
        } else if (animPreset === "flip_x" || animPreset === "skew_twist") {
          textOpacity = animProgress;
          textScale = Math.sin(animProgress * Math.PI * 0.5);
        } else if (animPreset === "glow" || animPreset === "neon_pink" || animPreset === "glow_pulse" || animPreset === "electric_spark" || animPreset === "matrix_green" || animPreset === "fire_ember") {
          ctx.shadowColor = (clip.style?.shadowColor as string) || "#f59e0b";
          ctx.shadowBlur = Math.round(18 * Math.abs(Math.sin(currTime * 5)) + 6);
        } else if (animPreset === "typewriter" || animPreset === "capcut_typewriter_cursor") {
          const totalChars = clip.text.length;
          const visibleCount = Math.floor(animProgress * totalChars);
          displayText = clip.text.substring(0, visibleCount) + (animProgress < 1 ? "▎" : "");
        } else if (animPreset === "capcut_zoom_slam") {
          textOpacity = Math.min(1, animProgress * 2);
          textScale = animProgress < 0.6 ? 2.5 - animProgress * 2.5 : 1.0 + Math.sin((animProgress - 0.6) * Math.PI * 2.5) * 0.12;
        } else if (animPreset === "capcut_slide_blur") {
          textOpacity = animProgress;
          textOffsetX = (1 - Math.pow(animProgress, 2)) * (width * 0.5);
        } else if (animPreset === "capcut_spring_up") {
          textOpacity = animProgress;
          textOffsetY = (1 - animProgress) * (baseFontSize * 2);
          textScale = animProgress < 0.7 ? 0.4 + animProgress * 1.1 : 1.17 - (animProgress - 0.7) * 0.56;
        } else if (animPreset === "capcut_karaoke_glow") {
          textScale = 1 + Math.abs(Math.sin(currTime * 6)) * 0.08;
          ctx.shadowColor = (clip.style?.shadowColor as string) || "#4ade80";
          ctx.shadowBlur = Math.round(15 + Math.sin(currTime * 8) * 8);
        } else if (animPreset === "capcut_flip_card") {
          textOpacity = animProgress;
          textScale = Math.sin(animProgress * Math.PI * 0.5);
        } else if (animPreset === "capcut_shiver_shake") {
          textOpacity = animProgress;
          if (animProgress > 0.2 && animProgress < 0.8) {
            textOffsetX = (Math.random() - 0.5) * 8 * (1 - animProgress);
            textOffsetY = (Math.random() - 0.5) * 8 * (1 - animProgress);
          }
        } else if (animPreset === "capcut_pendulum_swing") {
          textOpacity = animProgress;
          textOffsetY = (1 - animProgress) * (baseFontSize * 1.2);
          textRotation = Math.sin((1 - animProgress) * Math.PI * 2) * 20 * (1 - animProgress);
        } else if (animPreset === "capcut_spiral_vortex") {
          textOpacity = animProgress;
          textScale = 0.1 + animProgress * 0.9;
          textRotation = (1 - animProgress) * 540;
        } else if (animPreset === "capcut_neon_twitch") {
          const flicker = Math.sin(currTime * 15) > 0.1 ? 1 : 0.35;
          textOpacity = animProgress * flicker;
          ctx.shadowColor = (clip.style?.shadowColor as string) || "#ec4899";
          ctx.shadowBlur = Math.round(18 * flicker + 6);
        } else {
          // Default smooth pop
          textOpacity = Math.min(1, animProgress * 1.2);
          textScale = 0.85 + animProgress * 0.15;
        }

        const isBoldStyle = clip.style?.isBold !== undefined ? Boolean(clip.style.isBold) : true;
        const isItalicStyle = Boolean(clip.style?.isItalic);
        const isUnderlineStyle = Boolean(clip.style?.isUnderline);
        const isStrikethroughStyle = Boolean(clip.style?.isStrikethrough);
        const textCaseStyle = (clip.style?.textCase as string) || "none";
        const strokeWidthStyle = Number(clip.style?.strokeWidth) || 0;
        const strokeColorStyle = (clip.style?.strokeColor as string) || "#000000";
        const fontFamilyStyle = (clip.style?.fontFamily as string) || "system-ui, -apple-system, sans-serif";

        if (textCaseStyle === "uppercase") displayText = displayText.toUpperCase();
        else if (textCaseStyle === "lowercase") displayText = displayText.toLowerCase();
        else if (textCaseStyle === "capitalize") {
          displayText = displayText.replace(/\b\w/g, (c) => c.toUpperCase());
        }

        const fontPrefix = `${isItalicStyle ? "italic " : ""}${isBoldStyle ? "bold " : ""}`;

        ctx.globalAlpha = textOpacity;
        ctx.font = `${fontPrefix}${Math.round(baseFontSize * textScale)}px ${fontFamilyStyle}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const maxTextWidth = width * 0.82; // batas lebar maksimal teks di canvas (82% lebar canvas)

        // Algoritma Word Wrapping Otomatis
        const words = (displayText || "").split(" ");
        const lines: string[] = [];
        let currentLine = "";

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = ctx.measureText(testLine).width;
          if (testWidth > maxTextWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }

        // Ukur dimensi box latar belakang subtitle
        let widestLine = 0;
        for (const line of lines) {
          const w = ctx.measureText(line).width;
          if (w > widestLine) widestLine = w;
        }

        const boxPaddingX = Math.round(baseFontSize * 0.8);
        const boxPaddingY = Math.round(baseFontSize * 0.45);
        const totalTextHeight = lines.length * lineHeight;
        const totalBoxWidth = widestLine + boxPaddingX * 2;
        const totalBoxHeight = totalTextHeight + boxPaddingY * 2;

        const boxBottomMargin = Math.round(height * 0.05);
        const boxY = height - boxBottomMargin - totalBoxHeight + textOffsetY;
        const boxX = (width - totalBoxWidth) / 2 + textOffsetX;

        if (textRotation) {
          ctx.translate(boxX + totalBoxWidth / 2, boxY + totalBoxHeight / 2);
          ctx.rotate((textRotation * Math.PI) / 180);
          ctx.translate(-(boxX + totalBoxWidth / 2), -(boxY + totalBoxHeight / 2));
        }

        // Gambar background box
        if (bgColor !== "rgba(0,0,0,0)" && bgColor !== "transparent") {
          ctx.fillStyle = bgColor;
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, totalBoxWidth, totalBoxHeight, 8);
            ctx.fill();
          } else {
            ctx.fillRect(boxX, boxY, totalBoxWidth, totalBoxHeight);
          }
        }

        // Gambar teks per baris yang sudah di-wrap
        let startTextY = boxY + boxPaddingY + lineHeight / 2;
        for (const line of lines) {
          const textX = boxX + totalBoxWidth / 2;

          // Render stroke / outline garis luar teks
          if (strokeWidthStyle > 0) {
            ctx.save();
            ctx.strokeStyle = strokeColorStyle;
            ctx.lineWidth = strokeWidthStyle;
            ctx.lineJoin = "round";
            ctx.strokeText(line, textX, startTextY);
            ctx.restore();
          }

          ctx.fillStyle = fontColor;
          ctx.fillText(line, textX, startTextY);

          // Gambar garis bawah jika isUnderline aktif
          if (isUnderlineStyle) {
            const lineWidth = ctx.measureText(line).width;
            const underlineY = startTextY + baseFontSize * 0.45;
            ctx.save();
            ctx.strokeStyle = fontColor;
            ctx.lineWidth = Math.max(2, Math.round(baseFontSize * 0.08));
            ctx.beginPath();
            ctx.moveTo(textX - lineWidth / 2, underlineY);
            ctx.lineTo(textX + lineWidth / 2, underlineY);
            ctx.stroke();
            ctx.restore();
          }

          // Gambar garis coret (strikethrough) jika aktif
          if (isStrikethroughStyle) {
            const lineWidth = ctx.measureText(line).width;
            const strikeY = startTextY;
            ctx.save();
            ctx.strokeStyle = fontColor;
            ctx.lineWidth = Math.max(2, Math.round(baseFontSize * 0.08));
            ctx.beginPath();
            ctx.moveTo(textX - lineWidth / 2, strikeY);
            ctx.lineTo(textX + lineWidth / 2, strikeY);
            ctx.stroke();
            ctx.restore();
          }

          startTextY += lineHeight;
        }

        ctx.restore();
      }
    }

    // Kembalikan konteks kamera ke normal
    ctx.restore();
  }, [getMediaElement, aspectRatio, cameraConfig]);

  const drawTransformedMedia = (
    ctx: CanvasRenderingContext2D,
    media: HTMLImageElement | HTMLVideoElement,
    clip: Clip,
    canvasWidth: number,
    canvasHeight: number,
    currentTime: number
  ) => {
    // 1. Ambil nilai dasar transform & opacity
    const baseTransform = clip.transform || { scale: 1, x: 0, y: 0, rotation: 0 };
    const baseOpacity = clip.opacity !== undefined ? clip.opacity : 1;

    // 2. Evaluasi interpolasi Keyframe jika ada
    const relativeTime = currentTime - clip.start;
    const keyframedProps = interpolateKeyframes(clip.keyframes, relativeTime, {
      x: baseTransform.x,
      y: baseTransform.y,
      scale: baseTransform.scale,
      rotation: baseTransform.rotation,
      opacity: baseOpacity,
    });

    const transform = {
      x: keyframedProps.x !== undefined ? keyframedProps.x : baseTransform.x,
      y: keyframedProps.y !== undefined ? keyframedProps.y : baseTransform.y,
      scale: keyframedProps.scale !== undefined ? keyframedProps.scale : baseTransform.scale,
      rotation: keyframedProps.rotation !== undefined ? keyframedProps.rotation : baseTransform.rotation,
    };
    const keyframeOpacity = keyframedProps.opacity !== undefined ? keyframedProps.opacity : baseOpacity;

    const chroma = clip.chroma_key;

    // Kalkulasi Transisi Masuk (Transition In) & Transisi Keluar (Transition Out)
    const tIn = clip.transition_in || { type: "none", duration: 0.5 };
    const tOut = clip.transition_out || { type: "none", duration: 0.5 };
    const durIn = tIn.duration || 0.5;
    const durOut = tOut.duration || 0.5;

    let transOpacity = 1;
    let transOffsetX = 0;
    let transOffsetY = 0;
    let transScale = 1;
    let transRotation = 0;

    // Transisi Masuk (In)
    if (tIn.type && tIn.type !== "none") {
      const timeSinceStart = currentTime - clip.start;
      if (timeSinceStart >= 0 && timeSinceStart < durIn) {
        const progress = Math.min(1, Math.max(0, timeSinceStart / durIn));
        const customTransitions = getCustomTransitions();
        const customTrans = customTransitions.find((ct) => ct.id === tIn.type);

        if (customTrans) {
          const res = evaluateTransitionTransform(customTrans, true, progress, canvasWidth, canvasHeight);
          transOpacity = res.opacity;
          transScale = res.scale;
          transOffsetX = res.offsetX;
          transOffsetY = res.offsetY;
          transRotation = res.rotation;
        } else if (tIn.type === "morph") {
          // Efek Morph: perpaduan zoom warp elastis + sedikit putaran rotasi + fade cross-blend
          transOpacity = Math.min(1, progress * 1.4);
          transScale = 0.6 + Math.sin(progress * Math.PI * 0.5) * 0.4;
          transRotation = (1 - progress) * 8; // rotasi halus 8 derajat menuju tegak
        } else if (tIn.type === "fade_in" || tIn.type === "cross_dissolve") {
          transOpacity = progress;
        } else if (tIn.type === "slide_left") {
          transOffsetX = (1 - progress) * canvasWidth;
        } else if (tIn.type === "slide_right") {
          transOffsetX = -(1 - progress) * canvasWidth;
        } else if (tIn.type === "slide_up") {
          transOffsetY = (1 - progress) * canvasHeight;
        } else if (tIn.type === "slide_down") {
          transOffsetY = -(1 - progress) * canvasHeight;
        } else if (tIn.type === "zoom_in") {
          transOpacity = progress;
          transScale = 0.3 + progress * 0.7;
        } else if (tIn.type === "zoom_out") {
          transOpacity = progress;
          transScale = 1.7 - progress * 0.7;
        } else if (tIn.type === "wipe_left") {
          transOpacity = progress;
          transOffsetX = (1 - progress) * (canvasWidth * 0.5);
        }
      }
    }

    // Transisi Keluar (Out)
    if (tOut.type && tOut.type !== "none") {
      const timeUntilEnd = clip.end - currentTime;
      if (timeUntilEnd >= 0 && timeUntilEnd < durOut) {
        const progress = Math.min(1, Math.max(0, timeUntilEnd / durOut)); // 1 -> 0 saat mendekati akhir
        const customTransitions = getCustomTransitions();
        const customTrans = customTransitions.find((ct) => ct.id === tOut.type);

        if (customTrans) {
          const res = evaluateTransitionTransform(customTrans, false, progress, canvasWidth, canvasHeight);
          transOpacity = Math.min(transOpacity, res.opacity);
          transScale = transScale * res.scale;
          transOffsetX += res.offsetX;
          transOffsetY += res.offsetY;
          transRotation += res.rotation;
        } else if (tOut.type === "morph") {
          // Efek Morph Keluar: melembut membesar (warp forward) + fade out
          transOpacity = Math.min(transOpacity, progress * 1.3);
          transScale = transScale * (1 + (1 - progress) * 0.45);
          transRotation = (1 - progress) * -8;
        } else if (tOut.type === "fade_out" || tOut.type === "cross_dissolve") {
          transOpacity = Math.min(transOpacity, progress);
        } else if (tOut.type === "slide_left") {
          transOffsetX = -(1 - progress) * canvasWidth;
        } else if (tOut.type === "slide_right") {
          transOffsetX = (1 - progress) * canvasWidth;
        } else if (tOut.type === "slide_up") {
          transOffsetY = -(1 - progress) * canvasHeight;
        } else if (tOut.type === "slide_down") {
          transOffsetY = (1 - progress) * canvasHeight;
        } else if (tOut.type === "zoom_in") {
          transOpacity = Math.min(transOpacity, progress);
          transScale = 1 + (1 - progress) * 0.8;
        } else if (tOut.type === "zoom_out") {
          transOpacity = Math.min(transOpacity, progress);
          transScale = Math.max(0.2, progress);
        } else if (tOut.type === "wipe_right") {
          transOpacity = Math.min(transOpacity, progress);
          transOffsetX = (1 - progress) * (canvasWidth * 0.5);
        }
      }
    }

    // Kalkulasi Animasi Gambar (In, Out, Loop) jika klip memiliki image_animation
    let imgAnimOpacity = 1;
    let imgAnimScale = 1;
    let imgAnimOffsetX = 0;
    let imgAnimOffsetY = 0;
    let imgAnimRotation = 0;

    if (clip.image_animation) {
      const imgRes = evaluateImageAnimation(
        clip.image_animation,
        relativeTime,
        clip.end - clip.start,
        canvasWidth,
        canvasHeight
      );
      imgAnimOpacity = imgRes.opacity;
      imgAnimScale = imgRes.scale;
      imgAnimOffsetX = imgRes.offsetX;
      imgAnimOffsetY = imgRes.offsetY;
      imgAnimRotation = imgRes.rotation;
    }

    ctx.globalAlpha = Math.max(0, Math.min(1, transOpacity * keyframeOpacity * imgAnimOpacity));

    const cx = canvasWidth / 2 + transform.x + transOffsetX + imgAnimOffsetX;
    const cy = canvasHeight / 2 + transform.y + transOffsetY + imgAnimOffsetY;

    ctx.translate(cx, cy);
    const finalRotation = transform.rotation + transRotation + imgAnimRotation;
    if (finalRotation) {
      ctx.rotate((finalRotation * Math.PI) / 180);
    }
    const finalScale = transform.scale * transScale * imgAnimScale;
    ctx.scale(finalScale, finalScale);

    const mWidth = (media as HTMLVideoElement).videoWidth || (media as HTMLImageElement).naturalWidth || canvasWidth;
    const mHeight = (media as HTMLVideoElement).videoHeight || (media as HTMLImageElement).naturalHeight || canvasHeight;

    const scale = Math.min(canvasWidth / mWidth, canvasHeight / mHeight);
    const drawW = mWidth * scale;
    const drawH = mHeight * scale;

    if (chroma && chroma.enabled && media instanceof HTMLImageElement) {
      if (!chromaCanvasRef.current) {
        chromaCanvasRef.current = document.createElement("canvas");
      }
      const offscreen = chromaCanvasRef.current;
      const targetW = Math.max(1, Math.round(drawW));
      const targetH = Math.max(1, Math.round(drawH));
      if (offscreen.width !== targetW || offscreen.height !== targetH) {
        offscreen.width = targetW;
        offscreen.height = targetH;
      }
      const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
      if (offCtx) {
        offCtx.clearRect(0, 0, targetW, targetH);
        offCtx.drawImage(media, 0, 0, targetW, targetH);
        const imgData = offCtx.getImageData(0, 0, targetW, targetH);
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

  // Hitung batas waktu klip paling akhir di seluruh track timeline (efektif durasi konten)
  const getContentEndTime = useCallback(() => {
    let maxEnd = 0;
    const currentTracks = tracksRef.current;
    for (const t of currentTracks) {
      for (const c of t.clips) {
        if (c.end > maxEnd) {
          maxEnd = c.end;
        }
      }
    }
    // Jika ada klip di timeline, gunakan titik akhir klip terakhir. Jika kosong, gunakan default duration.
    return maxEnd > 0 ? maxEnd : duration;
  }, [duration]);

  useEffect(() => {
    let animId: number;
    lastTimeRef.current = performance.now();
    let lastStoreSync = 0;

    const tick = (now: number) => {
      const deltaSec = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      if (isPlayingRef.current) {
        const nextTime = currentTimeRef.current + deltaSec;
        const effectiveEndTime = getContentEndTime();

        // Berhenti tepat saat playhead mencapai titik akhir klip paling kanan di timeline
        if (nextTime >= effectiveEndTime) {
          currentTimeRef.current = effectiveEndTime;
          setCurrentTime(effectiveEndTime);
          setIsPlaying(false);
          isPlayingRef.current = false;
          if (timeDisplayRef.current) {
            timeDisplayRef.current.textContent = formatTime(effectiveEndTime);
          }
        } else {
          currentTimeRef.current = nextTime;
          // Update teks time monitor langsung ke DOM tanpa re-render React
          if (timeDisplayRef.current) {
            timeDisplayRef.current.textContent = formatTime(nextTime);
          }
          // Throttle pengiriman update state ke Zustand Store setiap ~150ms
          // Ini mencegah re-render komponen React lain yang membuat audio/video tersendat
          if (now - lastStoreSync > 150) {
            lastStoreSync = now;
            setCurrentTime(nextTime);
          }
        }
      }

      renderFrame();
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [duration, getContentEndTime, renderFrame, setCurrentTime, setIsPlaying]);

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
          <span ref={timeDisplayRef} className="text-cyan-400 font-bold">{formatTime(currentTime)}</span>
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
