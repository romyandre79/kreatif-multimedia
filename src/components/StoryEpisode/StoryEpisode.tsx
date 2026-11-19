import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";

export default function StoryEpisode() {
  const episodes = useProjectStore((s) => s.episodes);
  const characters = useProjectStore((s) => s.characters);
  const addEpisode = useProjectStore((s) => s.addEpisode);
  const updateEpisode = useProjectStore((s) => s.updateEpisode);
  const deleteEpisode = useProjectStore((s) => s.deleteEpisode);
  const addSceneToEpisode = useProjectStore((s) => s.addSceneToEpisode);
  const updateScene = useProjectStore((s) => s.updateScene);
  const deleteScene = useProjectStore((s) => s.deleteScene);
  const generateSceneAudio = useProjectStore((s) => s.generateSceneAudio);
  const insertSceneToTimeline = useProjectStore((s) => s.insertSceneToTimeline);
  const insertEpisodeToTimeline = useProjectStore((s) => s.insertEpisodeToTimeline);

  const [selectedEpId, setSelectedEpId] = useState<string | null>(
    episodes[0]?.id || null
  );
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);

  const activeEpisode = episodes.find((e) => e.id === selectedEpId) || null;

  return (
    <div className="flex flex-col h-full space-y-3 text-xs select-none">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-200">📝 Episode & Naskah</h3>
          <p className="text-[10px] text-gray-400">{episodes.length} Episode Tersedia</p>
        </div>
        <button
          onClick={() => {
            const newId = addEpisode();
            setSelectedEpId(newId);
          }}
          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition-colors"
        >
          + Episode
        </button>
      </div>

      {/* List Episode (Horizontal Tabs) */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-gray-800">
        {episodes.map((ep) => {
          const isSelected = ep.id === selectedEpId;
          return (
            <button
              key={ep.id}
              onClick={() => setSelectedEpId(ep.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shrink-0 transition-all ${
                isSelected
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
                  onClick={() => insertEpisodeToTimeline(activeEpisode.id)}
                  className="px-2 py-0.5 bg-indigo-600/80 hover:bg-indigo-500 text-white text-[10px] rounded transition-colors"
                  title="Kirim semua naskah & audio episode ini langsung ke Timeline"
                >
                  ⚡ Masukkan Semua ke Timeline
                </button>
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
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-300 text-[11px] uppercase tracking-wider">
                🎭 Naskah Per Scene / Beat
              </h4>
              <button
                onClick={() => addSceneToEpisode(activeEpisode.id)}
                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-indigo-300 border border-indigo-900/60 rounded text-[10px] transition-colors"
              >
                + Tambah Scene
              </button>
            </div>

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
            ) : (
              activeEpisode.scenes.map((scene, idx) => {
                const isGenerating = generatingAudioId === scene.scene_id;

                return (
                  <div
                    key={scene.scene_id}
                    className="p-2.5 bg-gray-800/80 rounded-lg border border-gray-700 hover:border-gray-600 space-y-2 transition-colors"
                  >
                    {/* Header Scene: Nomor & Karakter Pembicara */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-gray-700 text-[10px] flex items-center justify-center font-bold text-gray-300">
                          {idx + 1}
                        </span>
                        <select
                          value={scene.character_id}
                          onChange={(e) =>
                            updateScene(activeEpisode.id, scene.scene_id, {
                              character_id: e.target.value,
                            })
                          }
                          className="px-2 py-0.5 bg-gray-900 border border-gray-700 rounded text-indigo-300 text-[11px] font-medium"
                        >
                          <option value="">-- Pilih Karakter --</option>
                          {characters.map((c) => (
                            <option key={c.id} value={c.id}>
                              👤 {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => deleteScene(activeEpisode.id, scene.scene_id)}
                        className="text-gray-500 hover:text-red-400 p-1 transition-colors text-[11px]"
                        title="Hapus Scene"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Input Naskah Dialog Cerita */}
                    <textarea
                      rows={2}
                      value={scene.script}
                      onChange={(e) =>
                        updateScene(activeEpisode.id, scene.scene_id, { script: e.target.value })
                      }
                      placeholder="Tulis naskah dialog karakter di scene ini..."
                      className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-gray-200 text-xs focus:border-indigo-500 focus:outline-none resize-none"
                    />

                    {/* Kontrol Audio TTS & Masuk Timeline */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-700/40">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            setGeneratingAudioId(scene.scene_id);
                            await generateSceneAudio(activeEpisode.id, scene.scene_id);
                            setGeneratingAudioId(null);
                          }}
                          disabled={isGenerating || !scene.character_id}
                          className="flex items-center gap-1 px-2 py-0.5 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/80 border border-cyan-800/60 rounded text-[10px] disabled:opacity-50 transition-colors"
                        >
                          {isGenerating ? "⏳ Sedang Men-generate..." : "🎙️ Generate Audio TTS"}
                        </button>

                        {scene.audio_url && (
                          <span className="text-[9px] text-emerald-400 flex items-center gap-1 font-mono">
                            ✓ Audio Ready ({scene.duration}s)
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => insertSceneToTimeline(activeEpisode.id, scene.scene_id)}
                        className="px-2 py-0.5 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded text-[10px] transition-colors"
                        title="Tambahkan scene ini ke Timeline saat ini"
                      >
                        ➡️ Timeline
                      </button>
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
    </div>
  );
}
