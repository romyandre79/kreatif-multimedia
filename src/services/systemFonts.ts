// Daftar font sistem operasi paling populer (Windows, macOS, Linux)
export const COMMON_SYSTEM_FONTS: { label: string; value: string; os?: string }[] = [
  // --- Standard Sans-Serif OS Fonts ---
  { label: "Arial", value: "Arial, sans-serif", os: "Win / Mac" },
  { label: "Calibri", value: "Calibri, sans-serif", os: "Windows" },
  { label: "Segoe UI", value: "'Segoe UI', sans-serif", os: "Windows" },
  { label: "Tahoma", value: "Tahoma, sans-serif", os: "Windows" },
  { label: "Verdana", value: "Verdana, sans-serif", os: "Win / Mac" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif", os: "Win / Mac" },
  { label: "Helvetica", value: "'Helvetica Neue', Helvetica, sans-serif", os: "macOS" },
  { label: "Century Gothic", value: "'Century Gothic', sans-serif", os: "Win / Mac" },
  { label: "Franklin Gothic Medium", value: "'Franklin Gothic Medium', sans-serif", os: "Windows" },
  { label: "Ubuntu", value: "Ubuntu, sans-serif", os: "Linux" },

  // --- Display & Bold Heading OS Fonts ---
  { label: "Impact (Meme / Bold)", value: "Impact, sans-serif", os: "Win / Mac" },
  { label: "Arial Black", value: "'Arial Black', sans-serif", os: "Win / Mac" },
  { label: "Haettenschweiler", value: "Haettenschweiler, sans-serif", os: "Windows" },

  // --- Serif OS Fonts ---
  { label: "Times New Roman", value: "'Times New Roman', serif", os: "Win / Mac" },
  { label: "Georgia", value: "Georgia, serif", os: "Win / Mac" },
  { label: "Garamond", value: "Garamond, serif", os: "Win / Mac" },
  { label: "Palatino Linotype", value: "'Palatino Linotype', serif", os: "Windows" },
  { label: "Baskerville", value: "Baskerville, serif", os: "macOS" },
  { label: "Cambria", value: "Cambria, serif", os: "Windows" },
  { label: "Book Antiqua", value: "'Book Antiqua', serif", os: "Windows" },

  // --- Monospace / Terminal OS Fonts ---
  { label: "Consolas", value: "Consolas, monospace", os: "Windows" },
  { label: "Courier New", value: "'Courier New', monospace", os: "Win / Mac" },
  { label: "Lucida Console", value: "'Lucida Console', monospace", os: "Windows" },
  { label: "Monaco", value: "Monaco, monospace", os: "macOS" },

  // --- Script & Fun OS Fonts ---
  { label: "Comic Sans MS", value: "'Comic Sans MS', cursive", os: "Win / Mac" },
  { label: "Lucida Handwriting", value: "'Lucida Handwriting', cursive", os: "Windows" },
  { label: "Brush Script MT", value: "'Brush Script MT', cursive", os: "Win / Mac" },
  { label: "Copperplate Gothic", value: "'Copperplate Gothic Bold', sans-serif", os: "Windows" },
  { label: "Papyrus", value: "Papyrus, fantasy", os: "Win / Mac" },
];

/**
 * Mengambil seluruh font yang terpasang di sistem operasi user menggunakan
 * Web Local Font Access API (window.queryLocalFonts).
 * Didukung di Chrome, Edge, Chromium pada Windows / macOS / Linux.
 */
export async function getOperatingSystemFonts(): Promise<{ label: string; value: string }[]> {
  const result: Map<string, { label: string; value: string }> = new Map();

  // Masukkan daftar umum terlebih dahulu
  for (const font of COMMON_SYSTEM_FONTS) {
    result.set(font.label.toLowerCase(), { label: font.label, value: font.value });
  }

  // Jika browser mendukung Local Font Access API
  if (typeof window !== "undefined" && "queryLocalFonts" in window) {
    try {
      const localFonts = await (window as any).queryLocalFonts();
      const uniqueFamilies = new Set<string>();

      for (const f of localFonts) {
        if (f.family && !uniqueFamilies.has(f.family)) {
          uniqueFamilies.add(f.family);
          result.set(f.family.toLowerCase(), {
            label: `${f.family} (OS)`,
            value: `"${f.family}", sans-serif`,
          });
        }
      }
    } catch (e) {
      console.warn("User menolak akses queryLocalFonts atau dibatalkan:", e);
    }
  }

  return Array.from(result.values()).sort((a, b) => a.label.localeCompare(b.label));
}
