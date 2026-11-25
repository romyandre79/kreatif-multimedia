import { useState, useRef } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { fileToDataUrl, optimizeImageToDataUrl } from "../../services/persistentMedia";
import { addCustomAudioToStorage, ScrapedAudioItem } from "../../services/audioScraper";
import GeminiGeneratorModal from "../GeminiFlow/GeminiGeneratorModal";
import ScriptImportModal from "./ScriptImportModal";

export default function StoryEpisode() {
  const episodes = useProjectStore((s) => s.episodes);
  const characters = useProjectStore((s) => s.characters);
  const addEpisode = useProjectStore((s) => s.addEpisode);
  const updateEpisode = useProjectStore((s) => s.updateEpisode);
  const deleteEpisode = useProjectStore((s) => s.deleteEpisode);
  const addSceneToEpisode = useProjectStore((s) => s.addSceneToEpisode);
  const insertSceneAfter = useProjectStore((s) => s.insertSceneAfter);
  const updateScene = useProjectStore((s) => s.updateScene);
  const deleteScene = useProjectStore((s) => s.deleteScene);
  const reorderScenes = useProjectStore((s) => s.reorderScenes);
  const generateSceneAudio = useProjectStore((s) => s.generateSceneAudio);
  const insertSceneToTimeline = useProjectStore((s) => s.insertSceneToTimeline);

  const [selectedEpId, setSelectedEpId] = useState<string | null>(
    episodes[0]?.id || null
  );
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);

  // Search & Filter State untuk Scene
  const [searchQuery, setSearchQuery] = useState("");
  const [characterFilter, setCharacterFilter] = useState<string>("all");

  // Modal Generator AI untuk Image / Video di Scene
  const [geminiModalTarget, setGeminiModalTarget] = useState<{
    episodeId: string;
    sceneId: string;
    mode: "image" | "video";
  } | null>(null);

  // State Modal Smart Script Importer
  const [showScriptImportModal, setShowScriptImportModal] = useState(false);

  // Ref untuk file input upload image / video
  const sceneFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetScene, setUploadTargetScene] = useState<{
    episodeId: string;
    sceneId?: string; // jika undefined, berarti batch upload scene baru
    type: "image" | "video";
  } | null>(null);

  // Ref untuk file input upload audio (mp3 / wav / m4a / ogg)
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const [audioTargetScene, setAudioTargetScene] = useState<{
    episodeId: string;
    sceneId: string;
  } | null>(null);

  const activeEpisode = episodes.find((e) => e.id === selectedEpId) || null;

  // Filter scenes berdasarkan pencarian teks naskah dan filter tipe/karakter
  const filteredScenes = (activeEpisode?.scenes || []).map((scene, originalIndex) => ({
    scene,
    originalIndex,
  })).filter(({ scene }) => {
    // 1. Filter Pencarian Teks
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchScript = scene.script?.toLowerCase().includes(q);
      const matchId = scene.scene_id?.toLowerCase().includes(q);
      const char = characters.find((c) => c.id === scene.character_id);
      const matchCharName = char?.name?.toLowerCase().includes(q);
      if (!matchScript && !matchId && !matchCharName) return false;
    }

    // 2. Filter Dropdown Tipe / Karakter
    if (characterFilter !== "all") {
      if (characterFilter === "__image__") {
        if (scene.media_type !== "image") return false;
      } else if (characterFilter === "__video__") {
        if (scene.media_type !== "video") return false;
      } else if (characterFilter === "__audio__") {
        if (scene.media_type !== "audio") return false;
      } else if (characterFilter === "__narasi__") {
        if (scene.character_id !== "" || scene.media_type === "image" || scene.media_type === "video" || scene.media_type === "audio") return false;
      } else {
        if (scene.character_id !== characterFilter) return false;
      }
    }

    return true;
  });

  const handleSceneMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !uploadTargetScene || !uploadTargetScene.sceneId) return;

    try {
      const fileList = Array.from(files);

      // Upload file: file pertama mengisi slot scene yang sedang diedit
      const firstFile = fileList[0];
      let firstDataUrl = "";
      const isVideo = firstFile.type.startsWith("video/") || uploadTargetScene.type === "video";
      if (firstFile.type.startsWith("image/")) {
        firstDataUrl = await optimizeImageToDataUrl(firstFile);
      } else {
        firstDataUrl = await fileToDataUrl(firstFile);
      }

      // Dapatkan durasi aktual jika file adalah video
      let firstDuration = 3.5;
      if (isVideo) {
        firstDuration = await new Promise<number>((resolve) => {
          const v = document.createElement("video");
          v.src = firstDataUrl;
          v.onloadedmetadata = () => {
            const d = isNaN(v.duration) || !isFinite(v.duration) ? 3.5 : parseFloat(v.duration.toFixed(2));
            resolve(d);
          };
          v.onerror = () => resolve(3.5);
          setTimeout(() => resolve(3.5), 2000);
        });
      }

      updateScene(uploadTargetScene.episodeId, uploadTargetScene.sceneId, {
        media_url: firstDataUrl,
        media_type: isVideo ? "video" : "image",
        ...(isVideo ? { duration: firstDuration } : {}),
      });

      // Jika user memilih beberapa file sekaligus saat upload di scene, buatkan scene visual otomatis untuk sisa file
      for (let i = 1; i < fileList.length; i++) {
        const file = fileList[i];
        const isFileVideo = file.type.startsWith("video/");
        let dataUrl = "";
        if (file.type.startsWith("image/")) {
          dataUrl = await optimizeImageToDataUrl(file);
        } else {
          dataUrl = await fileToDataUrl(file);
        }

        let itemDuration = 3.5;
        if (isFileVideo) {
          itemDuration = await new Promise<number>((resolve) => {
            const v = document.createElement("video");
            v.src = dataUrl;
            v.onloadedmetadata = () => {
              const d = isNaN(v.duration) || !isFinite(v.duration) ? 3.5 : parseFloat(v.duration.toFixed(2));
              resolve(d);
            };
            v.onerror = () => resolve(3.5);
            setTimeout(() => resolve(3.5), 2000);
          });
        }

        addSceneToEpisode(uploadTargetScene.episodeId, {
          character_id: "",
          script: file.name.replace(/\.[^/.]+$/, ""),
          media_url: dataUrl,
          media_type: isFileVideo ? "video" : "image",
          duration: itemDuration,
        });
      }
    } catch (err) {
      console.error("Gagal upload media scene:", err);
      alert("Gagal membaca file media.");
    } finally {
      e.target.value = "";
      setUploadTargetScene(null);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !audioTargetScene) return;

    try {
      const dataUrl = await fileToDataUrl(file);

      // Hitung durasi eksak file audio
      const audio = new Audio(dataUrl);
      const dur = await new Promise<number>((resolve) => {
        audio.onloadedmetadata = () => {
          const d = isNaN(audio.duration) || !isFinite(audio.duration) ? 3.5 : parseFloat(audio.duration.toFixed(2));
          resolve(d);
        };
        audio.onerror = () => resolve(3.5);
        setTimeout(() => resolve(3.5), 2000);
      });

      // Update audio pada scene
      updateScene(audioTargetScene.episodeId, audioTargetScene.sceneId, {
        audio_url: dataUrl,
        media_url: dataUrl,
        duration: dur,
      });

      // Simpan audio manual ini ke pustaka Audios Tersimpan (AudioVault / storage)
      const audioTitle = file.name.replace(/\.[^/.]+$/, "");
      const newAudioItem: ScrapedAudioItem = {
        id: `local-episode-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: audioTitle,
        providerId: "local_upload",
        sourceName: "Upload Episode",
        category: dur > 30 ? "bgm" : "sfx",
        durationStr: `${Math.floor(dur / 60)}:${Math.floor(dur % 60).toString().padStart(2, "0")}`,
        durationSec: dur,
        url: dataUrl,
        license: "free",
        author: "User",
        tags: ["local", "episode", "upload"],
        scrapedAt: new Date().toISOString(),
      };
      addCustomAudioToStorage(newAudioItem).catch((err) => {
        console.warn("Gagal auto-simpan audio episode ke pustaka:", err);
      });
    } catch (err) {
      console.error("Gagal upload file audio:", err);
      alert("Gagal membaca file audio.");
    } finally {
      e.target.value = "";
      setAudioTargetScene(null);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3 text-xs select-none">
      {/* Hidden File Input untuk Upload Media Image / Video pada Scene */}
      <input
        ref={sceneFileInputRef}
        type="file"
        multiple
        accept={uploadTargetScene?.type === "video" ? "video/*" : "image/*,video/*,.webp,.png,.jpg,.jpeg,.heic,.heif,.mp4,.webm"}
        onChange={handleSceneMediaUpload}
        className="hidden"
      />

      {/* Hidden File Input untuk Upload File Audio Suara (MP3 / WAV / OGG / M4A) */}
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
        onChange={handleAudioUpload}
        className="hidden"
      />
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-200">📝 Episode & Naskah</h3>
          <p className="text-[10px] text-gray-400">{episodes.length} Episode Tersedia</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowScriptImportModal(true)}
            className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded font-medium text-xs flex items-center gap-1 shadow-md transition-all"
            title="Import naskah skenario teks secara otomatis (Prolog, Karakter, Dialog)"
          >
            <span>✨</span> Auto Script
          </button>
          <button
            onClick={() => {
              const newId = addEpisode();
              setSelectedEpId(newId);
            }}
            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded font-medium text-xs transition-colors"
          >
            + Episode
          </button>
        </div>
      </div>

      {/* List Episode (Horizontal Tabs) */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-gray-800">
        {episodes.map((ep) => {
          const isSelected = ep.id === selectedEpId;
          return (
            <button
              key={ep.id}
              onClick={() => setSelectedEpId(ep.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shrink-0 transition-all ${isSelected
                ? "bg-indigo-950/70 border-indigo-500 text-indigo-200"
                : "bg-gray-800/80 border-gray-700 text-gray-400 hover:text-gray-200"
                }`}
            >
              <span>🎬</span>
              <span className="font-medium truncate max-w-[120px]">{ep.title}</span>
              <span className="text-[9px] px-1 bg-gray-700/80 rounded text-gray-300">
                {ep.scenes.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Konten Episode Aktif */}
      {activeEpisode ? (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Card Info Episode */}
          <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={activeEpisode.title}
                onChange={(e) => updateEpisode(activeEpisode.id, { title: e.target.value })}
                className="font-semibold text-sm bg-transparent border-b border-transparent hover:border-gray-600 focus:border-indigo-500 focus:outline-none text-white flex-1"
                placeholder="Judul Episode..."
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (confirm(`Yakin ingin menghapus episode "${activeEpisode.title}"?`)) {
                      deleteEpisode(activeEpisode.id);
                      setSelectedEpId(episodes.find((e) => e.id !== activeEpisode.id)?.id || null);
                    }
                  }}
                  className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                  title="Hapus Episode"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-700/50">
              <span>Total: {activeEpisode.scenes.length} Scene / Dialog</span>
              <span>
                Estimasi Durasi:{" "}
                {activeEpisode.scenes.reduce((acc, s) => acc + s.duration, 0).toFixed(1)}s
              </span>
            </div>
          </div>

          {/* List Scenes / Dialog Per Episode */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold text-gray-300 text-[11px] uppercase tracking-wider shrink-0">
                🎭 Naskah Per Scene ({activeEpisode.scenes.length})
              </h4>
              <div className="flex items-center gap-1.5">
                {activeEpisode.scenes.length > 0 && (
                  <button
                    onClick={() => {
                      useProjectStore.getState().insertEpisodeToTimeline(activeEpisode.id, false);
                    }}
                    className="px-2 py-1 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/60 text-emerald-300 font-medium rounded text-[11px] transition-colors shrink-0 shadow-sm"
                    title="Masukkan semua scene dalam episode ini ke Timeline sekaligus (Audio, Visual, Subtitle)"
                  >
                    ⚡
                  </button>
                )}
                <button
                  onClick={() => addSceneToEpisode(activeEpisode.id)}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded text-[11px] transition-colors shrink-0 shadow-sm"
                >
                  + Scene
                </button>
              </div>
            </div>

            {/* Toolbar Search & Filter Scene */}
            {activeEpisode.scenes.length > 0 && (
              <div className="flex items-center gap-2 bg-[#14161f] p-1.5 rounded-lg border border-gray-800">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-2 flex items-center pointer-events-none text-gray-500 text-[11px]">
                    🔍
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari teks dialog, prompt, atau ID scene..."
                    className="w-full bg-[#1b1e2a] border border-gray-700/60 rounded pl-7 pr-6 py-1 text-[11px] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-white text-[10px]"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={characterFilter}
                  onChange={(e) => setCharacterFilter(e.target.value)}
                  className="bg-[#1b1e2a] border border-gray-700/60 text-gray-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">Semua Tipe / Karakter</option>
                  <option value="__image__">🖼️ Image Saja</option>
                  <option value="__video__">🎬 Video Saja</option>
                  <option value="__audio__">🎵 Audio Saja</option>
                  <option value="__narasi__">🎙️ Narasi Saja</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      👤 {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeEpisode.scenes.length === 0 ? (
              <div className="border border-dashed border-gray-800 rounded-lg p-5 text-center text-gray-500">
                <p className="text-xl mb-1">📝</p>
                <p>Belum ada dialog naskah di episode ini.</p>
                <button
                  onClick={() => addSceneToEpisode(activeEpisode.id)}
                  className="mt-2 px-2.5 py-1 bg-indigo-600/60 hover:bg-indigo-600 text-white rounded text-[10px]"
                >
                  Tulis Dialog Pertama
                </button>
              </div>
            ) : filteredScenes.length === 0 ? (
              <div className="border border-dashed border-gray-800 rounded-lg p-5 text-center text-gray-500">
                <p className="text-lg mb-1">🔍</p>
                <p>Tidak ada scene yang cocok dengan filter atau kata kunci "{searchQuery}".</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setCharacterFilter("all");
                  }}
                  className="mt-2 px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[10px]"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              filteredScenes.map(({ scene, originalIndex: idx }) => {
                const isGenerating = generatingAudioId === scene.scene_id;
                const canMoveUp = idx > 0;
                const canMoveDown = idx < activeEpisode.scenes.length - 1;

                return (
                  <div
                    key={scene.scene_id}
                    className="p-2.5 bg-gray-800/80 rounded-lg border border-gray-700 hover:border-gray-600 space-y-2 transition-colors"
                  >
                    {/* Header Scene: Reorder (Up/Down), Nomor & Karakter Pembicara / Narator */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {/* Tombol Reorder / Sort Up & Down */}
                        <div className="flex items-center bg-[#171922] border border-gray-700/80 rounded p-0.5">
                          <button
                            onClick={() => reorderScenes(activeEpisode.id, idx, idx - 1)}
                            disabled={!canMoveUp}
                            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-20 hover:bg-gray-700 rounded transition-colors text-[9px]"
                            title="Geser Scene ke Atas (Sort Naik)"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => reorderScenes(activeEpisode.id, idx, idx + 1)}
                            disabled={!canMoveDown}
                            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-20 hover:bg-gray-700 rounded transition-colors text-[9px]"
                            title="Geser Scene ke Bawah (Sort Turun)"
                          >
                            ▼
                          </button>
                        </div>

                        <span className="w-5 h-5 rounded-full bg-gray-700 text-[10px] flex items-center justify-center font-bold text-gray-300">
                          {idx + 1}
                        </span>

                        <select
                          value={
                            scene.media_type === "image" && !scene.character_id
                              ? "__image__"
                              : scene.media_type === "video" && !scene.character_id
                                ? "__video__"
                                : scene.media_type === "audio" && !scene.character_id
                                  ? "__audio__"
                                  : scene.character_id
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__image__") {
                              updateScene(activeEpisode.id, scene.scene_id, {
                                character_id: "",
                                media_type: "image",
                              });
                            } else if (val === "__video__") {
                              updateScene(activeEpisode.id, scene.scene_id, {
                                character_id: "",
                                media_type: "video",
                              });
                            } else if (val === "__audio__") {
                              updateScene(activeEpisode.id, scene.scene_id, {
                                character_id: "",
                                media_type: "audio",
                              });
                            } else {
                              updateScene(activeEpisode.id, scene.scene_id, {
                                character_id: val,
                                media_type: undefined,
                              });
                            }
                          }}
                          className="px-2 py-0.5 bg-gray-900 border border-gray-700 rounded text-indigo-300 text-[11px] font-medium"
                        >
                          <option value="__image__">🖼️ Image</option>
                          <option value="__video__">🎬 Video</option>
                          <option value="__audio__">🎵 Audio</option>
                          <option value="">🎙️ Narasi</option>
                          {characters.map((c) => (
                            <option key={c.id} value={c.id}>
                              👤 {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Tombol Tambah Scene tepat di sebelah scene ini (Insert After) */}
                        <button
                          onClick={() =>
                            insertSceneAfter(activeEpisode.id, scene.scene_id, {
                              character_id: scene.character_id,
                              media_type: scene.media_type,
                            })
                          }
                          className="px-1.5 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/60 text-emerald-300 hover:text-emerald-200 transition-colors text-[10px] font-semibold flex items-center gap-0.5 shadow-sm"
                          title="Tambah Scene Baru Tepat Setelah Scene Ini (+ Scene)"
                        >
                          <span>+</span>
                          <span>Scene</span>
                        </button>

                        {/* Tombol Hapus Scene (✕) */}
                        <button
                          onClick={() => deleteScene(activeEpisode.id, scene.scene_id)}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-950/60 text-gray-400 hover:text-red-400 p-0.5 transition-colors text-[11px]"
                          title="Hapus Scene Ini (✕)"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Preview / Pengaturan Media Visual (Image / Video) jika scene memilih Image atau Video */}
                    {(scene.media_type === "image" || scene.media_type === "video") && (
                      <div className="p-2 bg-[#141720] border border-cyan-900/40 rounded-md space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-cyan-400 font-medium flex items-center gap-1">
                            {scene.media_type === "image" ? "🖼️ Visual Image Scene" : "🎬 Visual Video Scene"}
                          </span>

                          <div className="flex items-center gap-1">
                            {/* Tombol Upload Media */}
                            <button
                              onClick={() => {
                                setUploadTargetScene({
                                  episodeId: activeEpisode.id,
                                  sceneId: scene.scene_id,
                                  type: scene.media_type === "video" ? "video" : "image",
                                });
                                sceneFileInputRef.current?.click();
                              }}
                              className="px-2 py-0.5 bg-[#1e2330] hover:bg-[#282e3f] text-gray-300 hover:text-white rounded text-[10px] border border-gray-700 transition-colors"
                              title="Upload file dari komputer"
                            >
                              📁 Upload {scene.media_type === "video" ? "Video" : "Gambar"}
                            </button>

                            {/* Tombol Generate AI */}
                            <button
                              onClick={() => {
                                setGeminiModalTarget({
                                  episodeId: activeEpisode.id,
                                  sceneId: scene.scene_id,
                                  mode: scene.media_type === "video" ? "video" : "image",
                                });
                              }}
                              className="px-2 py-0.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded text-[10px] font-medium transition-all shadow-sm"
                              title="Generate visual menggunakan AI Gemini"
                            >
                              ✨ Generate {scene.media_type === "video" ? "Video" : "Gambar"}
                            </button>
                          </div>
                        </div>

                        {/* Preview Media yang sudah terpilih */}
                        {scene.media_url ? (
                          <div className="relative group rounded overflow-hidden border border-gray-700 bg-black/60 flex items-center justify-center max-h-36">
                            {scene.media_type === "video" ? (
                              <video
                                src={scene.media_url}
                                className="max-h-36 w-full object-contain"
                                controls
                                muted
                              />
                            ) : (
                              <img
                                src={scene.media_url}
                                alt="Scene Visual"
                                className="max-h-36 w-full object-contain"
                              />
                            )}
                            <button
                              onClick={() =>
                                updateScene(activeEpisode.id, scene.scene_id, {
                                  media_url: "",
                                })
                              }
                              className="absolute top-1 right-1 w-5 h-5 bg-red-600/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Hapus media visual ini"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-500 italic py-1 flex items-center gap-1">
                            <span>ℹ️ Belum ada {scene.media_type === "video" ? "video" : "gambar"} terpasang. Klik tombol di kanan atas untuk upload atau generate.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Preview / Pengaturan Audio jika scene memilih Audios */}
                    {scene.media_type === "audio" && (
                      <div className="p-2 bg-[#121a24] border border-blue-900/40 rounded-md space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-blue-400 font-medium flex items-center gap-1">
                            🎵 Audio Track Scene
                          </span>

                          <div className="flex items-center gap-1">
                            {/* Tombol Upload Audio */}
                            <button
                              onClick={() => {
                                setAudioTargetScene({
                                  episodeId: activeEpisode.id,
                                  sceneId: scene.scene_id,
                                });
                                audioFileInputRef.current?.click();
                              }}
                              className="px-2 py-0.5 bg-blue-950/70 hover:bg-blue-900 text-blue-300 hover:text-white rounded text-[10px] border border-blue-700/60 transition-colors flex items-center gap-1"
                              title="Upload file audio dari komputer (.mp3, .wav, .m4a, .ogg)"
                            >
                              📁 Upload Audio
                            </button>
                          </div>
                        </div>

                        {/* Preview / Player Audio Scene */}
                        {scene.audio_url || scene.media_url ? (
                          <div className="p-2 rounded border border-gray-700/70 bg-black/40 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="text-base">🎶</span>
                              <div className="truncate">
                                <p className="text-[11px] font-semibold text-gray-200 truncate">
                                  {scene.script || "Audio Scene"}
                                </p>
                                <p className="text-[10px] text-blue-400 font-mono">
                                  Durasi: {scene.duration ? scene.duration.toFixed(1) : 0}s
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  try {
                                    const audioSrc = scene.media_url || scene.audio_url;
                                    const audio = new Audio(audioSrc);
                                    audio.volume = 1.0;
                                    audio.play().catch((err) => {
                                      alert("Gagal memutar audio: " + err.message);
                                    });
                                  } catch (e: any) {
                                    alert("Error audio: " + e.message);
                                  }
                                }}
                                className="px-2 py-0.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/60 text-emerald-300 rounded text-[10px] flex items-center gap-1 font-mono transition-colors"
                                title="Putar preview audio"
                              >
                                ▶️ Putar
                              </button>
                              <button
                                onClick={() =>
                                  updateScene(activeEpisode.id, scene.scene_id, {
                                    audio_url: "",
                                    media_url: "",
                                  })
                                }
                                className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-950/60 text-gray-400 hover:text-red-400 transition-colors text-[10px]"
                                title="Hapus audio dari scene ini"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-500 italic py-1 flex items-center gap-1">
                            <span>ℹ️ Belum ada audio terpasang. Klik tombol "📁 Upload Audio" di atas untuk memilih file audio.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Input Naskah Dialog / Narasi Cerita */}
                    <textarea
                      rows={2}
                      value={scene.script}
                      onChange={(e) =>
                        updateScene(activeEpisode.id, scene.scene_id, { script: e.target.value })
                      }
                      placeholder={
                        scene.media_type === "image"
                          ? "Tulis prompt visual gambar atau deskripsi scene..."
                          : scene.media_type === "video"
                            ? "Tulis prompt visual video atau aksi motion scene..."
                            : scene.media_type === "audio"
                              ? "Tulis judul atau catatan audio ini..."
                              : scene.character_id
                                ? "Tulis naskah dialog karakter di scene ini..."
                                : "Tulis naskah narasi / voiceover cerita di sini..."
                      }
                      className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-gray-200 text-xs focus:border-indigo-500 focus:outline-none resize-none"
                    />

                    {/* Kontrol Audio TTS & Masuk Timeline */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-700/40">
                      {/* Kontrol TTS & Upload Audio hanya muncul untuk Dialog Karakter atau Narasi */}
                      {scene.media_type !== "image" && scene.media_type !== "video" && scene.media_type !== "audio" ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={async () => {
                              if (!scene.script.trim()) {
                                alert("Tuliskan naskah dialog atau narasi terlebih dahulu!");
                                return;
                              }
                              setGeneratingAudioId(scene.scene_id);
                              await generateSceneAudio(activeEpisode.id, scene.scene_id);
                              setGeneratingAudioId(null);
                            }}
                            disabled={isGenerating || !scene.script.trim()}
                            className="flex items-center gap-1 px-2 py-0.5 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/80 border border-cyan-800/60 rounded text-[10px] disabled:opacity-50 transition-colors"
                            title="Generate audio menggunakan AI Engine"
                          >
                            {isGenerating ? "⏳ Men-generate..." : "🎙️ Generate TTS"}
                          </button>

                          {/* Tombol Upload Audio (MP3 / WAV / M4A) */}
                          <button
                            onClick={() => {
                              setAudioTargetScene({
                                episodeId: activeEpisode.id,
                                sceneId: scene.scene_id,
                              });
                              audioFileInputRef.current?.click();
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 bg-[#1a2230] hover:bg-[#243044] text-gray-300 hover:text-white border border-gray-700 rounded text-[10px] transition-colors"
                            title="Upload rekaman suara sendiri (.mp3 / .wav)"
                          >
                            📁 Upload Audio
                          </button>

                          {scene.audio_url && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  try {
                                    const audio = new Audio(scene.audio_url);
                                    audio.volume = 1.0;
                                    const playPromise = audio.play();
                                    if (playPromise !== undefined) {
                                      playPromise.catch((err) => {
                                        console.error("Audio playback error:", err);
                                        alert("Gagal memutar audio: " + err.message);
                                      });
                                    }
                                  } catch (e: any) {
                                    alert("Error instansiasi audio: " + e.message);
                                  }
                                }}
                                className="px-1.5 py-0.5 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/60 text-emerald-300 rounded text-[10px] flex items-center gap-1 font-mono transition-colors"
                                title="Klik untuk tes dengar audio ini"
                              >
                                ▶️ Tes ({scene.duration}s)
                              </button>
                              <button
                                onClick={() =>
                                  updateScene(activeEpisode.id, scene.scene_id, {
                                    audio_url: "",
                                  })
                                }
                                className="text-gray-500 hover:text-red-400 p-0.5 text-[10px] transition-colors"
                                title="Hapus audio dari scene ini"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-gray-500 italic">
                          <span>
                            {scene.media_type === "audio"
                              ? "Scene Audio Pustaka / Rekaman"
                              : `Scene Visual ${scene.media_type === "video" ? "Video" : "Gambar"}`}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => insertSceneToTimeline(activeEpisode.id, scene.scene_id, false)}
                          className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] transition-colors font-medium shadow-sm"
                          title="Tambahkan scene ini ke Timeline (Audio, Visual & Subtitle)"
                        >
                          ➡️ Timeline
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 p-4">
          <span className="text-3xl mb-2">🎬</span>
          <p>Belum ada episode yang dipilih.</p>
        </div>
      )}

      {/* Modal AI Generator Gemini Flow jika dipanggil dari Scene */}
      {geminiModalTarget && (
        <GeminiGeneratorModal
          onClose={() => setGeminiModalTarget(null)}
          onImageGenerated={(imageUrl) => {
            updateScene(geminiModalTarget.episodeId, geminiModalTarget.sceneId, {
              media_url: imageUrl,
              media_type: "image",
            });
            setGeminiModalTarget(null);
          }}
          onVideoGenerated={(videoUrl) => {
            updateScene(geminiModalTarget.episodeId, geminiModalTarget.sceneId, {
              media_url: videoUrl,
              media_type: "video",
            });
            setGeminiModalTarget(null);
          }}
        />
      )}

      {/* Modal Smart Script-to-Video Importer */}
      {showScriptImportModal && (
        <ScriptImportModal
          onClose={() => setShowScriptImportModal(false)}
          onImportComplete={(newEpId) => {
            setSelectedEpId(newEpId);
          }}
        />
      )}
    </div>
  );
}
