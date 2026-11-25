// Service penyimpanan persisten project & media lokal menggunakan IndexedDB
// Menyimpan proyek beserta data video/audio/gambar berukuran besar tanpa batasan kuota 5MB localStorage

const DB_NAME = "kreatif_studio_db";
const MEDIA_STORE = "media_files";
const PROJECT_STORE = "project_state";
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB tidak didukung pada browser ini."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        db.createObjectStore(MEDIA_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Konversi File atau Blob ke format Data URL (Base64)
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Helper untuk mendeteksi apakah file adalah HEIC/HEIF
export function isHeicFile(file: File | Blob): boolean {
  const type = (file.type || "").toLowerCase();
  const name = "name" in file ? ((file as File).name || "").toLowerCase() : "";
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

// Mengonversi file HEIC/HEIF menjadi Blob JPEG menggunakan dynamic converter
async function convertHeicToBlob(file: File | Blob): Promise<Blob> {
  // Jika browser native (misal Safari pada macOS/iOS) sudah bisa memuat HEIC langsung, fallback ke file asli
  try {
    // Muat heic2any secara dinamis dari window atau dynamic import/CDN bila diperlukan
    if (typeof window !== "undefined") {
      let heic2any = (window as unknown as { heic2any?: (options: { blob: Blob; toType?: string; quality?: number }) => Promise<Blob | Blob[]> }).heic2any;
      if (!heic2any) {
        // Load dynamically via script tag CDN jika belum ada
        await new Promise<void>((res, rej) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
          script.onload = () => res();
          script.onerror = () => rej(new Error("Gagal mengunduh converter HEIC"));
          document.head.appendChild(script);
        });
        heic2any = (window as unknown as { heic2any?: (options: { blob: Blob; toType?: string; quality?: number }) => Promise<Blob | Blob[]> }).heic2any;
      }

      if (heic2any) {
        const converted = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.9,
        });
        return Array.isArray(converted) ? converted[0] : converted;
      }
    }
  } catch (err) {
    console.warn("Gagal konversi HEIC via heic2any, mencoba membaca langsung:", err);
  }
  return file;
}

// Kompresi gambar besar agar muat dan sangat ringan (hemat RAM & mencegah out of memory)
export async function optimizeImageToDataUrl(
  file: File,
  maxWidth = 1440,
  maxHeight = 900,
  quality = 0.82
): Promise<string> {
  let sourceBlob: Blob = file;

  // Tangani file HEIC/HEIF secara otomatis dengan konversi ke format JPEG yang didukung semua browser/canvas
  if (isHeicFile(file)) {
    sourceBlob = await convertHeicToBlob(file);
  }

  const fileType = sourceBlob.type || file.type || "";
  if (
    (!fileType.startsWith("image/") && !isHeicFile(file)) ||
    fileType.includes("gif") ||
    fileType.includes("svg")
  ) {
    return fileToDataUrl(sourceBlob);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(sourceBlob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        fileToDataUrl(file).then(resolve).catch(reject);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      let mime = "image/jpeg";
      if (file.type === "image/png") {
        mime = "image/png";
      } else if (file.type === "image/webp") {
        mime = "image/webp";
      }
      const resultDataUrl = canvas.toDataURL(mime, quality);
      resolve(resultDataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      fileToDataUrl(file).then(resolve).catch(reject);
    };

    img.src = objectUrl;
  });
}

// Simpan media individual ke IndexedDB
export async function saveMediaToIndexedDB(id: string, dataUrl: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(MEDIA_STORE, "readwrite");
    const store = tx.objectStore(MEDIA_STORE);
    store.put({ id, dataUrl, savedAt: Date.now() });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Gagal menyimpan ke IndexedDB:", err);
  }
}

// Ambil media individual dari IndexedDB
export async function getMediaFromIndexedDB(id: string): Promise<string | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(MEDIA_STORE, "readonly");
    const store = tx.objectStore(MEDIA_STORE);
    const request = store.get(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result?.dataUrl || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("Gagal membaca dari IndexedDB:", err);
    return null;
  }
}

// Simpan seluruh data Project ke IndexedDB (Mendukung ratusan MB file video/audio)
export async function saveProjectToIndexedDB(projectData: unknown): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(PROJECT_STORE, "readwrite");
    const store = tx.objectStore(PROJECT_STORE);
    store.put({ key: "active_project", data: projectData, updated_at: Date.now() });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Gagal menyimpan project ke IndexedDB:", err);
  }
}

// Ambil data Project dari IndexedDB saat aplikasi pertama kali dibuka / di-refresh
export async function loadProjectFromIndexedDB(): Promise<any | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(PROJECT_STORE, "readonly");
    const store = tx.objectStore(PROJECT_STORE);
    const request = store.get("active_project");
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("Gagal membaca project dari IndexedDB:", err);
    return null;
  }
}
