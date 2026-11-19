import { useProjectStore } from "../../stores/projectStore";

export default function StoryEpisode() {
  const episodes = useProjectStore((s) => s.episodes);
  const addEpisode = useProjectStore((s) => s.addEpisode);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Episode & Naskah</h3>
        <button
          onClick={addEpisode}
          className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors"
        >
          + Episode
        </button>
      </div>

      {episodes.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          <div className="text-3xl mb-2">📝</div>
          <p>Belum ada episode.</p>
          <p className="text-xs mt-1">Klik "+ Episode" untuk memulai menulis naskah.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {episodes.map((ep) => (
            <div
              key={ep.id}
              className="p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-indigo-500/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-medium">{ep.title}</p>
                <span className="text-[10px] px-1.5 py-0.5 bg-indigo-900/50 text-indigo-300 rounded">
                  {ep.scenes.length} scene
                </span>
              </div>
              {ep.scenes.map((scene) => (
                <div key={scene.scene_id} className="ml-2 mt-1.5 pl-2 border-l-2 border-gray-700">
                  <p className="text-xs text-gray-400 truncate">
                    <span className="text-cyan-400">[{scene.character_id}]</span> {scene.script}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
