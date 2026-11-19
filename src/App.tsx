import { useState } from "react";
import CharacterVault from "./components/CharacterVault/CharacterVault";
import StoryEpisode from "./components/StoryEpisode/StoryEpisode";
import CanvasPreview from "./components/CanvasPreview/CanvasPreview";
import Timeline from "./components/Timeline/Timeline";
import Inspector from "./components/Inspector/Inspector";
import ExportDialog from "./components/ExportDialog/ExportDialog";
import AiSettingsModal from "./components/AiSettingsModal/AiSettingsModal";
import Toolbar from "./components/Toolbar/Toolbar";
import { useProjectStore } from "./stores/projectStore";

function App() {
  const [activePanel, setActivePanel] = useState<"characters" | "episodes">("characters");
  const [showExport, setShowExport] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const projectTitle = useProjectStore((s) => s.meta.title);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0e0f12] text-gray-200 select-none overflow-hidden font-sans">
      {/* Top Professional Toolbar */}
      <Toolbar
        projectTitle={projectTitle}
        onExport={() => setShowExport(true)}
        onOpenAiSettings={() => setShowAiSettings(true)}
      />

      {/* Main Studio Work Area */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel — Character & Story Studio */}
        <aside className="w-80 flex flex-col border-r border-[#1d1f27] bg-[#121419]">
          {/* Segmented Tab Switcher */}
          <div className="p-2 border-b border-[#1d1f27] bg-[#101216]">
            <div className="flex bg-[#181b22] p-0.5 rounded-lg border border-[#242733]">
              <button
                onClick={() => setActivePanel("characters")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  activePanel === "characters"
                    ? "bg-[#252936] text-white shadow-sm shadow-black/40 border border-[#343949]"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span>🎭</span>
                <span>Karakter</span>
              </button>
              <button
                onClick={() => setActivePanel("episodes")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  activePanel === "episodes"
                    ? "bg-[#252936] text-white shadow-sm shadow-black/40 border border-[#343949]"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span>📝</span>
                <span>Episode</span>
              </button>
            </div>
          </div>

          {/* Panel Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activePanel === "characters" ? <CharacterVault /> : <StoryEpisode />}
          </div>
        </aside>

        {/* Center Canvas Preview Viewport */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#090a0d]">
          <CanvasPreview />
        </main>

        {/* Right Inspector Sidebar */}
        <aside className="w-80 border-l border-[#1d1f27] bg-[#121419] overflow-y-auto">
          <Inspector />
        </aside>
      </div>

      {/* Bottom Timeline Work Area */}
      <div className="h-64 border-t border-[#1d1f27] bg-[#111317]">
        <Timeline />
      </div>

      {/* Modals */}
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
      {showAiSettings && <AiSettingsModal onClose={() => setShowAiSettings(false)} />}
    </div>
  );
}

export default App;
