import React, { useState, useRef, useEffect } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { DEFAULT_ELEVENLABS_VOICES, fetchElevenLabsVoices, ElevenLabsVoice } from "../../services/elevenlabs";
import GeminiGeneratorModal from "../GeminiFlow/GeminiGeneratorModal";
import { optimizeImageToDataUrl, fileToDataUrl } from "../../services/persistentMedia";

export default function CharacterVault() {
  const characters = useProjectStore((s) => s.characters);
  const addCharacter = useProjectStore((s) => s.addCharacter);
  const updateCharacter = useProjectStore((s) => s.updateCharacter);
  const deleteCharacter = useProjectStore((s) => s.deleteCharacter);
  const addCharacterAsset = useProjectStore((s) => s.addCharacterAsset);
  const removeCharacterAsset = useProjectStore((s) => s.removeCharacterAsset);
  const addClipToTrack = useProjectStore((s) => s.addClipToTrack);
  const tracks = useProjectStore((s) => s.timeline.tracks);

  const [selectedCharId, setSelectedCharId] = useState<string | null>(
    characters[0]?.id || null
  );
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>(DEFAULT_ELEVENLABS_VOICES);
  const [voiceSearchQuery, setVoiceSearchQuery] = useState("");
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const aiSettings = useProjectStore((s) => s.aiSettings);

  useEffect(() => {
    if (aiSettings.tts.apiKey) {
      fetchElevenLabsVoices(aiSettings.tts.apiKey).then(setElevenLabsVoices);
    }
  }, [aiSettings.tts.apiKey]);

  const activeChar = characters.find((c) => c.id === selectedCharId) || null;

  // Handle upload avatar / foto profil secara persisten (Base64 Data URL)
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeChar || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    try {
      // Optimasi gambar dan jadikan data URL permanen agar tidak rusak saat refresh
      const persistentUrl = await optimizeImageToDataUrl(file);
      updateCharacter(activeChar.id, { avatar: persistentUrl });
      // Masukkan juga ke galeri aset jika belum ada
      if (!activeChar.assets.includes(persistentUrl)) {
        addCharacterAsset(activeChar.id, persistentUrl);
      }
    } catch (err) {
      console.warn("Gagal membaca foto avatar:", err);
    }
  };

  // Handle upload variasi gambar/video pose secara persisten
  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeChar || !e.target.files) return;
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        let persistentUrl = "";
        if (file.type.startsWith("image/")) {
          persistentUrl = await optimizeImageToDataUrl(file);
        } else {
          // File video/audio
          persistentUrl = await fileToDataUrl(file);
        }
        addCharacterAsset(activeChar.id, persistentUrl);
      } catch (err) {
        console.warn("Gagal membaca aset pose:", err);
      }
    }
  };

  // Helper untuk deteksi apakah sumber pose adalah video
  const isVideoAsset = (url: string) => {
    return (
      url.startsWith("data:video/") ||
      url.includes(".mp4") ||
      url.includes(".webm") ||
      url.includes(".mov") ||
      url.includes(".mkv")
    );
  };

  // Tambahkan aset karakter ke Timeline track "video" atau "image" secara instan
  const insertToTimeline = (assetUrl: string) => {
    const isVideo = isVideoAsset(assetUrl);
    // Cari track yang sesuai (video untuk file video/motion pose, image untuk gambar statis)
    let targetTrack = tracks.find((t) => t.type === (isVideo ? "video" : "image"));
    if (!targetTrack) {
      targetTrack = tracks.find((t) => t.type === "video" || t.type === "image") || tracks[0];
    }
    if (targetTrack) {
      addClipToTrack(targetTrack.id, {
        characterId: activeChar?.id,
        source: assetUrl,
        crop: { x: 0, y: 0, width: 1920, height: 1080 },
        transform: { scale: 0.8, x: 0, y: 0, rotation: 0 },
        chroma_key: {
          enabled: true,
          color: "#00FF00",
          similarity: 0.15,
          smoothness: 0.05,
        },
      });
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3 text-xs select-none">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-400">{characters.length} Karakter Tersedia</p>
        </div>
        <button
          onClick={() => {
            const newId = addCharacter({
              name: `Karakter Baru ${characters.length + 1}`,
              description: "Deskripsi penampilan, sifat, dan gaya visual...",
            });
            setSelectedCharId(newId);
          }}
          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition-colors"
        >
          + Tambah
        </button>
      </div>

      {/* List Karakter (Horizontal Chip / Grid) */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-gray-800">
        {characters.map((char) => {
          const isSelected = char.id === selectedCharId;
          return (
            <button
              key={char.id}
              onClick={() => {
                setSelectedCharId(char.id);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shrink-0 transition-all ${isSelected
                  ? "bg-indigo-950/70 border-indigo-500 text-indigo-200"
                  : "bg-gray-800/80 border-gray-700 text-gray-400 hover:text-gray-200"
                }`}
            >
              <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-700 shrink-0 flex items-center justify-center">
                {char.avatar ? (
                  <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                ) : (
                  <span>👤</span>
                )}
              </div>
              <span className="font-medium truncate max-w-[100px]">{char.name}</span>
            </button>
          );
        })}
      </div>

      {/* Detail Karakter & Galeri Aset */}
      {activeChar ? (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Card Info Utama */}
          <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/80 space-y-2.5">
            <div className="flex items-start gap-3">
              {/* Avatar Box (Bisa Diklik untuk Ganti Foto) */}
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="w-16 h-16 rounded-lg bg-gray-750 border-2 border-dashed border-gray-600 hover:border-indigo-400
                  flex flex-col items-center justify-center cursor-pointer overflow-hidden group shrink-0 relative transition-colors"
                title="Klik untuk upload foto avatar"
              >
                {activeChar.avatar ? (
                  <>
                    <img src={activeChar.avatar} alt={activeChar.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white transition-opacity">
                      Ganti
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-400 group-hover:text-indigo-300">
                    <span className="text-xl">📷</span>
                    <span className="text-[9px] block">Upload</span>
                  </div>
                )}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*,.webp,.png,.jpg,.jpeg,.heic,.heif,image/heic,image/heif"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              {/* Info Nama & Aksi */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={activeChar.name}
                    onChange={(e) => updateCharacter(activeChar.id, { name: e.target.value })}
                    className="font-semibold text-sm bg-transparent border-b border-transparent hover:border-gray-600 focus:border-indigo-500 focus:outline-none text-white w-full"
                    placeholder="Nama Karakter..."
                  />
                  <button
                    onClick={() => {
                      if (confirm(`Yakin ingin menghapus karakter "${activeChar.name}"?`)) {
                        deleteCharacter(activeChar.id);
                        setSelectedCharId(characters.find((c) => c.id !== activeChar.id)?.id || null);
                      }
                    }}
                    className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                    title="Hapus Karakter"
                  >
                    🗑️
                  </button>
                </div>

                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-400">
                  <span className="px-1.5 py-0.5 bg-gray-700/60 rounded">
                    🎙️ {activeChar.voice.voice_id}
                  </span>
                  <span className="px-1.5 py-0.5 bg-gray-700/60 rounded">
                    🖼️ {activeChar.assets.length} Pose
                  </span>
                </div>
              </div>
            </div>

            {/* Deskripsi & Penjelasan Karakter (Prompt/Lore AI) */}
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
                📖 Penjelasan / Visual Lore Karakter
              </label>
              <textarea
                rows={3}
                value={activeChar.description}
                onChange={(e) => updateCharacter(activeChar.id, { description: e.target.value })}
                placeholder="Penjelasan fisik, kepribadian, gaya pakaian, atau prompt visual konsisten untuk AI..."
                className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-gray-200 text-xs focus:border-indigo-500 focus:outline-none resize-none"
              />
            </div>

            {/* Suara Karakter (Voice Setting) */}
            <div className="space-y-2 pt-2 border-t border-gray-700/50">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">Engine Suara</label>
                  <select
                    value={activeChar.voice.engine || "inherit"}
                    onChange={(e) =>
                      updateCharacter(activeChar.id, {
                        voice: { ...activeChar.voice, engine: e.target.value },
                      })
                    }
                    className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-gray-200 text-[11px]"
                  >
                    <option value="inherit">🌐 Ikuti AI Settings Global</option>
                    <option value="elevenlabs">ElevenLabs (Cloud AI)</option>
                    <option value="piper_local">Piper TTS (Lokal Offline)</option>
                    <option value="openai_tts">OpenAI TTS (Cloud)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">Kecepatan Bicara</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={activeChar.voice.speed}
                      onChange={(e) =>
                        updateCharacter(activeChar.id, {
                          voice: { ...activeChar.voice, speed: parseFloat(e.target.value) },
                        })
                      }
                      className="w-full h-1.5 bg-gray-700 rounded appearance-none cursor-pointer accent-indigo-500"
                    />
                    <span className="font-mono text-[10px] text-gray-400 w-6">
                      {activeChar.voice.speed.toFixed(2)}x
                    </span>
                  </div>
                </div>
              </div>

              {/* Pilihan Suara Spesifik (Voice ID) jika ElevenLabs atau inherit setting global ElevenLabs */}
              {(activeChar.voice.engine === "elevenlabs" ||
                (activeChar.voice.engine === "inherit" && aiSettings.tts.provider === "elevenlabs")) && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[10px] text-gray-400 block">
                        Pilihan Suara ElevenLabs ({elevenLabsVoices.length} suara)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (aiSettings.tts.apiKey) {
                            fetchElevenLabsVoices(aiSettings.tts.apiKey).then(setElevenLabsVoices);
                          }
                        }}
                        className="text-[9px] text-cyan-400 hover:underline"
                      >
                        🔄 Refresh
                      </button>
                    </div>

                    {/* Input Pencarian Suara Karakter */}
                    <input
                      type="text"
                      placeholder="🔍 Cari suara (misal: Indonesia, Ricky, Adam)..."
                      value={voiceSearchQuery}
                      onChange={(e) => setVoiceSearchQuery(e.target.value)}
                      className="w-full px-2 py-1 bg-gray-950 border border-gray-700 focus:border-indigo-500 rounded text-gray-200 text-[10px] outline-none"
                    />

                    <select
                      value={activeChar.voice.voice_id || aiSettings.tts.elevenLabsVoiceId || "21m00Tcm4TlvDq8ikWAM"}
                      onChange={(e) =>
                        updateCharacter(activeChar.id, {
                          voice: { ...activeChar.voice, voice_id: e.target.value },
                        })
                      }
                      className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-indigo-300 text-[11px]"
                    >
                      {elevenLabsVoices
                        .filter(
                          (v) =>
                            !voiceSearchQuery.trim() ||
                            v.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
                            (v.category && v.category.toLowerCase().includes(voiceSearchQuery.toLowerCase()))
                        )
                        .map((v) => (
                          <option key={v.voice_id} value={v.voice_id}>
                            🎙️ {v.name} {v.category ? `[${v.category}]` : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
            </div>
          </div>

          {/* Galeri Gambar / Pose Karakter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-300 text-[11px] uppercase tracking-wider">
                  🖼️ Pose & Ekspresi Karakter
                </h4>
                <p className="text-[9px] text-gray-500">Klik aset untuk memasukkan ke Timeline</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowGeminiModal(true)}
                  className="px-2 py-1 bg-gradient-to-r from-indigo-900/90 to-purple-900/90 hover:from-indigo-800 hover:to-purple-800 text-cyan-300 border border-indigo-500/50 rounded text-[10px] flex items-center gap-1 transition-all shadow-sm"
                  title="Generate Pose Karakter dengan Gemini Imagen 3"
                >
                  <span>✨</span>
                  <span>Gemini Gen</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-indigo-300 border border-indigo-900/60 rounded text-[10px] transition-colors"
                >
                  + Upload Pose
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.webp,.png,.jpg,.jpeg,.heic,.heif,.mp4,.webm"
                onChange={handleAssetUpload}
                className="hidden"
              />
            </div>

            {activeChar.assets.length === 0 ? (
              <div className="border border-dashed border-gray-800 rounded-lg p-5 text-center text-gray-500">
                <p className="text-xl mb-1">🎬</p>
                <p>Belum ada media pose.</p>
                <p className="text-[10px] mt-0.5 text-gray-600">
                  Upload file Image (PNG/JPG/WebP/HEIC) atau Video (MP4/WebM) green-screen untuk karakter ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {activeChar.assets.map((asset, index) => {
                  const isVideo = isVideoAsset(asset);
                  return (
                    <div
                      key={index}
                      className="group relative aspect-square rounded-lg bg-gray-900 border border-gray-800 hover:border-indigo-500 overflow-hidden cursor-pointer"
                      onClick={() => insertToTimeline(asset)}
                      title={`Klik untuk masukkan pose ${isVideo ? "Video" : "Gambar"} ke Timeline`}
                    >
                      {isVideo ? (
                        <div className="w-full h-full relative bg-black flex items-center justify-center">
                          <video
                            src={asset}
                            muted
                            loop
                            playsInline
                            className="w-full h-full object-cover pointer-events-none"
                            onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => { })}
                            onMouseLeave={(e) => (e.target as HTMLVideoElement).pause()}
                          />
                          <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/70 text-[9px] font-mono text-cyan-300 border border-cyan-500/30 flex items-center gap-0.5">
                            🎬 Video
                          </span>
                        </div>
                      ) : (
                        <img
                          src={asset}
                          alt={`Pose ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Quick Action Overlay */}
                      <div className="absolute inset-x-0 bottom-0 p-1 bg-black/80 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isVideo && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCharacter(activeChar.id, { avatar: asset });
                            }}
                            className="text-[9px] text-indigo-300 hover:text-white"
                            title="Jadikan Avatar Utama"
                          >
                            ⭐
                          </button>
                        )}
                        {isVideo && (
                          <span className="text-[9px] text-gray-400 font-mono">
                            Motion
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCharacterAsset(activeChar.id, index);
                          }}
                          className="text-[9px] text-red-400 hover:text-red-200"
                          title="Hapus Aset Ini"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 p-4">
          <span className="text-3xl mb-2">🎭</span>
          <p>Belum ada karakter yang dipilih.</p>
        </div>
      )}
      {/* Gemini AI Generator Modal */}
      {showGeminiModal && activeChar && (
        <GeminiGeneratorModal
          targetCharacterId={activeChar.id}
          onClose={() => setShowGeminiModal(false)}
        />
      )}
    </div>
  );
}
