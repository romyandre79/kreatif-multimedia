/**
 * LanguageManagerModal.tsx
 * Modal Manajemen Bahasa & Editor Kamus Terjemahan (CRUD)
 * Memungkinkan pengguna untuk:
 * 1. Melihat semua paket bahasa (Indonesia, English, dll)
 * 2. Menambah bahasa baru (misal: Jepang 🇯🇵, Spanyol 🇪🇸, Jerman 🇩🇪, dll)
 * 3. Mengedit metadata bahasa (nama & emoji bendera)
 * 4. Mengedit isi terjemahan per kata/frasa secara langsung (inline editing)
 * 5. Menambah key terjemahan baru ke seluruh bahasa
 * 6. Menghapus bahasa atau key terjemahan
 * 7. Reset ke pengaturan awal
 */

import { useState } from "react";
import { useI18nStore } from "../../stores/i18nStore";

interface LanguageManagerModalProps {
  onClose: () => void;
}

export default function LanguageManagerModal({ onClose }: LanguageManagerModalProps) {
  const {
    currentLanguage,
    languages,
    setLanguage,
    addLanguage,
    deleteLanguage,
    updateTranslation,
    addTranslationKey,
    deleteTranslationKey,
    resetToDefaults,
  } = useI18nStore();

  const [activeLangTab, setActiveLangTab] = useState<string>(currentLanguage);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddLangDialog, setShowAddLangDialog] = useState(false);
  const [showAddKeyDialog, setShowAddKeyDialog] = useState(false);

  // Form New Language
  const [newLangCode, setNewLangCode] = useState("");
  const [newLangName, setNewLangName] = useState("");
  const [newLangFlag, setNewLangFlag] = useState("🌐");
  const [baseCopyLang, setBaseCopyLang] = useState("en");

  // Form New Key
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyDefaultVal, setNewKeyDefaultVal] = useState("");

  const activePack = languages.find((l) => l.code === activeLangTab) || languages[0];

  const handleCreateLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLangCode.trim() || !newLangName.trim()) {
      alert("Kode dan nama bahasa wajib diisi!");
      return;
    }
    const cleanCode = newLangCode.trim().toLowerCase();
    addLanguage(
      {
        code: cleanCode,
        name: newLangName.trim(),
        flag: newLangFlag.trim() || "🌐",
      },
      baseCopyLang
    );
    setActiveLangTab(cleanCode);
    setShowAddLangDialog(false);
    setNewLangCode("");
    setNewLangName("");
    setNewLangFlag("🌐");
  };

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      alert("Nama Key wajib diisi!");
      return;
    }
    const cleanKey = newKeyName.trim();
    addTranslationKey(cleanKey, {
      id: newKeyDefaultVal.trim() || cleanKey,
      en: newKeyDefaultVal.trim() || cleanKey,
      [activeLangTab]: newKeyDefaultVal.trim() || cleanKey,
    });
    setShowAddKeyDialog(false);
    setNewKeyName("");
    setNewKeyDefaultVal("");
  };

  // Filter translation keys
  const allKeys = Object.keys(activePack?.translations || {});
  const filteredKeys = allKeys.filter(
    (k) =>
      k.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (activePack?.translations[k] || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#14161f] border border-gray-700/80 rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden text-gray-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900/90 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Multi-Language & Translation Manager (CRUD)
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                  {languages.length} Bahasa Terdaftar
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                Ganti bahasa aktif, buat bahasa baru, atau sesuaikan setiap kata/kalimat terjemahan sesuai kebutuhan Anda.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Kolom Kiri: Daftar Bahasa */}
          <aside className="w-64 border-r border-gray-800 bg-[#0f1118] p-3 flex flex-col justify-between">
            <div className="space-y-2 overflow-y-auto">
              <div className="flex items-center justify-between pb-1 border-b border-gray-800/80">
                <span className="text-xs font-semibold text-gray-300">Pilih / Edit Bahasa</span>
                <button
                  onClick={() => setShowAddLangDialog(true)}
                  className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold transition flex items-center gap-1"
                  title="Tambah Bahasa Baru"
                >
                  <span>+</span> Baru
                </button>
              </div>

              <div className="space-y-1.5">
                {languages.map((pack) => {
                  const isCurrentActive = currentLanguage === pack.code;
                  const isTabSelected = activeLangTab === pack.code;
                  return (
                    <div
                      key={pack.code}
                      onClick={() => setActiveLangTab(pack.code)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all group ${
                        isTabSelected
                          ? "bg-cyan-950/70 border-cyan-500/80 text-cyan-200 shadow-sm"
                          : "bg-[#161822] border-gray-800 text-gray-300 hover:border-gray-700"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 font-semibold">
                          <span className="text-base">{pack.flag}</span>
                          <span className="truncate">{pack.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-gray-500 uppercase">{pack.code}</span>
                          {isCurrentActive && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 rounded font-bold">
                              Aktif
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isCurrentActive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLanguage(pack.code);
                            }}
                            className="px-2 py-0.5 bg-gray-800 hover:bg-emerald-600 text-gray-300 hover:text-white rounded text-[10px] font-medium transition"
                            title="Jadikan bahasa tampilan aktif"
                          >
                            Pilih
                          </button>
                        )}
                        {!pack.isDefault && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Hapus bahasa ${pack.name}?`)) {
                                deleteLanguage(pack.code);
                              }
                            }}
                            className="p-1 text-gray-500 hover:text-red-400 transition"
                            title="Hapus bahasa ini"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tombol Reset Bawaan */}
            <div className="pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Kembalikan seluruh kamus bahasa ke bawaan awal?")) {
                    resetToDefaults();
                  }
                }}
                className="w-full py-1.5 px-3 bg-gray-800/80 hover:bg-red-950/60 hover:text-red-300 text-gray-400 rounded-lg text-[11px] transition text-center border border-gray-700/50"
              >
                🔄 Reset Kamus Bawaan
              </button>
            </div>
          </aside>

          {/* Kolom Kanan: Editor Kamus Terjemahan (Table / Card) */}
          <main className="flex-1 flex flex-col min-w-0 bg-[#13151f] overflow-hidden">
            {/* Toolbar Kamus */}
            <div className="p-3.5 border-b border-gray-800 bg-[#10121a] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="🔍 Cari kata kunci (key) atau kalimat terjemahan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#171924] border border-gray-700/80 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddKeyDialog(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg text-xs shadow transition flex items-center gap-1.5"
                >
                  <span>+</span> Tambah Kunci (Key)
                </button>
                <div className="text-[11px] text-gray-400 font-mono">
                  {filteredKeys.length} dari {allKeys.length} teks
                </div>
              </div>
            </div>

            {/* List Tabel Terjemahan */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="rounded-xl border border-gray-800 overflow-hidden bg-[#11131c]">
                <table className="w-full text-left text-xs text-gray-300 border-collapse">
                  <thead className="bg-[#171a25] text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                    <tr>
                      <th className="py-2.5 px-3 w-1/3">Kunci (Identifier)</th>
                      <th className="py-2.5 px-3">
                        Terjemahan ({activePack?.flag} {activePack?.name})
                      </th>
                      <th className="py-2.5 px-3 w-14 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-sans">
                    {filteredKeys.length > 0 ? (
                      filteredKeys.map((key) => {
                        const val = activePack?.translations[key] || "";
                        return (
                          <tr key={key} className="hover:bg-gray-800/30 transition-colors">
                            <td className="py-2 px-3 font-mono text-[11px] text-cyan-400/90 break-all select-all">
                              {key}
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={val}
                                onChange={(e) => updateTranslation(activePack.code, key, e.target.value)}
                                className="w-full px-2 py-1 bg-[#181a24] border border-gray-700/60 rounded text-gray-200 text-xs focus:outline-none focus:border-cyan-500 focus:bg-[#1f2230] transition"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Hapus teks kunci "${key}" dari seluruh bahasa?`)) {
                                    deleteTranslationKey(key);
                                  }
                                }}
                                className="text-gray-500 hover:text-red-400 p-1 transition"
                                title="Hapus teks kunci ini"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center py-10 text-gray-500 text-xs">
                          Tidak ditemukan teks terjemahan yang sesuai dengan pencarian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>

        {/* Modal Dialog: Tambah Bahasa Baru */}
        {showAddLangDialog && (
          <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateLanguage}
              className="bg-[#171a25] border border-gray-700 rounded-xl p-5 w-full max-w-sm space-y-3.5 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>🌐</span> Tambah Bahasa Baru
              </h3>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Kode Bahasa (ISO 2 Huruf):</label>
                <input
                  type="text"
                  placeholder="Misal: ja, es, de, fr, ar..."
                  value={newLangCode}
                  onChange={(e) => setNewLangCode(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#10121a] border border-gray-700 rounded text-xs text-white uppercase focus:outline-none focus:border-cyan-500"
                  maxLength={5}
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Nama Bahasa:</label>
                <input
                  type="text"
                  placeholder="Misal: Japanese, Spanish, Deutsch..."
                  value={newLangName}
                  onChange={(e) => setNewLangName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#10121a] border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Emoji Bendera:</label>
                <input
                  type="text"
                  placeholder="Misal: 🇯🇵, 🇪🇸, 🇩🇪, 🇫🇷..."
                  value={newLangFlag}
                  onChange={(e) => setNewLangFlag(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#10121a] border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Salin Terjemahan Awal Dari:</label>
                <select
                  value={baseCopyLang}
                  onChange={(e) => setBaseCopyLang(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#10121a] border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name} ({l.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLangDialog(false)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-xs transition shadow"
                >
                  Buat Bahasa
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal Dialog: Tambah Teks Kunci (Key) Baru */}
        {showAddKeyDialog && (
          <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateKey}
              className="bg-[#171a25] border border-gray-700 rounded-xl p-5 w-full max-w-sm space-y-3.5 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>➕</span> Tambah Teks Kunci (Key) Baru
              </h3>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Nama Identifier Key:</label>
                <input
                  type="text"
                  placeholder="Misal: button.download_now, alert.welcome..."
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#10121a] border border-gray-700 rounded text-xs text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Nilai Teks Terjemahan Awal:</label>
                <input
                  type="text"
                  placeholder="Misal: Unduh Sekarang / Download Now"
                  value={newKeyDefaultVal}
                  onChange={(e) => setNewKeyDefaultVal(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#10121a] border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddKeyDialog(false)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-xs transition shadow"
                >
                  Simpan Kunci
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
