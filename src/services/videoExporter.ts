import { Track, Clip } from "../stores/projectStore";
import { interpolateKeyframes, calculateSpeedRampedInternalTime } from "./keyframe";
import { getCustomTextAnimations, evaluateCustomTextAnimation } from "./customTextAnimation";
import { getCustomTransitions, evaluateTransitionTransform } from "./customTransitions";
import { evaluateImageAnimation } from "./imageAnimationPresets";
import { CameraMotionConfig, evaluateCameraTransform } from "./cameraMotion";

export interface VideoExportOptions {
  projectName: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  format: "mp4" | "webm" | "mov" | "gif";
  ratio: string;
  camera?: CameraMotionConfig;
  onProgress: (percent: number, statusText: string) => void;
}

/**
 * Render timeline tracks (images, videos, subtitles, and audio) into an exportable video file
 * using HTMLCanvasElement, Web Audio API, and MediaRecorder in real-time clock synchronization.
 */
export async function renderAndExportVideo(
  tracks: Track[],
  options: VideoExportOptions
): Promise<{ success: boolean; error?: string }> {
  const { projectName, width, height, fps, bitrate, onProgress, format } = options;

  // 1. Hitung total durasi timeline dari klip terpanjang di semua track aktif
  let maxDuration = 0;
  let totalClipsCount = 0;

  for (const track of tracks) {
    if (track.visible === false) continue;
    for (const clip of track.clips) {
      totalClipsCount++;
      if (clip.end > maxDuration) {
        maxDuration = clip.end;
      }
    }
  }

  if (totalClipsCount === 0 || maxDuration <= 0) {
    return {
      success: false,
      error: "Timeline masih kosong! Silakan tambahkan Scene, Gambar, Video, Subtitle, atau Audio ke Timeline terlebih dahulu sebelum export.",
    };
  }

  onProgress(5, "Menyiapkan canvas & audio mixer...");

  // 2. Siapkan Canvas Offscreen
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { success: false, error: "Gagal menginisialisasi 2D Canvas context." };
  }

  // 3. Preload all images & videos to memory
  onProgress(10, "Memuat asset gambar & video...");
  const loadedMedia = new Map<string, HTMLImageElement | HTMLVideoElement>();

  for (const track of tracks) {
    if (track.type === "video" || track.type === "image") {
      for (const clip of track.clips) {
        if (clip.source && !loadedMedia.has(clip.source)) {
          const isVideo =
            clip.source.startsWith("data:video/") ||
            clip.source.includes(".mp4") ||
            clip.source.includes(".webm") ||
            clip.source.includes(".mov");

          if (isVideo) {
            const vid = document.createElement("video");
            vid.crossOrigin = "anonymous";
            vid.muted = true;
            vid.playsInline = true;
            vid.preload = "auto";
            vid.autoplay = false;
            // Diperlukan agar video offscreen bisa dirender dan didecode frame-nya oleh web engine
            vid.style.position = "fixed";
            vid.style.top = "-9999px";
            vid.style.left = "-9999px";
            vid.style.width = "1px";
            vid.style.height = "1px";
            vid.style.opacity = "0";
            vid.style.pointerEvents = "none";
            document.body.appendChild(vid);

            vid.src = clip.source;
            await new Promise<void>((resolve) => {
              const onCanPlay = () => {
                vid.removeEventListener("canplay", onCanPlay);
                resolve();
              };
              vid.addEventListener("canplay", onCanPlay);
              vid.onloadeddata = () => resolve();
              vid.onerror = () => resolve();
              setTimeout(resolve, 3000);
            });
            loadedMedia.set(clip.source, vid);
          } else {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = clip.source;
            await new Promise<void>((resolve) => {
              if (img.complete) return resolve();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              setTimeout(resolve, 2000);
            });
            loadedMedia.set(clip.source, img);
          }
        }
      }
    }
  }

  // 4. Siapkan Web Audio API untuk mencampur semua audio track
  onProgress(20, "Menyiapkan audio engine...");
  let audioContext: AudioContext | null = null;
  let audioDestination: MediaStreamAudioDestinationNode | null = null;
  const audioBuffers = new Map<string, AudioBuffer>();

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new AudioContextClass();
    audioDestination = audioContext.createMediaStreamDestination();

    for (const track of tracks) {
      if (track.type === "audio" && !track.muted && track.visible !== false) {
        for (const clip of track.clips) {
          if (clip.source && !audioBuffers.has(clip.source)) {
            try {
              let arrayBuffer: ArrayBuffer;
              if (clip.source.startsWith("data:audio/")) {
                const base64Data = clip.source.split(",")[1];
                const binaryStr = atob(base64Data);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                  bytes[i] = binaryStr.charCodeAt(i);
                }
                arrayBuffer = bytes.buffer;
              } else {
                const res = await fetch(clip.source);
                arrayBuffer = await res.arrayBuffer();
              }
              const decoded = await audioContext.decodeAudioData(arrayBuffer);
              audioBuffers.set(clip.source, decoded);
            } catch (err) {
              console.warn("Gagal decode audio untuk export:", clip.source, err);
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn("Web Audio API tidak sepenuhnya didukung untuk audio mixing:", e);
  }

  // 5. Tentukan format rekaman MediaRecorder berdasarkan pilihan format user
  let preferredMimeTypes: string[] = [];

  if (format === "mp4") {
    preferredMimeTypes = [
      "video/mp4;codecs=avc1,mp4a.40.2",
      "video/mp4;codecs=avc1",
      "video/mp4;codecs=h264,aac",
      "video/mp4",
      "video/webm;codecs=h264",
      "video/webm;codecs=vp9,opus",
      "video/webm",
    ];
  } else {
    preferredMimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
  }

  let chosenMimeType = "";
  for (const mime of preferredMimeTypes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      chosenMimeType = mime;
      break;
    }
  }

  const canvasStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream();

  // Tambahkan visual track
  canvasStream.getVideoTracks().forEach((vt) => combinedStream.addTrack(vt));

  // Tambahkan audio track bila audioDestination tersedia
  if (audioDestination && audioDestination.stream.getAudioTracks().length > 0) {
    audioDestination.stream.getAudioTracks().forEach((at) => combinedStream.addTrack(at));
  }

  const recorderOptions: MediaRecorderOptions = {
    videoBitsPerSecond: bitrate,
  };
  if (chosenMimeType) {
    recorderOptions.mimeType = chosenMimeType;
  }

  let mediaRecorder: MediaRecorder;
  try {
    mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);
  } catch (err) {
    console.warn("Fallback MediaRecorder tanpa mimeType khusus", err);
    mediaRecorder = new MediaRecorder(combinedStream);
  }

  const recordedChunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  const recordingFinishedPromise = new Promise<Blob>((resolve, reject) => {
    mediaRecorder.onstop = () => {
      const finalMime = format === "mp4" ? "video/mp4" : chosenMimeType || "video/webm";
      const finalBlob = new Blob(recordedChunks, {
        type: finalMime,
      });
      resolve(finalBlob);
    };
    mediaRecorder.onerror = (e) => reject(e);
  });

  // Gambar frame awal pertama sebelum recorder mulai
  ctx.fillStyle = "#090a0d";
  ctx.fillRect(0, 0, width, height);

  // Mulai merekam dengan chunk interval 200ms
  mediaRecorder.start(200);

  // Play audio sources terjadwal di AudioContext sesuai waktu mulai rekaman
  if (audioContext && audioDestination) {
    const audioStartBase = audioContext.currentTime;
    for (const track of tracks) {
      if (track.type === "audio" && !track.muted && track.visible !== false) {
        for (const clip of track.clips) {
          if (clip.source && audioBuffers.has(clip.source)) {
            const buffer = audioBuffers.get(clip.source)!;
            const sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = buffer;

            // Terapkan kecepatan putar audio (playbackSpeed)
            const audioSpeed = clip.playbackSpeed && clip.playbackSpeed > 0 ? clip.playbackSpeed : 1.0;
            sourceNode.playbackRate.value = audioSpeed;

            const gainNode = audioContext.createGain();
            gainNode.gain.value = clip.volume ?? 1.0;

            sourceNode.connect(gainNode);
            gainNode.connect(audioDestination);

            const startTime = audioStartBase + clip.start;
            const offset = clip.source_start || 0;
            const clipDur = Math.max(0, clip.end - clip.start);
            // Jika klip audio di timeline lebih panjang dari buffer asli, aktifkan loop audio
            if (buffer.duration > 0 && clipDur * audioSpeed > buffer.duration) {
              sourceNode.loop = true;
            }
            sourceNode.start(startTime, offset, clipDur);
          }
        }
      }
    }
  }

  // 6. Real-Time Frame Rendering Loop sinkron dengan MediaRecorder clock
  onProgress(25, "Memproses perekaman timeline nyata...");

  const activeClipsAtTime = (t: number) => {
    const list: { clip: Clip; track: Track }[] = [];
    for (const track of tracks) {
      if (track.visible === false) continue;
      for (const clip of track.clips) {
        if (t >= clip.start && t <= clip.end) {
          list.push({ clip, track });
        }
      }
    }
    return list;
  };

  const drawTransformedMedia = (
    media: HTMLImageElement | HTMLVideoElement,
    clip: Clip,
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
          const res = evaluateTransitionTransform(customTrans, true, progress, width, height);
          transOpacity = res.opacity;
          transScale = res.scale;
          transOffsetX = res.offsetX;
          transOffsetY = res.offsetY;
          transRotation = res.rotation;
        } else if (tIn.type === "morph") {
          // Efek Morph: perpaduan zoom warp elastis + sedikit putaran rotasi + fade cross-blend
          transOpacity = Math.min(1, progress * 1.4);
          transScale = 0.6 + Math.sin(progress * Math.PI * 0.5) * 0.4;
          transRotation = (1 - progress) * 8;
        } else if (tIn.type === "fade_in" || tIn.type === "cross_dissolve") {
          transOpacity = progress;
        } else if (tIn.type === "slide_left") {
          transOffsetX = (1 - progress) * width;
        } else if (tIn.type === "slide_right") {
          transOffsetX = -(1 - progress) * width;
        } else if (tIn.type === "slide_up") {
          transOffsetY = (1 - progress) * height;
        } else if (tIn.type === "slide_down") {
          transOffsetY = -(1 - progress) * height;
        } else if (tIn.type === "zoom_in") {
          transOpacity = progress;
          transScale = 0.3 + progress * 0.7;
        } else if (tIn.type === "zoom_out") {
          transOpacity = progress;
          transScale = 1.7 - progress * 0.7;
        } else if (tIn.type === "wipe_left") {
          transOpacity = progress;
          transOffsetX = (1 - progress) * (width * 0.5);
        }
      }
    }

    // Transisi Keluar (Out)
    if (tOut.type && tOut.type !== "none") {
      const timeUntilEnd = clip.end - currentTime;
      if (timeUntilEnd >= 0 && timeUntilEnd < durOut) {
        const progress = Math.min(1, Math.max(0, timeUntilEnd / durOut));
        const customTransitions = getCustomTransitions();
        const customTrans = customTransitions.find((ct) => ct.id === tOut.type);

        if (customTrans) {
          const res = evaluateTransitionTransform(customTrans, false, progress, width, height);
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
          transOffsetX = -(1 - progress) * width;
        } else if (tOut.type === "slide_right") {
          transOffsetX = (1 - progress) * width;
        } else if (tOut.type === "slide_up") {
          transOffsetY = -(1 - progress) * height;
        } else if (tOut.type === "slide_down") {
          transOffsetY = (1 - progress) * height;
        } else if (tOut.type === "zoom_in") {
          transOpacity = Math.min(transOpacity, progress);
          transScale = 1 + (1 - progress) * 0.8;
        } else if (tOut.type === "zoom_out") {
          transOpacity = Math.min(transOpacity, progress);
          transScale = Math.max(0.2, progress);
        } else if (tOut.type === "wipe_right") {
          transOpacity = Math.min(transOpacity, progress);
          transOffsetX = (1 - progress) * (width * 0.5);
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
        width,
        height
      );
      imgAnimOpacity = imgRes.opacity;
      imgAnimScale = imgRes.scale;
      imgAnimOffsetX = imgRes.offsetX;
      imgAnimOffsetY = imgRes.offsetY;
      imgAnimRotation = imgRes.rotation;
    }

    const cx = width / 2 + transform.x + transOffsetX + imgAnimOffsetX;
    const cy = height / 2 + transform.y + transOffsetY + imgAnimOffsetY;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, transOpacity * keyframeOpacity * imgAnimOpacity));
    ctx.translate(cx, cy);
    const finalRotation = transform.rotation + transRotation + imgAnimRotation;
    if (finalRotation) {
      ctx.rotate((finalRotation * Math.PI) / 180);
    }
    const finalScale = transform.scale * transScale * imgAnimScale;
    ctx.scale(finalScale, finalScale);

    const mWidth =
      (media as HTMLVideoElement).videoWidth ||
      (media as HTMLImageElement).naturalWidth ||
      width;
    const mHeight =
      (media as HTMLVideoElement).videoHeight ||
      (media as HTMLImageElement).naturalHeight ||
      height;

    const scale = Math.min(width / mWidth, height / mHeight);
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

    ctx.restore();
  };

  // Track video clips yang sedang aktif diputar selama proses recording
  const activeVideoClips = new Set<string>();

  const renderSingleFrame = (currentTime: number) => {
    // Bersihkan canvas
    ctx.fillStyle = "#090a0d";
    ctx.fillRect(0, 0, width, height);

    const activeClips = activeClipsAtTime(currentTime);

    // Identifikasi ID klip video yang aktif saat ini
    const currentActiveClipIds = new Set(
      activeClips
        .filter((ac) => ac.track.type === "video" || ac.track.type === "image")
        .map((ac) => ac.clip.id)
    );

    // Pause video yang sudah tidak aktif
    for (const track of tracks) {
      if (track.type === "video" || track.type === "image") {
        for (const clip of track.clips) {
          if (!currentActiveClipIds.has(clip.id) && activeVideoClips.has(clip.id) && clip.source) {
            const media = loadedMedia.get(clip.source);
            if (media instanceof HTMLVideoElement && !media.paused) {
              media.pause();
            }
            activeVideoClips.delete(clip.id);
          }
        }
      }
    }

    // Evaluasi Gerakan Kamera Sinematik (Pan, Tilt, Zoom, Shake, Orbit)
    const camTransform = evaluateCameraTransform(options.camera, currentTime, width, height);

    ctx.save();
    if (options.camera?.enabled) {
      ctx.translate(width / 2 + camTransform.offsetX, height / 2 + camTransform.offsetY);
      if (camTransform.rotation !== 0) {
        ctx.rotate((camTransform.rotation * Math.PI) / 180);
      }
      if (camTransform.scale !== 1) {
        ctx.scale(camTransform.scale, camTransform.scale);
      }
      ctx.translate(-width / 2, -height / 2);
    }

    // Render Video & Image tracks
    for (const { clip, track } of activeClips) {
      if ((track.type === "video" || track.type === "image") && clip.source) {
        const media = loadedMedia.get(clip.source);
        if (media) {
          if (media instanceof HTMLVideoElement) {
            const videoDuration = media.duration && isFinite(media.duration) ? media.duration : 0;
            const relativeClipTime = Math.max(0, currentTime - clip.start);
            const { internalTime, currentSpeed } = calculateSpeedRampedInternalTime(
              clip.keyframes,
              relativeClipTime,
              clip.playbackSpeed || 1.0,
              clip.source_start || 0
            );

            let clipInternalTime = internalTime;
            if (videoDuration > 0 && clipInternalTime >= videoDuration) {
              clipInternalTime = clipInternalTime % videoDuration;
            }

            // Terapkan kecepatan putar pada elemen HTMLVideoElement saat diexport
            if (Math.abs(media.playbackRate - currentSpeed) > 0.05) {
              media.playbackRate = Math.max(0.25, Math.min(8.0, currentSpeed));
            }

            if (!activeVideoClips.has(clip.id)) {
              // Klip baru aktif: set currentTime awal dan play
              activeVideoClips.add(clip.id);
              media.currentTime = Math.max(0, clipInternalTime);
              media.play().catch(() => {});
            } else {
              // Jika video sudah berjalan, jangan ubah currentTime setiap frame karena akan memblokir decoder
              // Hanya sync jika drift waktu lebih dari 0.8s
              if (Math.abs(media.currentTime - clipInternalTime) > 0.8) {
                media.currentTime = Math.max(0, clipInternalTime);
              }
              if (media.paused) {
                media.play().catch(() => {});
              }
            }
          }
          drawTransformedMedia(media, clip, currentTime);
        }
      }
    }

    // Render Subtitle tracks (dengan animasi teks dinamis & automatic word wrapping)
    for (const { clip, track } of activeClips) {
      if (track.type === "subtitle" && clip.text) {
        ctx.save();
        const baseFontSize = (clip.style?.fontSize as number) || Math.max(18, Math.round(height * 0.034));
        const lineHeight = Math.round(baseFontSize * 1.35);
        const fontColor = (clip.style?.color as string) || "#ffffff";
        const bgColor = (clip.style?.backgroundColor as string) || "rgba(0, 0, 0, 0.85)";

        // Hitung Animasi Teks Masuk
        const anim = clip.text_animation || { preset: "none", duration: 0.5 };
        const animPreset = anim.preset || "none";
        const animDur = anim.duration || 0.5;
        const timeSinceStart = Math.max(0, currentTime - clip.start);
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

        // Cek apakah animasi teks ini merupakan Custom Text Animation buatan user
        const customAnimations = getCustomTextAnimations();
        const customAnim = customAnimations.find((ca) => ca.id === animPreset);

        if (customAnim) {
          const evalRes = evaluateCustomTextAnimation(
            customAnim,
            timeSinceStart,
            width,
            baseFontSize,
            clip.text.length,
            currentTime
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
          textScale = 1 + Math.sin(currentTime * 8) * 0.08;
        } else if (animPreset === "rotate_spin_in" || animPreset === "barrel_roll") {
          textOpacity = animProgress;
          textScale = 0.3 + animProgress * 0.7;
          textRotation = (1 - animProgress) * 360;
        } else if (animPreset === "flip_x" || animPreset === "skew_twist") {
          textOpacity = animProgress;
          textScale = Math.sin(animProgress * Math.PI * 0.5);
        } else if (animPreset === "glow" || animPreset === "neon_pink" || animPreset === "glow_pulse" || animPreset === "electric_spark" || animPreset === "matrix_green" || animPreset === "fire_ember") {
          ctx.shadowColor = (clip.style?.shadowColor as string) || "#f59e0b";
          ctx.shadowBlur = Math.round(18 * Math.abs(Math.sin(currentTime * 5)) + 6);
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
          textScale = 1 + Math.abs(Math.sin(currentTime * 6)) * 0.08;
          ctx.shadowColor = (clip.style?.shadowColor as string) || "#4ade80";
          ctx.shadowBlur = Math.round(15 + Math.sin(currentTime * 8) * 8);
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
          const flicker = Math.sin(currentTime * 15) > 0.1 ? 1 : 0.35;
          textOpacity = animProgress * flicker;
          ctx.shadowColor = (clip.style?.shadowColor as string) || "#ec4899";
          ctx.shadowBlur = Math.round(18 * flicker + 6);
        } else {
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
        const fontPrefix = `${isItalicStyle ? "italic " : ""}${isBoldStyle ? "bold " : ""}`;

        // Transformasi huruf teks berdasarkan textCaseStyle
        let formattedDisplayText = displayText || "";
        if (textCaseStyle === "uppercase") {
          formattedDisplayText = formattedDisplayText.toUpperCase();
        } else if (textCaseStyle === "lowercase") {
          formattedDisplayText = formattedDisplayText.toLowerCase();
        } else if (textCaseStyle === "capitalize") {
          formattedDisplayText = formattedDisplayText.replace(/\b\w/g, (c) => c.toUpperCase());
        }

        ctx.globalAlpha = textOpacity;
        ctx.font = `${fontPrefix}${Math.round(baseFontSize * textScale)}px ${fontFamilyStyle}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const maxTextWidth = width * 0.82; // batas lebar maksimal teks di video (82% lebar)

        // Algoritma Word Wrapping Otomatis
        const words = formattedDisplayText.split(" ");
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
            ctx.roundRect(boxX, boxY, totalBoxWidth, totalBoxHeight, 10);
            ctx.fill();
          } else {
            ctx.fillRect(boxX, boxY, totalBoxWidth, totalBoxHeight);
          }
        }

        // Gambar teks per baris yang sudah di-wrap
        ctx.fillStyle = fontColor;
        let startTextY = boxY + boxPaddingY + lineHeight / 2;
        for (const line of lines) {
          const textX = boxX + totalBoxWidth / 2;

          // Render stroke/garis luar jika aktif
          if (strokeWidthStyle > 0) {
            ctx.save();
            ctx.strokeStyle = strokeColorStyle;
            ctx.lineWidth = strokeWidthStyle;
            ctx.lineJoin = "round";
            ctx.strokeText(line, textX, startTextY);
            ctx.restore();
          }

          ctx.fillText(line, textX, startTextY);

          const lineWidth = ctx.measureText(line).width;

          // Render garis bawah (underline)
          if (isUnderlineStyle) {
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

          // Render garis coret (strikethrough)
          if (isStrikethroughStyle) {
            ctx.save();
            ctx.strokeStyle = fontColor;
            ctx.lineWidth = Math.max(2, Math.round(baseFontSize * 0.08));
            ctx.beginPath();
            ctx.moveTo(textX - lineWidth / 2, startTextY);
            ctx.lineTo(textX + lineWidth / 2, startTextY);
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
  };

  // Jalankan perekaman dengan wall-clock time agar durasi file video persis sama dengan maxDuration
  const startTimePerf = performance.now();
  const totalDurationMs = maxDuration * 1000;
  const frameIntervalMs = 1000 / fps;

  let lastProgressUpdate = 0;

  await new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      const elapsedMs = performance.now() - startTimePerf;
      const currentSec = Math.min(elapsedMs / 1000, maxDuration);

      renderSingleFrame(currentSec);

      // Update progress setiap ~300ms
      const nowMs = performance.now();
      if (nowMs - lastProgressUpdate > 300) {
        lastProgressUpdate = nowMs;
        const pct = 25 + Math.min(68, Math.round((currentSec / maxDuration) * 68));
        onProgress(
          pct,
          `Merekam video: ${currentSec.toFixed(1)}s / ${maxDuration.toFixed(1)}s (${pct}%)`
        );
      }

      if (elapsedMs >= totalDurationMs) {
        clearInterval(timer);
        resolve();
      }
    }, frameIntervalMs);
  });

  onProgress(95, "Menyelesaikan encoding file video...");
  // Berikan jeda sedikit agar MediaRecorder menulis footer/trailer video
  await new Promise((r) => setTimeout(r, 400));

  // Hentikan dan bersihkan elemen video yang tadi dipasang ke DOM
  for (const media of loadedMedia.values()) {
    if (media instanceof HTMLVideoElement) {
      media.pause();
      if (media.parentNode) {
        media.parentNode.removeChild(media);
      }
    }
  }

  mediaRecorder.stop();
  const videoBlob = await recordingFinishedPromise;

  if (audioContext && audioContext.state !== "closed") {
    audioContext.close().catch(() => {});
  }

  onProgress(98, "Mengunduh file video ke komputer Anda...");

  // 7. Trigger download otomatis file hasil render ke komputer
  const ext = format === "mp4" ? "mp4" : format === "webm" ? "webm" : format === "mov" ? "mov" : "gif";
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const safeProjectName = (projectName || "Kreatif_Video").replace(/[^a-zA-Z0-9_\-]/g, "_");
  const filename = `${safeProjectName}_${options.ratio.replace(":", "x")}_${timestamp}.${ext}`;

  const downloadUrl = URL.createObjectURL(videoBlob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  }, 3000);

  onProgress(100, `Export Berhasil! File ${maxDuration.toFixed(1)}s tersimpan sebagai: ${filename}`);

  return { success: true };
}
