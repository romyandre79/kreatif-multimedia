import { useState } from "react";
import AudioVault from "./components/AudioVault/AudioVault";
import TextStudio from "./components/TextStudio/TextStudio";
import CharacterVault from "./components/CharacterVault/CharacterVault";
import StoryEpisode from "./components/StoryEpisode/StoryEpisode";
import CanvasPreview from "./components/CanvasPreview/CanvasPreview";
import Timeline from "./components/Timeline/Timeline";
import Inspector from "./components/Inspector/Inspector";
import ExportDialog from "./components/ExportDialog/ExportDialog";
import AiSettingsModal from "./components/AiSettingsModal/AiSettingsModal";
import GeminiGeneratorModal from "./components/GeminiFlow/GeminiGeneratorModal";
import LanguageManagerModal from "./components/LanguageManager/LanguageManagerModal";
import Toolbar from "./components/Toolbar/Toolbar";
import { useProjectStore } from "./stores/projectStore";
import { useTranslation } from "./stores/i18nStore";

function App() {
  const [activePanel, setActivePanel] = useState<"audios" | "text" | "characters" | "episodes">("audios");
  const [showExport, setShowExport] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [showGeminiFlow, setShowGeminiFlow] = useState(false);
  const [showLanguageManager, setShowLanguageManager] = useState(false);
  const projectTitle = useProjectStore((s) => s.meta.title);
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0e0f12] text-gray-200 select-none overflow-hidden font-sans">
      {/* Top Professional Toolbar */}
      <Toolbar
        projectTitle={projectTitle}
        onExport={() => setShowExport(true)}
        onOpenAiSettings={() => setShowAiSettings(true)}
        onOpenGeminiFlow={() => setShowGeminiFlow(true)}
        onOpenLanguageManager={() => setShowLanguageManager(true)}
      />

      {/* Main Studio Work Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Panel — Audio, Character & Story Studio */}
        <aside className="w-80 shrink-0 flex flex-col border-r border-[#1d1f27] bg-[#121419] overflow-hidden">
          {/* Segmented Tab Switcher */}
          <div className="p-2 border-b border-[#1d1f27] bg-[#101216] shrink-0">
            <div className="flex bg-[#181b22] p-0.5 rounded-lg border border-[#242733]">
              <button
                onClick={() => setActivePanel("audios")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
                  activePanel === "audios"
                    ? "bg-[#252936] text-white shadow-sm shadow-black/40 border border-[#343949]"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span>🎵</span>
                <span>{t("tab.audios", "Audios")}</span>
              </button>
              <button
                onClick={() => setActivePanel("text")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
                  activePanel === "text"
                    ? "bg-[#252936] text-white shadow-sm shadow-black/40 border border-[#343949]"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span>🔤</span>
                <span>{t("tab.text", "Text")}</span>
              </button>
              <button
                onClick={() => setActivePanel("characters")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
                  activePanel === "characters"
                    ? "bg-[#252936] text-white shadow-sm shadow-black/40 border border-[#343949]"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span>🎭</span>
                <span>{t("tab.characters", "Karakter")}</span>
              </button>
              <button
                onClick={() => setActivePanel("episodes")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
                  activePanel === "episodes"
                    ? "bg-[#252936] text-white shadow-sm shadow-black/40 border border-[#343949]"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span>📝</span>
                <span>{t("tab.episodes", "Episode")}</span>
              </button>
            </div>
          </div>

          {/* Panel Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activePanel === "audios" ? (
              <AudioVault onOpenAiSettings={() => setShowAiSettings(true)} />
            ) : activePanel === "text" ? (
              <TextStudio />
            ) : activePanel === "characters" ? (
              <CharacterVault />
            ) : (
              <StoryEpisode />
            )}
          </div>
        </aside>

        {/* Center Canvas Preview Viewport */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#090a0d] overflow-hidden">
          <CanvasPreview />
        </main>

        {/* Right Inspector Sidebar */}
        <aside className="w-72 shrink-0 border-l border-[#1d1f27] bg-[#121419] overflow-y-auto">
          <Inspector />
        </aside>
      </div>

      {/* Bottom Timeline Work Area */}
      <div className="h-60 shrink-0 border-t border-[#1d1f27] bg-[#111317] overflow-hidden">
        <Timeline />
      </div>

      {/* Modals */}
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
      {showAiSettings && <AiSettingsModal onClose={() => setShowAiSettings(false)} />}
      {showGeminiFlow && <GeminiGeneratorModal onClose={() => setShowGeminiFlow(false)} />}
      {showLanguageManager && (
        <LanguageManagerModal onClose={() => setShowLanguageManager(false)} />
      )}
    </div>
  );
}

export default App;
