/**
 * i18nStore.ts
 * Multi-Language & Translation CRUD Manager
 * Menyediakan kamus bahasa Indonesia (id) dan English (en) secara lengkap,
 * serta mendukung CRUD (tambah bahasa baru, edit terjemahan, tambah key, hapus bahasa/kunci)
 * yang tersimpan secara lokal dan reaktif di seluruh aplikasi.
 */

import { create } from "zustand";

export interface TranslationDictionary {
  [key: string]: string;
}

export interface LanguagePack {
  code: string; // misal 'id', 'en', 'ja', 'es'
  name: string; // misal 'Bahasa Indonesia', 'English'
  flag: string; // emoji bendera '🇮🇩', '🇺🇸'
  isDefault?: boolean;
  translations: TranslationDictionary;
}

// Kamus Dasar Bawaan: Bahasa Indonesia (id)
export const DEFAULT_ID_TRANSLATIONS: TranslationDictionary = {
  // Global & Toolbar
  "app.title": "Kreatif Multimedia Studio",
  "toolbar.project_title": "Judul Proyek",
  "toolbar.new_project": "Proyek Baru",
  "toolbar.save": "Simpan",
  "toolbar.open": "Buka",
  "toolbar.import_media": "Import Media",
  "toolbar.undo": "Undo",
  "toolbar.redo": "Redo",
  "toolbar.auto_save": "Auto-Save",
  "toolbar.auto_save_active": "Aktif",
  "toolbar.auto_save_off": "Mati",
  "toolbar.gemini_flow": "AI Flow",
  "toolbar.ai_settings": "Pengaturan AI",
  "toolbar.export_video": "Ekspor Video",
  "toolbar.language": "Bahasa",
  "toolbar.manage_languages": "Kelola Bahasa (i18n)",

  // Sidebar Tabs
  "tab.audios": "Audios",
  "tab.text": "Text",
  "tab.characters": "Karakter",
  "tab.episodes": "Episode",

  // Audio Vault
  "audio.title": "Audio Vault & SFX Library",
  "audio.freesound_search": "Cari SFX Freesound...",
  "audio.search": "Cari",
  "audio.searching": "Mencari...",
  "audio.play": "Putar",
  "audio.pause": "Jeda",
  "audio.add_to_timeline": "+ Timeline",
  "audio.bgm_library": "Koleksi Musik Latar (BGM)",
  "audio.tts_generator": "Generator Suara Narasi (TTS)",
  "audio.generate_speech": "Buat Suara",
  "audio.volume": "Volume",

  // Text Studio & Subtitle
  "text.title": "Text Studio & Tipografi",
  "text.add_text": "+ Tambah Teks ke Timeline",
  "text.preset_animations": "Preset Animasi Teks",
  "text.custom_animation_builder": "Pembuat Animasi Teks Manual",
  "text.font_family": "Jenis Huruf (Font)",
  "text.font_size": "Ukuran Font",
  "text.bold": "Tebal",
  "text.italic": "Miring",
  "text.underline": "Garis Bawah",
  "text.text_color": "Warna Teks",
  "text.bg_color": "Warna Latar",
  "text.shadow": "Bayangan",
  "text.motion_type": "Tipe Gerakan Masuk",
  "text.loop_motion": "Gerakan Loop Kontinu",
  "text.animation_speed": "Kecepatan Animasi",
  "text.save_custom_preset": "Simpan Animasi Kustom",

  // Character Vault
  "char.title": "Character & Lore Vault",
  "char.add_new": "+ Karakter Baru",
  "char.name": "Nama Karakter",
  "char.description": "Deskripsi / Lore",
  "char.avatar": "Foto Profil / Avatar",
  "char.voice_settings": "Pengaturan Suara",
  "char.voice_engine": "Engine Suara",
  "char.voice_id": "Voice ID / Speaker",
  "char.test_voice": "Uji Suara",
  "char.save": "Simpan Karakter",
  "char.delete": "Hapus Karakter",

  // Story & Episode
  "story.title": "Story & Episode Manager",
  "story.add_episode": "+ Episode Baru",
  "story.auto_script": "Auto Script Importer",
  "story.script_input": "Naskah Cerita / Skenario",
  "story.parse_script": "Proses Naskah Otomatis",
  "story.generate_scenes": "Buat Adegan ke Timeline",
  "story.scene_duration": "Durasi Adegan",

  // Canvas Preview
  "preview.title": "Interactive Canvas Preview",
  "preview.aspect_ratio": "Aspek Rasio",
  "preview.play": "Putar",
  "preview.pause": "Jeda",
  "preview.stop": "Berhenti",
  "preview.fit": "Muat Layar",
  "preview.resolution": "Resolusi",

  // Inspector
  "inspector.title": "Inspector Properties",
  "inspector.empty_hint": "Pilih salah satu klip di Timeline untuk mengatur transformasi, chroma key, dan audio.",
  "inspector.keyframe_animator": "Keyframe Animator",
  "inspector.add_keyframe": "Tambah Keyframe",
  "inspector.remove_keyframe": "Hapus Keyframe",
  "inspector.transform": "Transformasi",
  "inspector.position_x": "Posisi X",
  "inspector.position_y": "Posisi Y",
  "inspector.scale": "Skala (Scale)",
  "inspector.rotation": "Rotasi (°)",
  "inspector.opacity": "Opacity / Transparansi",
  "inspector.chroma_key": "Chroma Key (Green Screen)",
  "inspector.similarity": "Toleransi (Similarity)",
  "inspector.smoothness": "Kehalusan (Smoothness)",
  "inspector.video_transitions": "Peralihan Video (Transition)",
  "inspector.manage_transitions": "Kelola Transisi",
  "inspector.transition_in": "Transisi Masuk (In)",
  "inspector.transition_out": "Transisi Keluar (Out)",
  "inspector.transition_duration": "Durasi Transisi",

  // Timeline
  "timeline.title": "Multi-Track Timeline",
  "timeline.split": "Bagi Klip (Split)",
  "timeline.delete": "Hapus (Delete)",
  "timeline.zoom_in": "Perbesar Timeline",
  "timeline.zoom_out": "Perkecil Timeline",
  "timeline.track_video": "Track Video",
  "timeline.track_image": "Track Gambar",
  "timeline.track_subtitle": "Track Teks / Subtitle",
  "timeline.track_audio": "Track Audio",
  "timeline.seconds": "detik",

  // Export Dialog
  "export.title": "Ekspor Video",
  "export.file_name": "Nama File",
  "export.format": "Format Video",
  "export.quality": "Kualitas / Bitrate",
  "export.start_render": "Mulai Render & Unduh",
  "export.rendering": "Sedang Merender...",
  "export.progress": "Progres",
  "export.cancel": "Batal",

  // Common & Confirmations
  "common.save": "Simpan",
  "common.cancel": "Batal",
  "common.delete": "Hapus",
  "common.edit": "Edit",
  "common.close": "Tutup",
  "common.apply": "Terapkan",
  "common.create": "Buat",
  "common.default": "Bawaan",
  "common.custom": "Kustom",
  "common.success": "Berhasil",
  "common.error": "Gagal",
  "common.confirm_delete": "Apakah Anda yakin ingin menghapus?",
};

// Kamus Dasar Bawaan: Bahasa Inggris (en)
export const DEFAULT_EN_TRANSLATIONS: TranslationDictionary = {
  // Global & Toolbar
  "app.title": "Kreatif Multimedia Studio",
  "toolbar.project_title": "Project Title",
  "toolbar.new_project": "New Project",
  "toolbar.save": "Save",
  "toolbar.open": "Open",
  "toolbar.import_media": "Import Media",
  "toolbar.undo": "Undo",
  "toolbar.redo": "Redo",
  "toolbar.auto_save": "Auto-Save",
  "toolbar.auto_save_active": "Active",
  "toolbar.auto_save_off": "Off",
  "toolbar.gemini_flow": "AI Flow",
  "toolbar.ai_settings": "AI Settings",
  "toolbar.export_video": "Export Video",
  "toolbar.language": "Language",
  "toolbar.manage_languages": "Manage Languages (i18n)",

  // Sidebar Tabs
  "tab.audios": "Audios",
  "tab.text": "Text",
  "tab.characters": "Characters",
  "tab.episodes": "Episodes",

  // Audio Vault
  "audio.title": "Audio Vault & SFX Library",
  "audio.freesound_search": "Search Freesound SFX...",
  "audio.search": "Search",
  "audio.searching": "Searching...",
  "audio.play": "Play",
  "audio.pause": "Pause",
  "audio.add_to_timeline": "+ Timeline",
  "audio.bgm_library": "Background Music (BGM)",
  "audio.tts_generator": "Voiceover Generator (TTS)",
  "audio.generate_speech": "Generate Voice",
  "audio.volume": "Volume",

  // Text Studio & Subtitle
  "text.title": "Text Studio & Typography",
  "text.add_text": "+ Add Text to Timeline",
  "text.preset_animations": "Preset Text Animations",
  "text.custom_animation_builder": "Manual Text Animation Builder",
  "text.font_family": "Font Family",
  "text.font_size": "Font Size",
  "text.bold": "Bold",
  "text.italic": "Italic",
  "text.underline": "Underline",
  "text.text_color": "Text Color",
  "text.bg_color": "Background Color",
  "text.shadow": "Shadow",
  "text.motion_type": "Intro Motion Type",
  "text.loop_motion": "Continuous Loop Motion",
  "text.animation_speed": "Animation Speed",
  "text.save_custom_preset": "Save Custom Animation",

  // Character Vault
  "char.title": "Character & Lore Vault",
  "char.add_new": "+ New Character",
  "char.name": "Character Name",
  "char.description": "Description / Lore",
  "char.avatar": "Profile Avatar",
  "char.voice_settings": "Voice Settings",
  "char.voice_engine": "Voice Engine",
  "char.voice_id": "Voice ID / Speaker",
  "char.test_voice": "Test Voice",
  "char.save": "Save Character",
  "char.delete": "Delete Character",

  // Story & Episode
  "story.title": "Story & Episode Manager",
  "story.add_episode": "+ New Episode",
  "story.auto_script": "Auto Script Importer",
  "story.script_input": "Story Script / Screenplay",
  "story.parse_script": "Auto Parse Script",
  "story.generate_scenes": "Generate Scenes to Timeline",
  "story.scene_duration": "Scene Duration",

  // Canvas Preview
  "preview.title": "Interactive Canvas Preview",
  "preview.aspect_ratio": "Aspect Ratio",
  "preview.play": "Play",
  "preview.pause": "Pause",
  "preview.stop": "Stop",
  "preview.fit": "Fit Screen",
  "preview.resolution": "Resolution",

  // Inspector
  "inspector.title": "Inspector Properties",
  "inspector.empty_hint": "Select a clip in the Timeline to adjust transforms, chroma key, and audio.",
  "inspector.keyframe_animator": "Keyframe Animator",
  "inspector.add_keyframe": "Add Keyframe",
  "inspector.remove_keyframe": "Remove Keyframe",
  "inspector.transform": "Transform",
  "inspector.position_x": "Position X",
  "inspector.position_y": "Position Y",
  "inspector.scale": "Scale",
  "inspector.rotation": "Rotation (°)",
  "inspector.opacity": "Opacity / Transparency",
  "inspector.chroma_key": "Chroma Key (Green Screen)",
  "inspector.similarity": "Similarity",
  "inspector.smoothness": "Smoothness",
  "inspector.video_transitions": "Video Transition",
  "inspector.manage_transitions": "Manage Transitions",
  "inspector.transition_in": "Transition In",
  "inspector.transition_out": "Transition Out",
  "inspector.transition_duration": "Transition Duration",

  // Timeline
  "timeline.title": "Multi-Track Timeline",
  "timeline.split": "Split Clip",
  "timeline.delete": "Delete Clip",
  "timeline.zoom_in": "Zoom In Timeline",
  "timeline.zoom_out": "Zoom Out Timeline",
  "timeline.track_video": "Video Track",
  "timeline.track_image": "Image Track",
  "timeline.track_subtitle": "Text / Subtitle Track",
  "timeline.track_audio": "Audio Track",
  "timeline.seconds": "seconds",

  // Export Dialog
  "export.title": "Export Video",
  "export.file_name": "File Name",
  "export.format": "Video Format",
  "export.quality": "Quality / Bitrate",
  "export.start_render": "Start Render & Download",
  "export.rendering": "Rendering Video...",
  "export.progress": "Progress",
  "export.cancel": "Cancel",

  // Common & Confirmations
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.close": "Close",
  "common.apply": "Apply",
  "common.create": "Create",
  "common.default": "Default",
  "common.custom": "Custom",
  "common.success": "Success",
  "common.error": "Failed",
  "common.confirm_delete": "Are you sure you want to delete?",
};

const STORAGE_LANG_KEY = "kreatif_current_language";
const STORAGE_PACKS_KEY = "kreatif_language_packs";

interface I18nStoreState {
  currentLanguage: string; // misal 'id' atau 'en'
  languages: LanguagePack[];
  setLanguage: (code: string) => void;
  // CRUD Bahasa
  addLanguage: (pack: Omit<LanguagePack, "translations">, baseOnCode?: string) => void;
  updateLanguageMeta: (code: string, meta: { name?: string; flag?: string }) => void;
  deleteLanguage: (code: string) => void;
  // CRUD Terjemahan (Kamus Kata)
  updateTranslation: (langCode: string, key: string, value: string) => void;
  addTranslationKey: (key: string, defaultValues: { [langCode: string]: string }) => void;
  deleteTranslationKey: (key: string) => void;
  // Reset ke bawaan
  resetToDefaults: () => void;
  // Translate function
  t: (key: string, fallback?: string) => string;
}

function loadInitialLanguages(): LanguagePack[] {
  try {
    const raw = localStorage.getItem(STORAGE_PACKS_KEY);
    if (raw) {
      const parsed: LanguagePack[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Gagal membaca language packs dari localStorage:", err);
  }

  return [
    {
      code: "id",
      name: "Bahasa Indonesia",
      flag: "🇮🇩",
      isDefault: true,
      translations: { ...DEFAULT_ID_TRANSLATIONS },
    },
    {
      code: "en",
      name: "English",
      flag: "🇺🇸",
      isDefault: true,
      translations: { ...DEFAULT_EN_TRANSLATIONS },
    },
  ];
}

function saveLanguagesToStorage(packs: LanguagePack[]) {
  try {
    localStorage.setItem(STORAGE_PACKS_KEY, JSON.stringify(packs));
  } catch (err) {
    console.warn("Gagal menyimpan language packs:", err);
  }
}

export const useI18nStore = create<I18nStoreState>((set, get) => {
  const initialLanguages = loadInitialLanguages();
  const savedLang = localStorage.getItem(STORAGE_LANG_KEY) || "id";
  const validLang = initialLanguages.some((l) => l.code === savedLang) ? savedLang : "id";

  return {
    currentLanguage: validLang,
    languages: initialLanguages,

    setLanguage: (code: string) => {
      localStorage.setItem(STORAGE_LANG_KEY, code);
      set({ currentLanguage: code });
    },

    addLanguage: (packMeta, baseOnCode = "en") => {
      const { languages } = get();
      if (languages.some((l) => l.code === packMeta.code)) {
        alert("Kode bahasa sudah ada!");
        return;
      }

      // Salin terjemahan dari baseOnCode
      const basePack = languages.find((l) => l.code === baseOnCode) || languages[0];
      const newPack: LanguagePack = {
        code: packMeta.code,
        name: packMeta.name,
        flag: packMeta.flag || "🌐",
        isDefault: false,
        translations: { ...(basePack?.translations || DEFAULT_EN_TRANSLATIONS) },
      };

      const updated = [...languages, newPack];
      saveLanguagesToStorage(updated);
      set({ languages: updated });
    },

    updateLanguageMeta: (code, meta) => {
      const { languages } = get();
      const updated = languages.map((l) => (l.code === code ? { ...l, ...meta } : l));
      saveLanguagesToStorage(updated);
      set({ languages: updated });
    },

    deleteLanguage: (code: string) => {
      const { languages, currentLanguage } = get();
      if (languages.length <= 1) {
        alert("Minimal harus tersisa satu bahasa!");
        return;
      }
      const target = languages.find((l) => l.code === code);
      if (target?.isDefault && (code === "id" || code === "en")) {
        alert("Bahasa bawaan utama tidak dapat dihapus!");
        return;
      }

      const updated = languages.filter((l) => l.code !== code);
      saveLanguagesToStorage(updated);

      const nextLang = currentLanguage === code ? updated[0].code : currentLanguage;
      localStorage.setItem(STORAGE_LANG_KEY, nextLang);
      set({ languages: updated, currentLanguage: nextLang });
    },

    updateTranslation: (langCode: string, key: string, value: string) => {
      const { languages } = get();
      const updated = languages.map((l) => {
        if (l.code === langCode) {
          return {
            ...l,
            translations: {
              ...l.translations,
              [key]: value,
            },
          };
        }
        return l;
      });
      saveLanguagesToStorage(updated);
      set({ languages: updated });
    },

    addTranslationKey: (key: string, defaultValues: { [langCode: string]: string }) => {
      const { languages } = get();
      const updated = languages.map((l) => ({
        ...l,
        translations: {
          ...l.translations,
          [key]: defaultValues[l.code] || defaultValues["id"] || defaultValues["en"] || key,
        },
      }));
      saveLanguagesToStorage(updated);
      set({ languages: updated });
    },

    deleteTranslationKey: (key: string) => {
      const { languages } = get();
      const updated = languages.map((l) => {
        const copy = { ...l.translations };
        delete copy[key];
        return { ...l, translations: copy };
      });
      saveLanguagesToStorage(updated);
      set({ languages: updated });
    },

    resetToDefaults: () => {
      const defaultPacks: LanguagePack[] = [
        {
          code: "id",
          name: "Bahasa Indonesia",
          flag: "🇮🇩",
          isDefault: true,
          translations: { ...DEFAULT_ID_TRANSLATIONS },
        },
        {
          code: "en",
          name: "English",
          flag: "🇺🇸",
          isDefault: true,
          translations: { ...DEFAULT_EN_TRANSLATIONS },
        },
      ];
      saveLanguagesToStorage(defaultPacks);
      set({ languages: defaultPacks, currentLanguage: "id" });
    },

    t: (key: string, fallback?: string): string => {
      const { currentLanguage, languages } = get();
      const pack = languages.find((l) => l.code === currentLanguage);
      if (pack && pack.translations[key]) {
        return pack.translations[key];
      }
      // Fallback ke id lalu en
      const idPack = languages.find((l) => l.code === "id");
      if (idPack && idPack.translations[key]) return idPack.translations[key];
      const enPack = languages.find((l) => l.code === "en");
      if (enPack && enPack.translations[key]) return enPack.translations[key];

      return fallback !== undefined ? fallback : key;
    },
  };
});

/**
 * Hook shorthand untuk mengambil fungsi translate t
 */
export function useTranslation() {
  const t = useI18nStore((s) => s.t);
  const currentLanguage = useI18nStore((s) => s.currentLanguage);
  const setLanguage = useI18nStore((s) => s.setLanguage);
  const languages = useI18nStore((s) => s.languages);

  return { t, currentLanguage, setLanguage, languages };
}
