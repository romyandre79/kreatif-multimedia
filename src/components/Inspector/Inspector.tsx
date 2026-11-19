export default function Inspector() {
  return (
    <div className="p-3 space-y-4">
      <h3 className="text-sm font-semibold text-gray-300 border-b border-gray-800 pb-2">
        🔧 Inspector
      </h3>

      {/* Transform Section */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Transform</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Pos X", value: "0" },
            { label: "Pos Y", value: "0" },
            { label: "Scale", value: "100%" },
            { label: "Rotation", value: "0°" },
          ].map((field) => (
            <div key={field.label}>
              <label className="text-[10px] text-gray-500 block mb-0.5">{field.label}</label>
              <input
                type="text"
                defaultValue={field.value}
                className="w-full text-xs px-2 py-1.5 bg-gray-800 border border-gray-700 rounded
                  focus:border-indigo-500 focus:outline-none text-gray-200"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Crop Section */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Crop</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "X", value: "0" },
            { label: "Y", value: "0" },
            { label: "Width", value: "1920" },
            { label: "Height", value: "1080" },
          ].map((field) => (
            <div key={field.label}>
              <label className="text-[10px] text-gray-500 block mb-0.5">{field.label}</label>
              <input
                type="text"
                defaultValue={field.value}
                className="w-full text-xs px-2 py-1.5 bg-gray-800 border border-gray-700 rounded
                  focus:border-indigo-500 focus:outline-none text-gray-200"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Chroma Key Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Chroma Key</p>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer
              peer-checked:after:translate-x-full peer-checked:bg-indigo-600
              after:content-[''] after:absolute after:top-[2px] after:left-[2px]
              after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all" />
          </label>
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Key Color</label>
            <div className="flex gap-2">
              <input type="color" defaultValue="#00FF00" className="w-8 h-7 rounded cursor-pointer bg-transparent" />
              <input
                type="text"
                defaultValue="#00FF00"
                className="flex-1 text-xs px-2 py-1.5 bg-gray-800 border border-gray-700 rounded
                  focus:border-indigo-500 focus:outline-none text-gray-200"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Similarity</label>
            <input type="range" min="0" max="1" step="0.01" defaultValue="0.15"
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Smoothness</label>
            <input type="range" min="0" max="0.5" step="0.01" defaultValue="0.05"
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
          </div>
        </div>
      </div>

      {/* Transition Section */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Transisi</p>
        <div>
          <label className="text-[10px] text-gray-500 block mb-0.5">Tipe</label>
          <select className="w-full text-xs px-2 py-1.5 bg-gray-800 border border-gray-700 rounded
            focus:border-indigo-500 focus:outline-none text-gray-200">
            <option value="none">Tidak Ada</option>
            <option value="fade_in">Fade In</option>
            <option value="fade_out">Fade Out</option>
            <option value="cross_dissolve">Cross Dissolve</option>
            <option value="wipe_left">Wipe Left</option>
            <option value="wipe_right">Wipe Right</option>
            <option value="slide_up">Slide Up</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-0.5">Durasi (detik)</label>
          <input
            type="number"
            defaultValue="0.5"
            step="0.1"
            min="0.1"
            max="3"
            className="w-full text-xs px-2 py-1.5 bg-gray-800 border border-gray-700 rounded
              focus:border-indigo-500 focus:outline-none text-gray-200"
          />
        </div>
      </div>

      {/* Volume (Audio) */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Audio</p>
        <div>
          <label className="text-[10px] text-gray-500 block mb-0.5">Volume</label>
          <input type="range" min="0" max="2" step="0.01" defaultValue="1"
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Fade In (s)</label>
            <input type="number" defaultValue="0" step="0.1" min="0"
              className="w-full text-xs px-2 py-1.5 bg-gray-800 border border-gray-700 rounded
                focus:border-indigo-500 focus:outline-none text-gray-200" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Fade Out (s)</label>
            <input type="number" defaultValue="0" step="0.1" min="0"
              className="w-full text-xs px-2 py-1.5 bg-gray-800 border border-gray-700 rounded
                focus:border-indigo-500 focus:outline-none text-gray-200" />
          </div>
        </div>
      </div>

      {/* Info placeholder */}
      <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <p className="text-[10px] text-gray-500 text-center">
          Pilih klip di Timeline untuk melihat propertinya
        </p>
      </div>
    </div>
  );
}
