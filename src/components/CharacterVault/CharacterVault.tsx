import { useProjectStore } from "../../stores/projectStore";

export default function CharacterVault() {
  const characters = useProjectStore((s) => s.characters);
  const addCharacter = useProjectStore((s) => s.addCharacter);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Daftar Karakter</h3>
        <button
          onClick={addCharacter}
          className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors"
        >
          + Tambah
        </button>
      </div>

      {characters.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          <div className="text-3xl mb-2">🎭</div>
          <p>Belum ada karakter.</p>
          <p className="text-xs mt-1">Klik "+ Tambah" untuk membuat karakter baru.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {characters.map((char) => (
            <div
              key={char.id}
              className="p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-indigo-500/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg shrink-0">
                  {char.avatar ? "🖼️" : "👤"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{char.name}</p>
                  <p className="text-xs text-gray-400 truncate">{char.description || "Belum ada deskripsi"}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">
                  🎤 {char.voice.engine === "piper_local" ? "Piper (Lokal)" : char.voice.engine}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">
                  🖼️ {char.assets.length} aset
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
