import { useState, useRef, useEffect, useCallback } from "react";
import {
  SkeletonRig,
  SKELETON_PRESET_HUMANOID,
  SKELETON_PRESET_CHAIN,
  SKELETON_PRESET_QUADRUPED,
  SKELETON_ANIM_PRESETS,
  SkeletonAnimationPreset,
} from "../../services/skeletonTypes";
import { renderDeformedSkeletonImage, autoGenerateCutoutParts } from "../../services/skeletonDeformer";
import { useProjectStore } from "../../stores/projectStore";

interface SkeletonEditorModalProps {
  onClose: () => void;
  targetClipId?: string;
  targetCharacterId?: string;
}

export default function SkeletonEditorModal({
  onClose,
  targetClipId,
  targetCharacterId,
}: SkeletonEditorModalProps) {
  const characters = useProjectStore((s) => s.characters);
  const updateCharacter = useProjectStore((s) => s.updateCharacter);
  const tracks = useProjectStore((s) => s.timeline.tracks);
  const updateClipProperties = useProjectStore((s) => s.updateClipProperties);
  const addClipToTrack = useProjectStore((s) => s.addClipToTrack);
  const addTrack = useProjectStore((s) => s.addTrack);
  const currentTime = useProjectStore((s) => s.currentTime);

  // Ambil gambar acuan dari Klip terpilih atau Karakter
  let previewImage = "";
  let initialRig: SkeletonRig = JSON.parse(JSON.stringify(SKELETON_PRESET_HUMANOID));

  if (targetClipId) {
    for (const track of tracks) {
      const c = track.clips.find((item) => item.id === targetClipId);
      if (c) {
        previewImage = c.source || "";
        if (c.skeleton) {
          initialRig = JSON.parse(JSON.stringify(c.skeleton));
        }
        break;
      }
    }
  } else if (targetCharacterId) {
    const char = characters.find((c) => c.id === targetCharacterId);
    if (char) {
      previewImage = char.avatar || "";
      if (char.skeleton) {
        initialRig = JSON.parse(JSON.stringify(char.skeleton));
      }
    }
  }

  const [customImage, setCustomImage] = useState<string>(previewImage);
  const [selectedCharId, setSelectedCharId] = useState<string>(targetCharacterId || "");
  const [rig, setRig] = useState<SkeletonRig>(initialRig);
  const [activeJointId, setActiveJointId] = useState<string | null>("head");
  const [mode, setMode] = useState<"setup" | "pose">("pose");
  const [showBones, setShowBones] = useState(true);
  const [onionSkin, setOnionSkin] = useState(false);
  const [isPlayingAnim, setIsPlayingAnim] = useState(false);
  const [selectedAnimPreset, setSelectedAnimPreset] = useState<SkeletonAnimationPreset | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragJointId, setDragJointId] = useState<string | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Animasi otomatis looping untuk memvisualisasikan gerak karakter
  useEffect(() => {
    if (!isPlayingAnim || !selectedAnimPreset) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    let startTime = performance.now();
    const cycleDuration = 1000 / (selectedAnimPreset.speed || 1.0);

    const animateLoop = (now: number) => {
      const elapsed = (now - startTime) % cycleDuration;
      const progress = elapsed / cycleDuration; // 0.0 - 1.0

      // Cari 2 keyframe animasi terdekat untuk interpolasi sudut
      const kfs = selectedAnimPreset.keyframes;
      let kfA = kfs[0];
      let kfB = kfs[kfs.length - 1];

      for (let i = 0; i < kfs.length - 1; i++) {
        if (progress >= kfs[i].phase && progress <= kfs[i + 1].phase) {
          kfA = kfs[i];
          kfB = kfs[i + 1];
          break;
        }
      }

      const range = kfB.phase - kfA.phase || 1;
      const localT = (progress - kfA.phase) / range;

      setRig((prev) => {
        const updated = prev.joints.map((j) => {
          const angleA = kfA.angles[j.id] || 0;
          const angleB = kfB.angles[j.id] || 0;
          const deltaAngle = angleA + (angleB - angleA) * localT;
          return {
            ...j,
            angle: deltaAngle,
          };
        });
        return { ...prev, joints: updated };
      });

      animFrameRef.current = requestAnimationFrame(animateLoop);
    };

    animFrameRef.current = requestAnimationFrame(animateLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlayingAnim, selectedAnimPreset]);

  // Fungsi untuk menghentikan animasi dan mengembalikan pose gambar ke keadaan awal/netral (Reset Pose)
  const handleStopAnimation = () => {
    setIsPlayingAnim(false);
    setSelectedAnimPreset(null);
    setRig((prev) => {
      const resetJoints = prev.joints.map((j) => ({ ...j, angle: 0 }));
      return { ...prev, joints: resetJoints };
    });
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  // Muat gambar ke memori untuk di-deformasi secara langsung
  useEffect(() => {
    const src = customImage || previewImage;
    if (!src) {
      loadedImageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      loadedImageRef.current = img;
      triggerCanvasRender();
    };
  }, [customImage, previewImage]);

  // Render deformasi mesh gambar setiap kali rig / sendi bergerak
  const triggerCanvasRender = useCallback(() => {
    if (!canvasRef.current || !loadedImageRef.current) return;
    renderDeformedSkeletonImage(
      canvasRef.current,
      loadedImageRef.current,
      rig
    );
  }, [rig]);

  useEffect(() => {
    triggerCanvasRender();
  }, [rig, triggerCanvasRender]);
  const handleSelectCharacter = (charId: string) => {
    setSelectedCharId(charId);
    const char = characters.find((c) => c.id === charId);
    if (char && char.avatar) {
      setCustomImage(char.avatar);
      if (char.skeleton) {
        setRig(JSON.parse(JSON.stringify(char.skeleton)));
      }
    }
  };

  // Upload gambar kustom langsung di modal
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      if (url) setCustomImage(url);
    };
    reader.readAsDataURL(file);
  };

  // Simpan perubahan ke Store (Klip atau Karakter)
  const handleSave = () => {
    const rigToSave: SkeletonRig = {
      ...rig,
      animPresetId: isPlayingAnim && selectedAnimPreset ? selectedAnimPreset.id : rig.animPresetId,
      animationSpeed: selectedAnimPreset?.speed || rig.animationSpeed || 1.0,
    };

    if (targetClipId) {
      updateClipProperties(targetClipId, { skeleton: rigToSave });
    }
    const saveTargetCharId = selectedCharId || targetCharacterId;
    if (saveTargetCharId) {
      updateCharacter(saveTargetCharId, { skeleton: rigToSave });
    }
    onClose();
  };

  // Tempelkan hasil gambar/animasi skeleton ke Timeline sebagai klip baru
  const handleInsertToTimeline = () => {
    const src = customImage || previewImage;
    if (!src) return;

    // Jika sudah mengedit klip yang ada di timeline, perbarui klip tersebut
    if (targetClipId) {
      updateClipProperties(targetClipId, { skeleton: rig });
      onClose();
      return;
    }

    // Cari track video/image, atau buat track baru jika belum ada
    let targetTrack = tracks.find((t) => t.type === "video" || t.type === "image");
    let targetTrackId = targetTrack?.id;

    if (!targetTrackId) {
      addTrack("video");
      const updatedTracks = useProjectStore.getState().timeline.tracks;
      targetTrack = updatedTracks.find((t) => t.type === "video" || t.type === "image");
      targetTrackId = targetTrack?.id;
    }

    if (targetTrackId) {
      // Pasang preset animasi yang sedang aktif (misal Walk Cycle atau Melambai) ke rig klip
      const rigToSave: SkeletonRig = {
        ...rig,
        animPresetId: isPlayingAnim && selectedAnimPreset ? selectedAnimPreset.id : undefined,
        animationSpeed: selectedAnimPreset?.speed || 1.0,
      };

      addClipToTrack(targetTrackId, {
        source: src,
        start: currentTime,
        end: currentTime + 5,
        skeleton: rigToSave,
        source_start: 0,
        source_end: 5,
      });

      // Simpan juga ke karakter jika dipilih
      const saveTargetCharId = selectedCharId || targetCharacterId;
      if (saveTargetCharId) {
        updateCharacter(saveTargetCharId, { skeleton: rigToSave });
      }

      onClose();
    }
  };

  // Muat Preset Skeleton
  const loadPreset = (preset: SkeletonRig) => {
    setRig(JSON.parse(JSON.stringify(preset)));
    setActiveJointId(preset.rootJointId);
  };

  // Drag and Drop interaktif sendi di atas canvas
  const handlePointerDown = (jointId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setActiveJointId(jointId);
    setDragJointId(jointId);
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragJointId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(2, Math.min(98, parseFloat(rawX.toFixed(1))));
    const clampedY = Math.max(2, Math.min(98, parseFloat(rawY.toFixed(1))));

    setRig((prev) => {
      const updatedJoints = prev.joints.map((j) => {
        if (j.id === dragJointId) {
          return { ...j, x: clampedX, y: clampedY };
        }
        return j;
      });
      return { ...prev, joints: updatedJoints };
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDragJointId(null);
  };

  // Rotasi sendi terpilih (Forward Kinematics)
  const handleRotateJoint = (degDelta: number) => {
    if (!activeJointId) return;
    setRig((prev) => {
      const active = prev.joints.find((j) => j.id === activeJointId);
      if (!active) return prev;

      // Cari semua turunan (children joints) yang mewarisi rotasi dari sendi ini
      const getDescendantIds = (parentId: string): string[] => {
        const children = prev.joints.filter((j) => j.parentId === parentId);
        let list: string[] = [];
        for (const child of children) {
          list.push(child.id);
          list = list.concat(getDescendantIds(child.id));
        }
        return list;
      };

      const descendantIds = new Set(getDescendantIds(activeJointId));
      const rad = (degDelta * Math.PI) / 180;
      const originX = active.x;
      const originY = active.y;

      const updatedJoints = prev.joints.map((j) => {
        if (j.id === activeJointId) {
          return { ...j, angle: (j.angle + degDelta) % 360 };
        }
        if (descendantIds.has(j.id)) {
          // Putar titik koordinat anak mengitari titik pusat sendi aktif
          const dx = j.x - originX;
          const dy = j.y - originY;
          const newX = originX + (dx * Math.cos(rad) - dy * Math.sin(rad));
          const newY = originY + (dx * Math.sin(rad) + dy * Math.cos(rad));
          return {
            ...j,
            x: Math.max(2, Math.min(98, parseFloat(newX.toFixed(1)))),
            y: Math.max(2, Math.min(98, parseFloat(newY.toFixed(1)))),
            angle: (j.angle + degDelta) % 360,
          };
        }
        return j;
      });

      return { ...prev, joints: updatedJoints };
    });
  };

  const activeJoint = rig.joints.find((j) => j.id === activeJointId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#12141a] border border-[#242836] rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="px-5 py-3.5 border-b border-[#202430] flex items-center justify-between bg-[#161922]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🦴</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-100 text-sm tracking-wide">
                  OpenToonz Skeleton & Bone Rigging Studio
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold">
                  IK / FK Puppet 2D
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Atur sendi tulang karakter dan buat pose animasi secara lentur langsung di atas gambar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInsertToTimeline}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg text-xs shadow-md transition-all flex items-center gap-1.5 border border-emerald-400/40"
              title="Masukkan karakter dan pose ini langsung ke Track Timeline"
            >
              <span>🎬</span> Tempel ke Timeline
            </button>
            <button
              onClick={handleSave}
              className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg text-xs shadow-md transition-all flex items-center gap-1.5"
              title="Simpan pengaturan rig ke karakter/klip"
            >
              <span>💾</span> Simpan Rig
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/60 transition"
              title="Tutup"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body: Sidebar Tools & Canvas Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Panel Kiri: Preset & Struktur Tulang */}
          <div className="w-64 border-r border-[#202430] bg-[#14161f] p-3.5 flex flex-col gap-3 overflow-y-auto">
            {/* Mode Pemilihan */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                Mode OpenToonz
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0c0d12] rounded-lg border border-[#1e222d]">
                <button
                  onClick={() => setMode("pose")}
                  className={`py-1.5 text-xs font-semibold rounded transition flex items-center justify-center gap-1 ${mode === "pose"
                    ? "bg-cyan-500 text-black shadow-sm"
                    : "text-gray-400 hover:text-gray-200"
                    }`}
                  title="Putar dan pose sendi untuk animasi gerak"
                >
                  <span>🤸</span> Pose Gerak
                </button>
                <button
                  onClick={() => setMode("setup")}
                  className={`py-1.5 text-xs font-semibold rounded transition flex items-center justify-center gap-1 ${mode === "setup"
                    ? "bg-amber-500 text-black shadow-sm"
                    : "text-gray-400 hover:text-gray-200"
                    }`}
                  title="Ubah posisi penempatan sendi pada gambar"
                >
                  <span>⚙️</span> Setup Rig
                </button>
              </div>
            </div>

            {/* Tombol Auto Cutout Separation ala OpenToonz Stage Schematic */}
            <div className="p-2.5 rounded-xl bg-[#171b26] border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                  <span>✂️</span> Pisah Anggota Tubuh
                </span>
                <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950 px-1 rounded border border-cyan-800">
                  OpenToonz
                </span>
              </div>
              <p className="text-[10px] text-gray-400 leading-snug">
                Pecah gambar menjadi layer anggota badan (Kepala, Badan, Tangan, Kaki) agar saat digerakkan tidak ada bagian yang robek.
              </p>
              <button
                onClick={() => {
                  const generated = autoGenerateCutoutParts(rig);
                  setRig((prev) => ({ ...prev, cutoutParts: generated }));
                  triggerCanvasRender();
                }}
                className="w-full py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg text-xs shadow transition flex items-center justify-center gap-1.5"
              >
                <span>✨</span> Auto Pisah Layer (Cutout)
              </button>
            </div>

            {/* Animasi Gerak Cepat (Walk Cycle, Waving, Idle) */}
            <div className="p-2.5 rounded-xl bg-[#171a24] border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                  <span>🎬</span> Animasi Otomatis
                </span>
              </div>

              <div className="space-y-1">
                {SKELETON_ANIM_PRESETS.map((preset) => {
                  const isActive = selectedAnimPreset?.id === preset.id && isPlayingAnim;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        if (isActive) {
                          handleStopAnimation();
                        } else {
                          setSelectedAnimPreset(preset);
                          setIsPlayingAnim(true);
                        }
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg border text-[11px] font-medium transition flex items-center justify-between ${isActive
                        ? "bg-indigo-600/30 border-indigo-400 text-white font-semibold"
                        : "bg-[#11131a] hover:bg-[#1b1f2b] border-[#222736] text-gray-300 hover:text-white"
                        }`}
                    >
                      <span className="truncate">{preset.name}</span>
                      <span className="text-[10px] font-mono text-indigo-400 shrink-0">
                        {isActive ? "⏹ Stop" : "▶ Play"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pilihan Preset Tulang */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                Preset Tulang Siap Pakai
              </label>
              <div className="space-y-1">
                {[
                  { name: "👤 Humanoid (Manusia 2D)", data: SKELETON_PRESET_HUMANOID },
                  { name: "🐾 Hewan Kaki 4 (Quadruped)", data: SKELETON_PRESET_QUADRUPED },
                  { name: "〰️ Rantai Bebas (Ekor/Belalai)", data: SKELETON_PRESET_CHAIN },
                ].map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadPreset(p.data)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#181b24] hover:bg-[#202532] border border-[#252a38] text-gray-300 hover:text-white text-[11px] font-medium transition flex items-center justify-between"
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      {p.data.joints.length} sendi
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rotasi Sendi Cepat */}
            {activeJoint && (
              <div className="p-2.5 rounded-xl bg-[#181b24] border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    Sendi: {activeJoint.name}
                  </span>
                  <span className="text-[10px] font-mono text-gray-300 font-bold">
                    {Math.round(activeJoint.angle)}°
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleRotateJoint(-15)}
                    className="flex-1 py-1 rounded bg-[#101217] hover:bg-cyan-950 text-cyan-300 border border-gray-700 hover:border-cyan-500 font-bold text-xs"
                    title="Putar Berlawanan Jarum Jam"
                  >
                    ↺ -15°
                  </button>
                  <button
                    onClick={() => handleRotateJoint(-5)}
                    className="flex-1 py-1 rounded bg-[#101217] hover:bg-cyan-950 text-cyan-300 border border-gray-700 hover:border-cyan-500 font-bold text-xs"
                  >
                    -5°
                  </button>
                  <button
                    onClick={() => handleRotateJoint(5)}
                    className="flex-1 py-1 rounded bg-[#101217] hover:bg-cyan-950 text-cyan-300 border border-gray-700 hover:border-cyan-500 font-bold text-xs"
                  >
                    +5°
                  </button>
                  <button
                    onClick={() => handleRotateJoint(15)}
                    className="flex-1 py-1 rounded bg-[#101217] hover:bg-cyan-950 text-cyan-300 border border-gray-700 hover:border-cyan-500 font-bold text-xs"
                    title="Putar Searah Jarum Jam"
                  >
                    +15° ↻
                  </button>
                </div>

                <div className="text-[9px] text-gray-400 leading-snug">
                  *Memutar sendi ini otomatis menggerakkan sendi-sendi di bawahnya (hierarki Forward Kinematics ala OpenToonz).
                </div>
              </div>
            )}

            {/* Hirarki Daftar Sendi */}
            <div className="flex-1 flex flex-col min-h-0">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Daftar Sendi Tulang ({rig.joints.length})
              </label>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 border border-[#1e222d] p-1.5 rounded-lg bg-[#0e1015]">
                {rig.joints.map((joint) => {
                  const isSelected = joint.id === activeJointId;
                  return (
                    <div
                      key={joint.id}
                      onClick={() => setActiveJointId(joint.id)}
                      className={`px-2 py-1 rounded cursor-pointer text-[10px] flex items-center justify-between transition ${isSelected
                        ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/50 font-bold"
                        : "text-gray-400 hover:bg-[#181a22] hover:text-gray-200"
                        }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: joint.color || "#06b6d4" }}
                        />
                        <span className="truncate">{joint.name}</span>
                      </div>
                      <span className="text-[8px] font-mono opacity-70">
                        {joint.parentId ? "↳" : "★"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Area Utama: Canvas Workspace */}
          <div className="flex-1 bg-[#0a0c10] flex flex-col relative overflow-hidden">
            {/* Toolbar Atas Canvas */}
            <div className="px-4 py-2 border-b border-[#1b1e28] bg-[#0e1016] flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                {/* Upload Gambar Acuan */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-[#1a1e2a] hover:bg-[#252b3c] border border-cyan-500/40 text-cyan-300 rounded text-xs font-medium flex items-center gap-1.5 transition"
                  title="Upload gambar karakter dari komputer"
                >
                  <span>📁</span> Upload Gambar
                </button>

                {/* Pilih dari Karakter Tersimpan */}
                {characters.length > 0 && (
                  <select
                    value={selectedCharId}
                    onChange={(e) => handleSelectCharacter(e.target.value)}
                    className="px-2 py-1 bg-[#151720] border border-[#262b3a] rounded text-gray-200 text-xs focus:outline-none"
                  >
                    <option value="">-- Pilih dari Karakter --</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        👤 {c.name}
                      </option>
                    ))}
                  </select>
                )}

                <div className="w-px h-3.5 bg-gray-800" />

                <label className="flex items-center gap-1.5 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBones}
                    onChange={(e) => setShowBones(e.target.checked)}
                    className="accent-cyan-500 rounded"
                  />
                  <span>Tampilkan Garis Tulang</span>
                </label>
                <label className="flex items-center gap-1.5 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onionSkin}
                    onChange={(e) => setOnionSkin(e.target.checked)}
                    className="accent-cyan-500 rounded"
                  />
                  <span>Onion Skin</span>
                </label>

                <div className="w-px h-3.5 bg-gray-800" />

                <button
                  onClick={handleStopAnimation}
                  className="px-2 py-0.5 rounded text-[11px] bg-[#1a1e28] hover:bg-[#252a38] text-gray-300 hover:text-white border border-gray-700 font-medium transition flex items-center gap-1"
                  title="Kembalikan semua rotasi sendi ke posisi semula (Reset Pose Netral)"
                >
                  <span>🔄</span> Reset Pose
                </button>
              </div>

              <div className="text-[11px] text-gray-400 flex items-center gap-2">
                <span>💡 Tarik titik bulat untuk menggerakkan atau memposisikan sendi</span>
              </div>
            </div>

            {/* Kanvas Interaktif */}
            <div
              ref={containerRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="flex-1 relative flex items-center justify-center p-4 cursor-crosshair overflow-hidden"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #1a1e2a 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            >
              {/* Kanvas Deformasi Mesh & Gambar Karakter */}
              <div className="relative max-w-full max-h-full aspect-[9/16] h-[90%] flex items-center justify-center rounded-xl overflow-hidden border border-[#212634] shadow-2xl bg-[#12141c]">
                {customImage || previewImage ? (
                  <>
                    {/* Canvas Deformasi 2D Mesh Puppet Warp */}
                    <canvas
                      ref={canvasRef}
                      width={540}
                      height={960}
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />
                  </>
                ) : (
                  <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center">
                    <span className="text-4xl mb-2">🎭</span>
                    <p className="text-xs font-semibold text-gray-400">
                      Belum Ada Gambar Acuan
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1 max-w-[200px]">
                      Klik tombol <strong>📁 Upload Gambar</strong> di atas atau pilih karakter untuk memasukkan tulang.
                    </p>
                  </div>
                )}

                {/* SVG Overlay Garis Tulang (Skeleton Bones) ala OpenToonz */}
                {showBones && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <defs>
                      <linearGradient id="boneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
                      </linearGradient>
                    </defs>

                    {rig.joints.map((joint) => {
                      if (!joint.parentId) return null;
                      const parent = rig.joints.find((p) => p.id === joint.parentId);
                      if (!parent) return null;

                      // Gambar tulang segitiga/piramida khas software animasi 2D (Spine / OpenToonz)
                      const x1 = parent.x;
                      const y1 = parent.y;
                      const x2 = joint.x;
                      const y2 = joint.y;

                      return (
                        <g key={`bone-${joint.id}`}>
                          {/* Garis tulang utama */}
                          <line
                            x1={`${x1}%`}
                            y1={`${y1}%`}
                            x2={`${x2}%`}
                            y2={`${y2}%`}
                            stroke="url(#boneGrad)"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            opacity={0.85}
                          />
                          {/* Tulang aksen neon */}
                          <line
                            x1={`${x1}%`}
                            y1={`${y1}%`}
                            x2={`${x2}%`}
                            y2={`${y2}%`}
                            stroke="#ffffff"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                            opacity={0.6}
                          />
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* Titik Sendi Interaktif (Interactive Joint Handles) */}
                {showBones &&
                  rig.joints.map((joint) => {
                    const isSelected = joint.id === activeJointId;
                    const isRoot = !joint.parentId;

                    return (
                      <div
                        key={joint.id}
                        onPointerDown={(e) => handlePointerDown(joint.id, e)}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full cursor-grab active:cursor-grabbing transition-transform ${isSelected
                          ? "ring-4 ring-cyan-400 ring-offset-2 ring-offset-black scale-125 z-30"
                          : "hover:scale-110 z-20"
                          } flex items-center justify-center`}
                        style={{
                          left: `${joint.x}%`,
                          top: `${joint.y}%`,
                          width: isRoot ? "18px" : "14px",
                          height: isRoot ? "18px" : "14px",
                          backgroundColor: joint.color || (isRoot ? "#f59e0b" : "#06b6d4"),
                          boxShadow: "0 0 8px rgba(0,0,0,0.8)",
                        }}
                        title={`${joint.name} (${Math.round(joint.angle)}°)`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm pointer-events-none" />
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
