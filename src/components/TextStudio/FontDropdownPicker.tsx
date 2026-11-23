import { useState, useRef, useEffect } from "react";

interface FontOption {
  label: string;
  value: string;
}

interface FontDropdownPickerProps {
  value: string;
  options: FontOption[];
  onChange: (value: string) => void;
  className?: string;
}

export default function FontDropdownPicker({
  value,
  options,
  onChange,
  className = "",
}: FontDropdownPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0] || {
    label: "Pilih Font",
    value: "sans-serif",
  };

  // Close dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Tombol Pemicu Dropdown yang Menampilkan Nama & Bentuk Font Terpilih */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-[#171922] hover:bg-[#1e222e] border border-gray-700/80 rounded-lg text-left transition-colors focus:outline-none focus:border-cyan-500 shadow-sm"
      >
        <div className="flex flex-col min-w-0">
          <span
            className="text-xs text-white truncate leading-tight"
            style={{ fontFamily: selectedOption.value }}
          >
            {selectedOption.label}
          </span>
          <span className="text-[9px] text-gray-400 font-mono">
            Contoh: Aa Bb Gg 123
          </span>
        </div>
        <span className="text-gray-400 text-[10px] shrink-0">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {/* Popover Menu Dropdown dengan Live Font Preview */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 max-h-72 bg-[#12141c] border border-gray-700 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box di dalam dropdown */}
          <div className="p-2 border-b border-gray-800 bg-[#0d0e14]">
            <input
              type="text"
              placeholder="Cari jenis font..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1 bg-[#1a1c26] border border-gray-700 rounded text-gray-200 text-xs focus:outline-none focus:border-cyan-500 placeholder-gray-500"
              autoFocus
            />
          </div>

          {/* List Pilihan Font dengan Preview Bentuk Masing-Masing */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-800/60 p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((f) => {
                const isSelected = f.value === value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => {
                      onChange(f.value);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full px-2.5 py-1.5 text-left rounded-lg transition-colors flex items-center justify-between group ${
                      isSelected
                        ? "bg-cyan-950/80 border border-cyan-500/50 text-cyan-200"
                        : "hover:bg-[#1a1d29] text-gray-300 hover:text-white"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      {/* Nama Font */}
                      <div className="text-[10px] text-gray-400 group-hover:text-cyan-400">
                        {f.label}
                      </div>
                      {/* Bentuk Font Langsung Sesuai Jenis Hurufnya */}
                      <div
                        className="text-sm truncate mt-0.5 leading-snug"
                        style={{ fontFamily: f.value }}
                      >
                        The quick brown fox jumps over the lazy dog (AaBb 123)
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-cyan-400 text-xs ml-1 font-bold shrink-0">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-gray-500">
                Font tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
