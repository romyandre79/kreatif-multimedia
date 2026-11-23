import { useState, useRef, useEffect } from "react";
import { useProjectStore, DEFAULT_AUDIO_PROVIDERS } from "../../stores/projectStore";
import { fileToDataUrl } from "../../services/persistentMedia";
import {
  ScrapedAudioItem,
  getCachedScrapedAudios,
  syncScrapeAudiosInBackground,
  resetAndSyncAllAudios,
  getLastScrapeSyncTime,
} from "../../services/audioScraper";

interface AudioVaultProps {
  onOpenAiSettings?: () => void;
}

export default function AudioVault({ onOpenAiSettings }: AudioVaultProps) {
  const aiSettings = useProjectStore((s) => s.aiSettings);
  const addClipToTrack = useProjectStore((s) => s.addClipToTrack);
  const tracks = useProjectStore((s) => s.timeline.tracks);
  const currentTime = useProjectStore((s) => s.currentTime);

  const audioProviders = aiSettings.audioProviders || DEFAULT_AUDIO_PROVIDERS;

  const [activeTabSection, setActiveTabSection] = useState<"library" | "providers">("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // State penyimpanan Audio yang di-scrape dari storage
  const [scrapedAudios, setScrapedAudios] = useState<ScrapedAudioItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string>("");
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(getLastScrapeSyncTime());

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Muat audio langsung dari storage lokal saat pertama kali dibuka (instan tanpa delay fetch)
  useEffect(() => {
    let isMounted = true;
    getCachedScrapedAudios().then((cached) => {
      if (isMounted) {
        setScrapedAudios(cached);
        setLastSyncTime(getLastScrapeSyncTime());
      }
    });

    // Jalankan background synchronizer di latar belakang secara asinkron
    const timer = setTimeout(() => {
      syncScrapeAudiosInBackground(audioProviders, (status) => {
        if (isMounted) setSyncStatusText(status);
      }).then((updated) => {
        if (isMounted) {
          setScrapedAudios(updated);
          setLastSyncTime(getLastScrapeSyncTime());
          setSyncStatusText("");
        }
      });
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [audioProviders]);

  // Trigger sinkronisasi manual jika user ingin cek audio terbaru
  const handleManualSync = async (forceReset = false) => {
    setIsSyncing(true);
    try {
      const updated = forceReset
        ? await resetAndSyncAllAudios(audioProviders)
        : await syncScrapeAudiosInBackground(audioProviders, (status) => {
            setSyncStatusText(status);
          });
      setScrapedAudios(updated);
      setLastSyncTime(getLastScrapeSyncTime());
    } finally {
      setIsSyncing(false);
      setSyncStatusText("");
    }
  };

  const filteredAudios = scrapedAudios.filter((item) => {
    const matchCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchProvider = providerFilter === "all" || item.providerId === providerFilter;
    const matchSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sourceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tags && item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchCategory && matchProvider && matchSearch;
  });

  // Toggle pemutaran audio pratinjau di panel
  const handleTogglePlay = (audio: ScrapedAudioItem) => {
    if (playingAudioId === audio.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const player = new Audio(audio.url);
      audioPlayerRef.current = player;
      player.onended = () => setPlayingAudioId(null);
      player.onerror = (e) => {
        // Analisis spesifik error HTML5 Audio agar user tahu alasan teknis pastinya
        const mediaError = player.error;
        let reason = "Koneksi ke server audio dibatasi atau tautan offline.";
        if (mediaError) {
          switch (mediaError.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              reason = "Pemutaran dibatalkan oleh pengguna atau browser.";
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              reason = "Gagal mengunduh audio karena kendala jaringan atau server audio tujuan offline.";
              break;
            case MediaError.MEDIA_ERR_DECODE:
              reason = "Format audio terkorupsi atau tidak didukung oleh browser.";
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              reason = "Server sumber menolak akses (Hotlink Protection / HTTP 403 / CORS) atau file audio tidak ditemukan (HTTP 404).";
              break;
          }
        }

        console.warn(`[AudioVault] Gagal memutar audio "${audio.title}":`, reason, e);

        // Fallback coba putar synthetic data URL jika ada
        if (!audio.url.startsWith("data:") && audio.downloadUrl && audio.downloadUrl.startsWith("data:")) {
          const fallback = new Audio(audio.downloadUrl);
          fallback.play().then(() => {
            setPlayingAudioId(audio.id);
          }).catch(() => {
            alert(`Tidak dapat memutar audio "${audio.title}".\n\nAlasan Teknis: ${reason}\n\n(Catatan: Ini adalah proteksi dari server web penyedia asal, bukan kesalahan sistem coding aplikasi. Anda tetap bisa mencoba mengunduh file atau memasukkannya ke timeline).`);
            setPlayingAudioId(null);
          });
          return;
        }

        alert(`Tidak dapat memutar audio "${audio.title}".\n\nAlasan Teknis: ${reason}\n\n(Catatan: Kebijakan keamanan server web penyedia luar membatasi direct play dari aplikasi lain. Anda tetap dapat membuka sumber aslinya atau mengunduhnya).`);
        setPlayingAudioId(null);
      };

      player.play().catch((err) => {
        console.warn("[AudioVault] Playback catch error:", err.message);
      });
      setPlayingAudioId(audio.id);
    }
  };

  // Unduh audio ke file lokal komputer
  const handleDownload = async (audio: ScrapedAudioItem) => {
    try {
      setDownloadingId(audio.id);
      const targetUrl = audio.downloadUrl || audio.url;
      
      // Jika sudah data-url (offline safe), unduh langsung tanpa network fetch
      if (targetUrl.startsWith("data:")) {
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = targetUrl;
        a.download = `${audio.title.replace(/[^a-zA-Z0-9_\-]/g, "_")}.wav`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 1000);
        return;
      }

      const res = await fetch(targetUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${audio.title.replace(/[^a-zA-Z0-9_\-]/g, "_")}.mp3`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 2000);
    } catch (err) {
      console.warn("Gagal download audio otomatis, membuka link:", err);
      window.open(audio.downloadUrl || audio.url, "_blank");
    } finally {
      setDownloadingId(null);
    }
  };

  // Kirim audio langsung ke track Audio di Timeline
  const handleSendToTimeline = async (audio: ScrapedAudioItem) => {
    try {
      let audioTrack = tracks.find((t) => t.type === "audio");
      if (!audioTrack) {
        useProjectStore.getState().addTrack("audio");
        audioTrack = useProjectStore.getState().timeline.tracks.find((t) => t.type === "audio");
      }
      if (!audioTrack) return;

      let audioSource = audio.url;

      // Jika URL eksternal http, coba konversi ke data URL persisten agar offline-ready
      if (audio.url.startsWith("http")) {
        try {
          const res = await fetch(audio.url);
          const blob = await res.blob();
          const reader = new FileReader();
          audioSource = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn("CORS fetch fallback, memakai URL remote:", e);
        }
      }

      const dur = audio.durationSec || 5.0;

      addClipToTrack(audioTrack.id, {
        source: audioSource,
        text: audio.title,
        start: currentTime,
        end: currentTime + dur,
        maxDuration: dur,
        volume: 1.0,
      });

      alert(`✓ Audio "${audio.title}" berhasil dimasukkan ke Timeline pada detik ${currentTime.toFixed(1)}s!`);
    } catch (err: any) {
      alert(`Gagal mengirim audio ke timeline: ${err.message}`);
    }
  };

  // Upload file audio lokal ke koleksi dan simpan ke storage
  const handleLocalAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        const dataUrl = await fileToDataUrl(file);
        const tempAudio = new Audio();
        tempAudio.src = dataUrl;
        const dur = await new Promise<number>((resolve) => {
          tempAudio.onloadedmetadata = () => resolve(tempAudio.duration || 5.0);
          tempAudio.onerror = () => resolve(5.0);
        });

        const newAudio: ScrapedAudioItem = {
          id: `local-${Date.now()}-${Math.random()}`,
          title: file.name.replace(/\.[^/.]+$/, ""),
          providerId: "local_upload",
          sourceName: "Upload Lokal",
          category: "sfx",
          durationStr: `${Math.floor(dur / 60)}:${Math.floor(dur % 60).toString().padStart(2, "0")}`,
          durationSec: dur,
          url: dataUrl,
          license: "free",
          author: "User",
          tags: ["local", "upload"],
          scrapedAt: new Date().toISOString(),
        };

        const updated = [newAudio, ...scrapedAudios];
        setScrapedAudios(updated);
        // Simpan langsung ke storage
        localStorage.setItem("kreatif_scraped_audios_v1", JSON.stringify(updated));
      } catch (err) {
        console.warn("Gagal membaca audio lokal:", err);
      }
    }
  };

  return (
    <div className="flex flex-col h-full select-none text-xs text-gray-200">
      {/* Sub Header & Switcher */}
      <div className="space-y-2 mb-2.5 shrink-0">
        <div className="flex bg-[#181a22] p-0.5 rounded-lg border border-[#252834]">
          <button
            onClick={() => setActiveTabSection("library")}
            className={`flex-1 py-1 rounded text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
              activeTabSection === "library"
                ? "bg-[#272b38] text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span>🎶</span>
            <span>Audios Tersimpan ({scrapedAudios.length})</span>
          </button>
          <button
            onClick={() => setActiveTabSection("providers")}
            className={`flex-1 py-1 rounded text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
              activeTabSection === "providers"
                ? "bg-[#272b38] text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span>🌐</span>
            <span>Web Provider ({audioProviders.length})</span>
          </button>
        </div>

        {/* Sync Status Banner */}
        <div className="px-2 py-1 rounded-md bg-[#101217] border border-[#1e212b] flex items-center justify-between text-[10px] text-gray-400">
          <span className="flex items-center gap-1 truncate mr-2">
            <span className="text-emerald-400">●</span>
            <span className="truncate">
              {syncStatusText ||
                (lastSyncTime
                  ? `Storage sinkron: ${new Date(lastSyncTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Audio tersimpan di storage offline")}
            </span>
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => handleManualSync(false)}
              disabled={isSyncing}
              className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-0.5 transition-colors disabled:opacity-40"
              title="Sinkronkan audio terbaru dari web penyedia"
            >
              <span className={isSyncing ? "animate-spin" : ""}>🔄</span>
              <span>{isSyncing ? "Sinkron..." : "Sync"}</span>
            </button>
            <button
              onClick={() => handleManualSync(true)}
              disabled={isSyncing}
              className="text-gray-400 hover:text-amber-300 transition-colors text-[9px] px-1 py-0.5 rounded bg-[#181b24] border border-[#232733]"
              title="Muat ulang seluruh pustaka seed bawaan YouTube Studio & Penyedia Lainnya"
            >
              Reset Cache
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: AUDIO LIBRARY (DARI STORAGE OFFLINE) */}
      {activeTabSection === "library" && (
        <div className="flex-1 flex flex-col min-h-0 space-y-2">
          {/* Action Row: Search & Upload */}
          <div className="space-y-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Cari SFX, BGM, instrumen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-[#0e1014] border border-[#232733] rounded-lg text-gray-200 text-xs focus:border-cyan-500 focus:outline-none"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-lg bg-[#1a1d27] hover:bg-[#252937] text-gray-200 border border-[#2c3140] transition-colors flex items-center gap-1 shrink-0"
                title="Unggah File Audio Sendiri (MP3 / WAV)"
              >
                <span>📤</span>
                <span className="text-[11px]">Upload</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="audio/*"
                className="hidden"
                onChange={handleLocalAudioUpload}
              />
            </div>

            {/* Filter Penyedia & Kategori */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px]">
              {/* Category */}
              {[
                { id: "all", label: "Semua Kategori" },
                { id: "bgm", label: "🎵 BGM" },
                { id: "sfx", label: "💥 SFX" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-2 py-0.5 rounded font-medium shrink-0 transition-colors ${
                    categoryFilter === cat.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-[#14161d] text-gray-400 hover:text-gray-200 border border-[#21242e]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}

              {/* Provider Filter */}
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="px-1.5 py-0.5 bg-[#14161d] border border-[#21242e] rounded text-gray-300 text-[10px] focus:outline-none"
              >
                <option value="all">Semua Sumber Web</option>
                {audioProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audio List Container */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {filteredAudios.length === 0 ? (
              <div className="p-6 text-center text-gray-500 rounded-xl bg-[#0f1116] border border-[#1d202b]">
                <p className="text-2xl mb-1">🎧</p>
                <p className="text-xs font-semibold text-gray-300">Tidak ada audio yang cocok</p>
                <p className="text-[10px] mt-1 text-gray-500">
                  Klik tombol <strong>Sync</strong> di atas untuk memperbarui audio dari web penyedia.
                </p>
              </div>
            ) : (
              filteredAudios.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-[#13151c] border border-[#20232e] hover:border-[#2d3242] transition-colors flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="font-semibold text-gray-200 text-xs truncate" title={item.title}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono uppercase bg-[#1c1f2b] text-cyan-400 border border-[#272b3c]">
                          {item.sourceName}
                        </span>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-mono uppercase ${
                            item.license === "free"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-purple-500/10 text-purple-400"
                          }`}
                        >
                          {item.license}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {item.durationStr}
                        </span>
                      </div>
                    </div>

                    {/* Preview Play Button */}
                    <button
                      onClick={() => handleTogglePlay(item)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        playingAudioId === item.id
                          ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30 animate-pulse"
                          : "bg-[#1f222d] hover:bg-[#2b3040] text-gray-300"
                      }`}
                      title={playingAudioId === item.id ? "Jeda Suara" : "Putar Pratinjau"}
                    >
                      {playingAudioId === item.id ? "⏸" : "▶"}
                    </button>
                  </div>

                  {/* Actions: Download & Send to Timeline */}
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-[#1b1e28]">
                    <button
                      onClick={() => handleDownload(item)}
                      disabled={downloadingId === item.id}
                      className="flex-1 py-1 px-2 rounded-lg bg-[#191b24] hover:bg-[#232734] text-gray-300 text-[10px] font-medium transition-colors flex items-center justify-center gap-1 border border-[#242836]"
                    >
                      <span>📥</span>
                      <span>{downloadingId === item.id ? "Mengunduh..." : "Download"}</span>
                    </button>

                    <button
                      onClick={() => handleSendToTimeline(item)}
                      className="flex-1 py-1 px-2 rounded-lg bg-cyan-600/90 hover:bg-cyan-500 text-white text-[10px] font-semibold transition-all shadow-sm shadow-cyan-950/40 flex items-center justify-center gap-1"
                    >
                      <span>➕</span>
                      <span>Ke Timeline</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: WEB PROVIDERS LIST */}
      {activeTabSection === "providers" && (
        <div className="flex-1 flex flex-col min-h-0 space-y-2.5 overflow-hidden">
          <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-[11px] text-cyan-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>💡</span>
              <span>Kelola daftar web di menu <strong>AI Engine</strong></span>
            </span>
            {onOpenAiSettings && (
              <button
                onClick={onOpenAiSettings}
                className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-medium"
              >
                Buka
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {audioProviders.map((prov) => (
              <div
                key={prov.id}
                className="p-3 rounded-xl bg-[#13151c] border border-[#20232e] hover:border-cyan-500/40 transition-colors flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-200 text-xs truncate">
                    {prov.name}
                  </h4>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${
                      prov.category === "free"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : prov.category === "paid"
                        ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {prov.category}
                  </span>
                </div>

                <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                  {prov.description}
                </p>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[9px] text-gray-500 font-mono truncate max-w-[130px]">
                    {prov.url.replace(/^https?:\/\//, "")}
                  </span>
                  <a
                    href={prov.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-semibold transition-colors flex items-center gap-1"
                  >
                    <span>Kunjungi Web</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
