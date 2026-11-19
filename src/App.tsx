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
    <div className="flex flex-col h-screen w-screen bg-gray-950 text-gray-100">
      {/* Top Toolbar */}
      <Toolbar
        projectTitle={projectTitle}
        onExport={() => setShowExport(true)}
        onOpenAiSettings={() => setShowAiSettings(true)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel — Character Vault / Story Episode */}
        <div className="w-72 flex flex-col border-r border-gray-800 bg-gray-900">
          {/* Tab Switcher */}
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setActivePanel("characters")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activePanel === "characters"
                  ? "text-indigo-400 border-b-2 border-indigo-400 bg-gray-800/50"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              🎭 Karakter
            </button>
            <button
              onClick={() => setActivePanel("episodes")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activePanel === "episodes"
                  ? "text-indigo-400 border-b-2 border-indigo-400 bg-gray-800/50"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              📝 Episode
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activePanel === "characters" ? <CharacterVault /> : <StoryEpisode />}
          </div>
        </div>

        {/* Center — Canvas Preview */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-950">
          <CanvasPreview />
        </div>

        {/* Right Panel — Inspector / Properties */}
        <div className="w-72 border-l border-gray-800 bg-gray-900 overflow-y-auto">
          <Inspector />
        </div>
      </div>

      {/* Bottom — Timeline */}
      <div className="h-64 border-t border-gray-800 bg-gray-900">
        <Timeline />
      </div>

      {/* Export Dialog (Modal) */}
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}

      {/* AI Settings Modal */}
      {showAiSettings && <AiSettingsModal onClose={() => setShowAiSettings(false)} />}
    </div>
  );
}

export default App;
