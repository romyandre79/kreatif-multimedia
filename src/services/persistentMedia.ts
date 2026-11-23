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

// Kompresi gambar besar agar muat dan sangat ringan
export async function optimizeImageToDataUrl(
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.9
): Promise<string> {
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
        fileToDataUrl(file).then(resolve).catch(reject);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
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
