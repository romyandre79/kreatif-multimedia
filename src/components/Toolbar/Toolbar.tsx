import React, { useRef, useState, useEffect } from "react";
import { useProjectStore } from "../../stores/projectStore";
import NewProjectModal from "../NewProjectModal/NewProjectModal";

interface ToolbarProps {
  projectTitle: string;
  onExport: () => void;
  onOpenAiSettings: () => void;
  onOpenGeminiFlow: () => void;
}

export default function Toolbar({ projectTitle, onExport, onOpenAiSettings, onOpenGeminiFlow }: ToolbarProps) {
  const setProjectTitle = useProjectStore((s) => s.setProjectTitle);
  const saveProjectToJson = useProjectStore((s) => s.saveProjectToJson);
  const loadProjectFromJson = useProjectStore((s) => s.loadProjectFromJson);
  const importMediaFile = useProjectStore((s) => s.importMediaFile);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore((s) => s.canUndo);
  const canRedo = useProjectStore((s) => s.canRedo);
  const autoSaveConfig = useProjectStore((s) => s.autoSaveConfig);
  const updateAutoSaveConfig = useProjectStore((s) => s.updateAutoSaveConfig);
  const triggerAutoSaveNow = useProjectStore((s) => s.triggerAutoSaveNow);

  const [notification, setNotification] = useState<string | null>(null);
  const [showAutoSaveMenu, setShowAutoSaveMenu] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const autoSaveMenuRef = useRef<HTMLDivElement>(null);

  const importFileInputRef = useRef<HTMLInputElement>(null);
  const loadProjectInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  // Close auto-save dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autoSaveMenuRef.current && !autoSaveMenuRef.current.contains(e.target as Node)) {
        setShowAutoSaveMenu(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === "s") {
          e.preventDefault();
          saveProjectToJson();
          showNotification("Proyek tersimpan");
        } else if (e.key.toLowerCase() === "z" && !e.shiftKey) {
          e.preventDefault();
          undo();
          showNotification("Undo");
        } else if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) {
          e.preventDefault();
          redo();
          showNotification("Redo");
        } else if (e.key.toLowerCase() === "i") {
          e.preventDefault();
          importFileInputRef.current?.click();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveProjectToJson, undo, redo]);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    Array.from(e.target.files).forEach((file) => {
      importMediaFile(file);
      showNotification(`Imported: ${file.name}`);
    });
    e.target.value = "";
  };

  const handleLoadProjectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        loadProjectFromJson(json);
        showNotification("Proyek dibuka");
      } catch (err) {
        alert("File proyek rusak / tidak valid.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <header className="h-12 bg-[#121418] border-b border-[#21242d] px-4 flex items-center justify-between shrink-0 select-none">
      <input
        ref={importFileInputRef}
        type="file"
        multiple
        accept="video/*,image/*,audio/*"
        onChange={handleMediaUpload}
        className="hidden"
      />
      <input
        ref={loadProjectInputRef}
        type="file"
        accept=".json"
        onChange={handleLoadProjectFile}
        className="hidden"
      />

      {/* Brand & Project Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
              <path d="M4 6.5C4 5.11929 5.11929 4 6.5 4H17.5C18.8807 4 20 5.11929 20 6.5V17.5C20 18.8807 18.8807 20 17.5 20H6.5C5.11929 20 4 18.8807 4 17.5V6.5ZM9.5 8.5V15.5L15.5 12L9.5 8.5Z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-white bg-gradient-to-r from-gray-100 to-gray-400 bg-clip-text text-transparent">
              Kreatif Studio
            </span>
            <span className="text-[10px] text-cyan-400 font-mono ml-1.5 px-1 py-0.2 bg-cyan-950/80 border border-cyan-800/60 rounded">
              v1.0
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-[#262a36] mx-1" />

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="text-xs text-gray-200 font-semibold max-w-[180px] bg-transparent hover:bg-[#1a1d26] focus:bg-[#151720] border border-transparent hover:border-[#2d3140] focus:border-cyan-500 rounded px-1.5 py-0.5 focus:outline-none transition-all truncate"
            title="Klik untuk mengubah nama proyek"
            placeholder="Nama Proyek..."
          />
          {notification && (
            <span className="text-[10px] font-medium px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full animate-pulse">
              {notification}
            </span>
          )}
        </div>
      </div>

      {/* Center Tools Group */}
      <div className="flex items-center bg-[#171920] border border-[#262933] rounded-lg p-0.5 gap-0.5">
        {/* Tombol Proyek Baru (Membuka Modal Setup) */}
        <button
          onClick={() => setShowNewProjectModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-[#1a2e26] rounded-md transition-colors"
          title="Buat Proyek Baru (Format Video, Judul, Deskripsi)"
        >
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-medium text-[11px]">Proyek Baru</span>
        </button>

        <div className="w-px h-3.5 bg-[#2a2e3b] mx-0.5" />

        <button
          onClick={() => importFileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-300 hover:text-white hover:bg-[#232631] rounded-md transition-colors"
          title="Import Media (Ctrl+I)"
        >
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-medium text-[11px]">Import</span>
        </button>

        {/* Tombol Simpan JSON Manual */}
        <button
          onClick={() => {
            saveProjectToJson();
            showNotification("File proyek disimpan & diunduh (.json)");
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/80 hover:text-cyan-200 border border-cyan-800/60 rounded-md transition-colors shadow-sm"
          title="Export / Unduh File Proyek ke .kreatif.json (Ctrl+S)"
        >
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span className="font-semibold text-[11px]">Simpan (.json)</span>
        </button>

        {/* Tombol & Menu Auto-Save Tanpa File Baru */}
        <div className="relative" ref={autoSaveMenuRef}>
          <button
            onClick={() => setShowAutoSaveMenu(!showAutoSaveMenu)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-all ${
              autoSaveConfig.enabled
                ? "text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/40"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#232631]"
            }`}
            title="Pengaturan Auto-Save (Menyimpan otomatis ke storage lokal tanpa mendownload file baru)"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoSaveConfig.enabled ? "bg-emerald-400 animate-pulse" : "bg-gray-500"}`} />
            <span className="font-medium text-[11px]">
              Auto-Save {autoSaveConfig.enabled ? `(${autoSaveConfig.intervalMinutes}m)` : "Off"}
            </span>
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu Pengaturan Auto-Save */}
          {showAutoSaveMenu && (
            <div className="absolute left-0 mt-1.5 w-64 rounded-xl bg-[#14161f] border border-[#262a3a] shadow-2xl p-3 z-50 text-xs text-gray-200 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#212433]">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <span>⏱️</span> Auto-Save Otomatis
                </span>
                <input
                  type="checkbox"
                  checked={autoSaveConfig.enabled}
                  onChange={(e) => {
                    updateAutoSaveConfig({ enabled: e.target.checked });
                    showNotification(e.target.checked ? "Auto-Save Aktif" : "Auto-Save Dimatikan");
                  }}
                  className="rounded cursor-pointer accent-emerald-500 w-4 h-4"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 block font-medium">
                  Frekuensi Simpan Otomatis:
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 5, 10].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => {
                        updateAutoSaveConfig({ intervalMinutes: mins, enabled: true });
                        showNotification(`Auto-Save diatur tiap ${mins} menit`);
                      }}
                      className={`py-1 text-[11px] font-medium rounded-lg border text-center transition-all ${
                        autoSaveConfig.intervalMinutes === mins && autoSaveConfig.enabled
                          ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 font-semibold"
                          : "bg-[#181b24] border-[#252938] text-gray-400 hover:text-white"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#212433] space-y-2">
                  <div className="text-[9px] text-gray-400 flex items-center justify-between">
                    <span>Status:</span>
                    <span className="text-emerald-400 font-mono">
                      {autoSaveConfig.lastSavedAt
                        ? `Auto-Saved (${autoSaveConfig.lastSavedAt})`
                        : "Belum tersimpan"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        triggerAutoSaveNow();
                        showNotification("Tersimpan ke Storage Lokal");
                        setShowAutoSaveMenu(false);
                      }}
                      className="flex-1 py-1 bg-[#1a1c26] hover:bg-[#252838] border border-[#2c3042] text-gray-300 rounded text-[10px] font-medium transition-colors"
                      title="Simpan ke memori browser tanpa unduh file"
                    >
                      Simpan Storage
                    </button>
                    <button
                      onClick={() => {
                        saveProjectToJson();
                        showNotification("File proyek disimpan & diunduh (.json)");
                        setShowAutoSaveMenu(false);
                      }}
                      className="flex-1 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-[10px] font-semibold transition-colors"
                      title="Unduh fisik file .kreatif.json sekarang"
                    >
                      Unduh JSON
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => loadProjectInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-[#232631] rounded-md transition-colors"
          title="Buka Proyek .kreatif.json"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
          </svg>
        </button>

        <div className="w-px h-3.5 bg-[#2a2e3b] mx-0.5" />

        <button
          onClick={undo}
          disabled={!canUndo()}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-[#232631] rounded-md disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4" />
          </svg>
        </button>

        <button
          onClick={redo}
          disabled={!canRedo()}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-[#232631] rounded-md disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
          </svg>
        </button>
      </div>

      {/* Action Buttons: AI Hub, Gemini Flow & Export */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenGeminiFlow}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-950/80 to-purple-950/80 hover:from-indigo-900/90 hover:to-purple-900/90 border border-indigo-600/40 text-indigo-300 text-xs font-semibold transition-all shadow-sm shadow-indigo-950/50 hover:border-indigo-400"
          title="Buka Google Gemini Flow Studio"
        >
          <span className="text-cyan-400">✨</span>
          <span>Gemini Flow</span>
        </button>

        <button
          onClick={onOpenAiSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181b22] hover:bg-[#222631] border border-[#2b2f3d] text-cyan-400 text-xs font-medium transition-all shadow-sm hover:border-cyan-500/40"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>AI Engine</span>
        </button>

        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>Export</span>
        </button>
      </div>

      {/* Modal Dialog Proyek Baru */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onCreated={() => showNotification("Proyek Baru Dibuat")}
      />
    </header>
  );
}
