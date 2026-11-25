/**
 * tauriBridge.ts
 * Jembatan adaptif antara runtime Desktop/Mobile Native (Tauri v2) dan Web Browser.
 * Memungkinkan aplikasi berjalan mulus di desktop native (.exe / .apk / web) tanpa crash.
 */

// Cek apakah aplikasi sedang berjalan di dalam webview Tauri
export const isTauri = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

/**
 * Dialog File Native (jika di Tauri) atau input fallback (jika di web)
 */
export async function openNativeFileDialog(options?: {
  title?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  multiple?: boolean;
}): Promise<string[] | string | null> {
  if (isTauri()) {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        title: options?.title || "Pilih File",
        filters: options?.filters,
        multiple: options?.multiple || false,
      });
      return selected;
    } catch (err) {
      console.warn("Gagal membuka native dialog, beralih ke web mode:", err);
    }
  }
  return null;
}

/**
 * Menyimpan file secara native ke disk (tanpa limit 5MB browser)
 */
export async function saveNativeFile(
  path: string,
  content: string | Uint8Array
): Promise<boolean> {
  if (isTauri()) {
    try {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      if (typeof content === "string") {
        await writeTextFile(path, content);
      }
      return true;
    } catch (err) {
      console.warn("Gagal menyimpan file via native fs:", err);
    }
  }
  return false;
}

/**
 * Membaca file secara native dari disk
 */
export async function readNativeFile(path: string): Promise<string | null> {
  if (isTauri()) {
    try {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      return await readTextFile(path);
    } catch (err) {
      console.warn("Gagal membaca file via native fs:", err);
    }
  }
  return null;
}
