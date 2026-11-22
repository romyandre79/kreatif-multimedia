// Service penyimpanan persisten media lokal menggunakan IndexedDB
// Menyimpan foto/video/audio sebagai data base64/blob secara permanen, sehingga tidak rusak (broken) saat halaman di-refresh

const DB_NAME = "kreatif_studio_media_db";
const STORE_NAME = "media_files";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB tidak didukung pada browser ini."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
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

// Kompresi gambar besar agar muat dan sangat ringan di local storage jika diperlukan
export async function optimizeImageToDataUrl(file: File, maxWidth = 1280, maxHeight = 1280, quality = 0.88): Promise<string> {
  // Jika bukan gambar biasa atau file SVG/GIF animasi, langsung baca apa adanya
  if (!file.type.startsWith("image/") || file.type.includes("gif") || file.type.includes("svg")) {
    return fileToDataUrl(file);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

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
        // Fallback jika tidak ada context 2D
        fileToDataUrl(file).then(resolve).catch(reject);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      // Gunakan PNG jika ada alpha channel/transparansi, selain itu JPEG
      const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
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

// Simpan file ke IndexedDB untuk penyimpanan ukuran besar
export async function saveMediaToIndexedDB(id: string, dataUrl: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, dataUrl, savedAt: Date.now() });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Gagal menyimpan ke IndexedDB:", err);
  }
}

// Ambil file dari IndexedDB
export async function getMediaFromIndexedDB(id: string): Promise<string | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
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
