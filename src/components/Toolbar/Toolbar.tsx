interface ToolbarProps {
  projectTitle: string;
  onExport: () => void;
  onOpenAiSettings: () => void;
}

export default function Toolbar({ projectTitle, onExport, onOpenAiSettings }: ToolbarProps) {
  return (
    <div className="h-11 flex items-center justify-between px-3 border-b border-gray-800 bg-gray-900/90 shrink-0">
      {/* Left — Logo & Project */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-lg">🎬</span>
          <span className="text-sm font-bold text-indigo-400 tracking-tight">Kreatif Studio</span>
        </div>
        <div className="w-px h-5 bg-gray-700" />
        <span className="text-xs text-gray-400 truncate max-w-48">{projectTitle}</span>
      </div>

      {/* Center — Tools */}
      <div className="flex items-center gap-1">
        {[
          { icon: "📂", label: "Import", shortcut: "Ctrl+I" },
          { icon: "💾", label: "Simpan", shortcut: "Ctrl+S" },
          { icon: "↩️", label: "Undo", shortcut: "Ctrl+Z" },
          { icon: "↪️", label: "Redo", shortcut: "Ctrl+Y" },
          { icon: "✂️", label: "Split", shortcut: "S" },
          { icon: "🗑️", label: "Hapus", shortcut: "Del" },
        ].map((tool) => (
          <button
            key={tool.label}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 rounded
              hover:bg-gray-800 hover:text-white transition-colors"
            title={`${tool.label} (${tool.shortcut})`}
          >
            <span>{tool.icon}</span>
            <span className="hidden lg:inline">{tool.label}</span>
          </button>
        ))}
      </div>

      {/* Right — Export & AI */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenAiSettings}
          className="text-xs px-2.5 py-1 bg-cyan-900/50 text-cyan-300 rounded-md
            hover:bg-cyan-800/50 transition-colors border border-cyan-800/50"
        >
          🤖 AI Provider
        </button>
        <button
          onClick={onExport}
          className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-md
            font-medium transition-colors"
        >
          📦 Export
        </button>
      </div>
    </div>
  );
}
