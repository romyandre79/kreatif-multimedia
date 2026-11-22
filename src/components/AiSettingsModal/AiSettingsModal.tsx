import { useState, useEffect } from "react";
import { useProjectStore } from "../../stores/projectStore";
import {
  DEFAULT_ELEVENLABS_VOICES,
  fetchElevenLabsVoices,
  ElevenLabsVoice,
  DEFAULT_ELEVENLABS_MODELS,
  fetchElevenLabsModels,
  ElevenLabsModel,
} from "../../services/elevenlabs";

interface AiSettingsModalProps {
  onClose: () => void;
}

export default function AiSettingsModal({ onClose }: AiSettingsModalProps) {
  const aiSettings = useProjectStore((s) => s.aiSettings);
  const updateAiSettings = useProjectStore((s) => s.updateAiSettings);

  const [activeTab, setActiveTab] = useState<"tts" | "image" | "sub">("tts");
  const [ttsSettings, setTtsSettings] = useState(aiSettings.tts);
  const [imageSettings, setImageSettings] = useState(aiSettings.imageGen);
  const [subSettings, setSubSettings] = useState(aiSettings.autoSubtitle);
  const [savedNotification, setSavedNotification] = useState(false);
  const [elevenLabsVoiceList, setElevenLabsVoiceList] = useState<ElevenLabsVoice[]>(DEFAULT_ELEVENLABS_VOICES);
  const [elevenLabsModelList, setElevenLabsModelList] = useState<ElevenLabsModel[]>(DEFAULT_ELEVENLABS_MODELS);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voiceSearchQuery, setVoiceSearchQuery] = useState("");

  useEffect(() => {
    if (ttsSettings.apiKey && ttsSettings.provider === "elevenlabs") {
      setIsLoadingVoices(true);
      Promise.all([
        fetchElevenLabsVoices(ttsSettings.apiKey),
        fetchElevenLabsModels(ttsSettings.apiKey),
      ])
        .then(([voices, models]) => {
          setElevenLabsVoiceList(voices);
          setElevenLabsModelList(models);
        })
        .finally(() => setIsLoadingVoices(false));
    }
  }, [ttsSettings.apiKey, ttsSettings.provider]);

  const handleSave = () => {
    updateAiSettings({
      tts: ttsSettings,
      imageGen: imageSettings,
      autoSubtitle: subSettings,
    });
    setSavedNotification(true);
    setTimeout(() => {
      setSavedNotification(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-[580px] max-h-[85vh] flex flex-col overflow-hidden text-xs text-gray-200">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/80">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <div>
              <h2 className="text-sm font-bold text-white">AI Provider Settings</h2>
              <p className="text-[10px] text-gray-400">
                Pilih dan konfigurasi model AI Lokal (Offline) atau Cloud API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-base"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-800 bg-gray-950/60 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab("tts")}
            className={`py-2 px-3 font-medium transition-colors border-b-2 ${
              activeTab === "tts"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            🎙️ Text-To-Speech (Suara)
          </button>
          <button
            onClick={() => setActiveTab("image")}
            className={`py-2 px-3 font-medium transition-colors border-b-2 ${
              activeTab === "image"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            🖼️ Image & Video Gen
          </button>
          <button
            onClick={() => setActiveTab("sub")}
            className={`py-2 px-3 font-medium transition-colors border-b-2 ${
              activeTab === "sub"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            💬 Whisper Auto-Subtitle
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: TTS SETTINGS */}
          {activeTab === "tts" && (
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 uppercase text-[10px] font-semibold block mb-1">
                  Penyedia Layanan (Provider)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "piper_local", label: "Piper TTS (Lokal)", badge: "Offline/Gratis" },
                    { id: "elevenlabs", label: "ElevenLabs (Cloud)", badge: "HQ Voice" },
                    { id: "openai_tts", label: "OpenAI TTS", badge: "API" },
                  ].map((prov) => (
                    <button
                      key={prov.id}
                      onClick={() =>
                        setTtsSettings({ ...ttsSettings, provider: prov.id as any })
                      }
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        ttsSettings.provider === prov.id
                          ? "bg-cyan-950/60 border-cyan-500 text-cyan-200"
                          : "bg-gray-800/60 border-gray-700 text-gray-300 hover:border-gray-600"
                      }`}
                    >
                      <p className="font-semibold text-[11px]">{prov.label}</p>
                      <span className="text-[9px] text-gray-400 block mt-0.5">{prov.badge}</span>
                    </button>
                  ))}
                </div>
              </div>

              {ttsSettings.provider === "piper_local" ? (
                <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-800 space-y-2">
                  <label className="text-gray-300 font-medium block">
                    Path Model Piper ONNX Lokal
                  </label>
                  <input
                    type="text"
                    value={ttsSettings.localModelPath}
                    onChange={(e) =>
                      setTtsSettings({ ...ttsSettings, localModelPath: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded text-gray-200 font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-gray-500">
                    💡 Model offline dijalankan langsung di CPU/GPU lokal tanpa kuota internet.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-800 space-y-3">
                  <div>
                    <label className="text-gray-300 font-medium block mb-1">
                      API Key ({ttsSettings.provider.toUpperCase()})
                    </label>
                    <input
                      type="password"
                      value={ttsSettings.apiKey}
                      onChange={(e) =>
                        setTtsSettings({ ...ttsSettings, apiKey: e.target.value })
                      }
                      placeholder="sk-..."
                      className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded text-gray-200 font-mono text-[11px]"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Kunci API disimpan secara aman di konfigurasi lokal aplikasi Anda.
                    </p>
                  </div>

                  {ttsSettings.provider === "elevenlabs" && (
                    <div className="pt-2 border-t border-gray-700/60 space-y-3">
                      {/* Pilihan Model Engine TTS ElevenLabs */}
                      <div>
                        <label className="text-gray-300 font-medium text-[11px] block mb-1">
                          🧠 Model AI Engine (Multilingual / Speed)
                        </label>
                        <select
                          value={ttsSettings.elevenLabsModelId || "eleven_multilingual_v2"}
                          onChange={(e) =>
                            setTtsSettings({
                              ...ttsSettings,
                              elevenLabsModelId: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-gray-900 border border-indigo-700/60 rounded text-cyan-300 text-[11px] focus:outline-none focus:border-cyan-400 font-medium"
                        >
                          {elevenLabsModelList.map((m) => (
                            <option key={m.model_id} value={m.model_id}>
                              ⚡ {m.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Gunakan <strong>Multilingual v2</strong> untuk aksen & intonasi Bahasa Indonesia terbaik, atau <strong>Flash v2.5</strong> untuk respons super cepat.
                        </p>
                      </div>

                      {/* Pilihan Karakter Voice */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-gray-300 font-medium text-[11px] flex items-center gap-1.5">
                            <span>🎙️</span> Pilihan Suara Karakter ({elevenLabsVoiceList.length} Suara Tersedia)
                          </label>
                          {isLoadingVoices && (
                            <span className="text-[10px] text-cyan-400 animate-pulse">
                              Memuat suara dari API...
                            </span>
                          )}
                        </div>

                        {/* Search Bar Suara */}
                        <input
                          type="text"
                          placeholder="Cari suara (misal: Adam, Rachel, Bella)..."
                          value={voiceSearchQuery}
                          onChange={(e) => setVoiceSearchQuery(e.target.value)}
                          className="w-full px-2.5 py-1 bg-gray-950 border border-gray-700 rounded text-gray-200 text-[10px] focus:outline-none focus:border-cyan-400 mb-1"
                        />

                        <select
                          value={ttsSettings.elevenLabsVoiceId || "21m00Tcm4TlvDq8ikWAM"}
                          onChange={(e) =>
                            setTtsSettings({
                              ...ttsSettings,
                              elevenLabsVoiceId: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-gray-900 border border-indigo-700/60 rounded text-indigo-300 text-[11px] focus:outline-none focus:border-cyan-400"
                        >
                          {elevenLabsVoiceList
                            .filter(
                              (v) =>
                                !voiceSearchQuery.trim() ||
                                v.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
                                (v.category && v.category.toLowerCase().includes(voiceSearchQuery.toLowerCase()))
                            )
                            .map((v) => (
                              <option key={v.voice_id} value={v.voice_id}>
                                🎙️ {v.name} {v.category ? `[${v.category}]` : ""}
                              </option>
                            ))}
                        </select>

                        <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
                          <span>
                            💡 Mendukung suara library resmi, custom clone, dan community voices.
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (ttsSettings.apiKey) {
                                setIsLoadingVoices(true);
                                Promise.all([
                                  fetchElevenLabsVoices(ttsSettings.apiKey),
                                  fetchElevenLabsModels(ttsSettings.apiKey),
                                ]).then(([voices, models]) => {
                                  setElevenLabsVoiceList(voices);
                                  setElevenLabsModelList(models);
                                  setIsLoadingVoices(false);
                                });
                              }
                            }}
                            className="text-cyan-400 hover:underline flex items-center gap-1"
                          >
                            🔄 Refresh Suara
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: IMAGE & VIDEO GENERATION */}
          {activeTab === "image" && (
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 uppercase text-[10px] font-semibold block mb-1">
                  Provider Generator Gambar & Video (Flow)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "gemini_flow", label: "Google Gemini Flow (Imagen / Veo)", badge: "Google AI API" },
                    { id: "fal_ai", label: "Fal.ai (FLUX / SDXL)", badge: "Ultra Fast Cloud" },
                    { id: "comfy_local", label: "ComfyUI / SD WebUI (Lokal)", badge: "Offline GPU" },
                    { id: "openai_dalle", label: "OpenAI DALL-E 3 / Sora", badge: "Cloud" },
                    { id: "midjourney", label: "Midjourney API", badge: "Cloud" },
                  ].map((prov) => (
                    <button
                      key={prov.id}
                      onClick={() =>
                        setImageSettings({ ...imageSettings, provider: prov.id as any })
                      }
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        imageSettings.provider === prov.id
                          ? "bg-cyan-950/60 border-cyan-500 text-cyan-200"
                          : "bg-gray-800/60 border-gray-700 text-gray-300 hover:border-gray-600"
                      }`}
                    >
                      <p className="font-semibold text-[11px]">{prov.label}</p>
                      <span className="text-[9px] text-gray-400 block mt-0.5">{prov.badge}</span>
                    </button>
                  ))}
                </div>
              </div>

              {imageSettings.provider === "gemini_flow" ? (
                <div className="p-3 bg-gradient-to-br from-indigo-950/40 to-cyan-950/30 rounded-lg border border-indigo-700/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-indigo-200 font-semibold flex items-center gap-1.5">
                      <span>✨</span> Google Gemini Flow API Key
                    </label>
                    <span className="text-[10px] text-cyan-400 font-mono">Imagen 3 & Veo 2.0</span>
                  </div>
                  <input
                    type="password"
                    value={imageSettings.apiKey}
                    onChange={(e) =>
                      setImageSettings({ ...imageSettings, apiKey: e.target.value })
                    }
                    placeholder="AIzaSy..."
                    className="w-full px-2.5 py-1.5 bg-gray-900/90 border border-indigo-600/50 rounded text-gray-200 font-mono text-[11px] focus:outline-none focus:border-cyan-400"
                  />
                  <div className="text-[10px] text-gray-400 leading-relaxed space-y-1">
                    <p>
                      🔑 Dapatkan API Key gratis di{" "}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 underline hover:text-cyan-300"
                      >
                        Google AI Studio
                      </a>
                    </p>
                    <p className="text-gray-500">
                      Mendukung rendering gambar aset karakter, background scene otomatis, serta flow animasi video sinematik.
                    </p>
                  </div>
                </div>
              ) : imageSettings.provider === "comfy_local" ? (
                <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-800 space-y-2">
                  <label className="text-gray-300 font-medium block">
                    URL Endpoint ComfyUI Lokal
                  </label>
                  <input
                    type="text"
                    value={imageSettings.endpoint}
                    onChange={(e) =>
                      setImageSettings({ ...imageSettings, endpoint: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded text-gray-200 font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-gray-500">
                    Default port ComfyUI: http://127.0.0.1:8188 atau SD WebUI: http://127.0.0.1:7860
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-800 space-y-2">
                  <label className="text-gray-300 font-medium block">
                    API Key ({imageSettings.provider.toUpperCase()})
                  </label>
                  <input
                    type="password"
                    value={imageSettings.apiKey}
                    onChange={(e) =>
                      setImageSettings({ ...imageSettings, apiKey: e.target.value })
                    }
                    placeholder="API Key..."
                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded text-gray-200 font-mono text-[11px]"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUTO SUBTITLE */}
          {activeTab === "sub" && (
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 uppercase text-[10px] font-semibold block mb-1">
                  Engine Speech-To-Text Subtitle
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "whisper_local", label: "Whisper.cpp (Lokal)", badge: "Offline CPU/GPU" },
                    { id: "whisper_api", label: "OpenAI Whisper Cloud API", badge: "Cloud Fast" },
                  ].map((prov) => (
                    <button
                      key={prov.id}
                      onClick={() =>
                        setSubSettings({ ...subSettings, provider: prov.id as any })
                      }
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        subSettings.provider === prov.id
                          ? "bg-cyan-950/60 border-cyan-500 text-cyan-200"
                          : "bg-gray-800/60 border-gray-700 text-gray-300 hover:border-gray-600"
                      }`}
                    >
                      <p className="font-semibold text-[11px]">{prov.label}</p>
                      <span className="text-[9px] text-gray-400 block mt-0.5">{prov.badge}</span>
                    </button>
                  ))}
                </div>
              </div>

              {subSettings.provider === "whisper_local" ? (
                <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-800 space-y-2">
                  <label className="text-gray-300 font-medium block">Ukuran Model Whisper</label>
                  <select
                    value={subSettings.modelSize}
                    onChange={(e) =>
                      setSubSettings({ ...subSettings, modelSize: e.target.value as any })
                    }
                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded text-gray-200 text-xs"
                  >
                    <option value="tiny">Tiny (39 MB — Paling Cepat & Ringan)</option>
                    <option value="base">Base (74 MB — Seimbang & Rekomendasi)</option>
                    <option value="small">Small (244 MB — Lebih Akurat)</option>
                    <option value="medium">Medium (769 MB — Akurasi Tinggi)</option>
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-800 space-y-2">
                  <label className="text-gray-300 font-medium block">OpenAI API Key</label>
                  <input
                    type="password"
                    value={subSettings.apiKey}
                    onChange={(e) =>
                      setSubSettings({ ...subSettings, apiKey: e.target.value })
                    }
                    placeholder="sk-..."
                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded text-gray-200 font-mono text-[11px]"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-gray-800 bg-gray-900/60">
          <div className="text-[11px] text-emerald-400 font-medium">
            {savedNotification && "✓ Konfigurasi AI Berhasil Disimpan!"}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded font-medium transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition-colors shadow-lg shadow-cyan-950/40"
            >
              Simpan Pengaturan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
