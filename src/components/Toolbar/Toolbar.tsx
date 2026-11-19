import React, { useRef, useState, useEffect } from "react";
import { useProjectStore } from "../../stores/projectStore";

interface ToolbarProps {
  projectTitle: string;
  onExport: () => void;
  onOpenAiSettings: () => void;
}

export default function Toolbar({ projectTitle, onExport, onOpenAiSettings }: ToolbarProps) {
  const saveProjectToJson = useProjectStore((s) => s.saveProjectToJson);
  const loadProjectFromJson = useProjectStore((s) => s.loadProjectFromJson);
  const importMediaFile = useProjectStore((s) => s.importMediaFile);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore((s) => s.canUndo);
  const canRedo = useProjectStore((s) => s.canRedo);
  const selectedClipId = useProjectStore((s) => s.selectedClipId);
  const currentTime = useProjectStore((s) => s.currentTime);
  const splitClipAtTime = useProjectStore((s) => s.splitClipAtTime);
  const deleteSelectedClip = useProjectStore((s) => s.deleteSelectedClip);

  const [notification, setNotification] = useState<string | null>(null);

  const importFileInputRef = useRef<HTMLInputElement>(null);
  const loadProjectInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  // Keyboard Shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y, Ctrl+I)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === "s") {
          e.preventDefault();
          saveProjectToJson();
          showNotification("💾 Proyek Berhasil Disimpan ke File!");
        } else if (e.key.toLowerCase() === "z" && !e.shiftKey) {
          e.preventDefault();
          undo();
          showNotification("↩️ Undo");
        } else if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) {
          e.preventDefault();
          redo();
          showNotification("↪️ Redo");
        } else if (e.key.toLowerCase() === "i") {
          e.preventDefault();
          importFileInputRef.current?.click();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveProjectToJson, undo, redo]);

  // Handle Import Media (Video, Gambar, Audio)
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    Array.from(e.target.files).forEach((file) => {
      importMediaFile(file);
      showNotification(`📂 Berhasil Import: ${file.name}`);
    });
    e.target.value = "";
  };

  // Handle Load Project (.kreatif.json)
  const handleLoadProjectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        loadProjectFromJson(json);
        showNotification("📂 Berhasil Memuat Proyek!");
      } catch (err) {
        alert("File proyek tidak valid atau rusak.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="h-11 flex items-center justify-between px-3 border-b border-gray-800 bg-gray-900/90 shrink-0 select-none text-xs">
      {/* Hidden file inputs */}
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

      {/* Left — Logo & Project */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-lg">🎬</span>
          <span className="text-sm font-bold text-indigo-400 tracking-tight">Kreatif Studio</span>
        </div>
        <div className="w-px h-5 bg-gray-700" />
        <span className="text-xs text-gray-400 truncate max-w-44" title={projectTitle}>
          {projectTitle}
        </span>
        {notification && (
          <span className="text-[11px] px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 rounded animate-fade-in">
            {notification}
          </span>
        )}
      </div>

      {/* Center — Tools (Import, Save, Load, Undo, Redo, Split, Delete) */}
      <div className="flex items-center gap-1">
        {/* Import Media */}
        <button
          onClick={() => importFileInputRef.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1 text-gray-300 rounded hover:bg-gray-800 hover:text-white transition-colors border border-gray-700/60"
          title="Import Video/Gambar/Audio ke Timeline (Ctrl+I)"
        >
          <span>📂</span>
          <span className="hidden md:inline">Import</span>
        </button>

        {/* Simpan Project File */}
        <button
          onClick={() => {
            saveProjectToJson();
            showNotification("💾 Proyek Berhasil Disimpan!");
          }}
          className="flex items-center gap-1 px-2.5 py-1 text-gray-300 rounded hover:bg-gray-800 hover:text-white transition-colors border border-gray-700/60"
          title="Simpan Proyek ke File .kreatif.json (Ctrl+S)"
        >
          <span>💾</span>
          <span className="hidden md:inline">Simpan</span>
        </button>

        {/* Buka Project File */}
        <button
          onClick={() => loadProjectInputRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1 text-gray-400 rounded hover:bg-gray-800 hover:text-white transition-colors"
          title="Buka Proyek dari File .kreatif.json"
        >
          <span>📁</span>
          <span className="hidden lg:inline text-[11px]">Buka Proyek</span>
        </button>

        <div className="w-px h-4 bg-gray-800 mx-1" />

        {/* Undo */}
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="flex items-center gap-1 px-2 py-1 text-gray-300 rounded hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo Riwayat (Ctrl+Z)"
        >
          <span>↩️</span>
          <span className="hidden md:inline">Undo</span>
        </button>

        {/* Redo */}
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="flex items-center gap-1 px-2 py-1 text-gray-300 rounded hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo Riwayat (Ctrl+Y)"
        >
          <span>↪️</span>
          <span className="hidden md:inline">Redo</span>
        </button>

        <div className="w-px h-4 bg-gray-800 mx-1" />

        {/* Split */}
        <button
          onClick={() => selectedClipId && splitClipAtTime(selectedClipId, currentTime)}
          disabled={!selectedClipId}
          className="flex items-center gap-1 px-2 py-1 text-gray-300 rounded hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Bagi klip pada posisi playhead (S)"
        >
          <span>✂️</span>
          <span className="hidden md:inline">Split</span>
        </button>

        {/* Delete */}
        <button
          onClick={deleteSelectedClip}
          disabled={!selectedClipId}
          className="flex items-center gap-1 px-2 py-1 text-red-400 rounded hover:bg-red-950/40 hover:text-red-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Hapus klip terpilih (Delete)"
        >
          <span>🗑️</span>
          <span className="hidden md:inline">Hapus</span>
        </button>
      </div>

      {/* Right — Export & AI */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenAiSettings}
          className="text-xs px-2.5 py-1 bg-cyan-900/50 text-cyan-300 rounded-md hover:bg-cyan-800/50 transition-colors border border-cyan-800/50"
        >
          🤖 AI Provider
        </button>
        <button
          onClick={onExport}
          className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-md font-medium transition-colors shadow-lg shadow-indigo-950/40"
        >
          📦 Export
        </button>
      </div>
    </div>
  );
}
