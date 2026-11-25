/**
 * skeletonTypes.ts
 * Tipe data dan engine Kinematics untuk fitur Skeleton (Bone Tool / Rigging ala OpenToonz & Spine 2D)
 */

export interface BoneJoint {
  id: string;
  name: string;
  parentId: string | null;
  // Posisi relatif (persentase 0-100% atau koordinat kanvas) terhadap root/gambar
  x: number; // 0 - 100
  y: number; // 0 - 100
  angle: number; // Sudut rotasi lokal dalam derajat (0 - 360)
  length?: number; // Panjang tulang dalam persen kanvas
  color?: string; // Warna visual tulang untuk kemudahan identifikasi
  radius?: number; // Ukuran hit/grab point sendi
}

export interface CutoutPart {
  id: string; // e.g. "head", "torso", "arm_l", "arm_r", "leg_l", "leg_r"
  name: string;
  jointId: string; // Sendi pengikat utama
  parentJointId?: string | null;
  // Bounding box pemotongan dari gambar sumber (% 0 - 100)
  sourceBox: { xMin: number; xMax: number; yMin: number; yMax: number };
  // Pivot putaran (% relatif terhadap part atau % canvas)
  pivot: { x: number; y: number };
  // Urutan z-index layer tumpukan (dari belakang ke depan)
  zIndex: number;
  imageDataUrl?: string; // Cache potongan gambar transparan
}

export interface SkeletonRig {
  id: string;
  name: string;
  characterId?: string;
  rootJointId: string;
  joints: BoneJoint[];
  // Mode interaksi kanvas: "setup" (mengatur posisi sendi), "pose" (menggerakkan karakter)
  mode?: "setup" | "pose";
  // Daftar potongan anggota tubuh ala OpenToonz Cutout Animation
  cutoutParts?: CutoutPart[];
  // ID Animasi bergerak aktif di timeline (misal: "walk_cycle", "hand_wave", "idle_breathing")
  animPresetId?: string;
  animationSpeed?: number;
}

/**
 * Preset Standar Skeleton ala OpenToonz
 */

// 1. Preset Biped Humanoid Standar (Karakter Manusia 2D)
export const SKELETON_PRESET_HUMANOID: SkeletonRig = {
  id: "preset-humanoid",
  name: "Humanoid (Manusia 2D)",
  rootJointId: "pelvis",
  mode: "pose",
  joints: [
    { id: "pelvis", name: "Pinggul / Pelvis (Akar)", parentId: null, x: 50, y: 53, angle: 0, color: "#f59e0b" },
    { id: "chest", name: "Dada / Torso", parentId: "pelvis", x: 50, y: 38, angle: 0, color: "#3b82f6" },
    { id: "neck", name: "Leher", parentId: "chest", x: 50, y: 26, angle: 0, color: "#3b82f6" },
    { id: "head", name: "Kepala", parentId: "neck", x: 50, y: 16, angle: 0, color: "#ec4899" },

    // Lengan Kiri (Karakter Menekuk Tangan Memegang Tali Tas)
    { id: "shoulder_l", name: "Bahu Kiri", parentId: "chest", x: 40, y: 31, angle: 0, color: "#10b981" },
    { id: "elbow_l", name: "Siku Kiri", parentId: "shoulder_l", x: 34, y: 43, angle: 0, color: "#10b981" },
    { id: "hand_l", name: "Tangan Kiri", parentId: "elbow_l", x: 38, y: 40, angle: 0, color: "#10b981" },

    // Lengan Kanan (Karakter Menekuk Tangan di Pinggang)
    { id: "shoulder_r", name: "Bahu Kanan", parentId: "chest", x: 60, y: 31, angle: 0, color: "#06b6d4" },
    { id: "elbow_r", name: "Siku Kanan", parentId: "shoulder_r", x: 66, y: 44, angle: 0, color: "#06b6d4" },
    { id: "hand_r", name: "Tangan Kanan", parentId: "elbow_r", x: 58, y: 47, angle: 0, color: "#06b6d4" },

    // Kaki Kiri
    { id: "hip_l", name: "Pangkal Paha Kiri", parentId: "pelvis", x: 44, y: 55, angle: 0, color: "#8b5cf6" },
    { id: "knee_l", name: "Lutut Kiri", parentId: "hip_l", x: 43, y: 73, angle: 0, color: "#8b5cf6" },
    { id: "foot_l", name: "Kaki Kiri", parentId: "knee_l", x: 42, y: 92, angle: 0, color: "#8b5cf6" },

    // Kaki Kanan
    { id: "hip_r", name: "Pangkal Paha Kanan", parentId: "pelvis", x: 56, y: 55, angle: 0, color: "#a855f7" },
    { id: "knee_r", name: "Lutut Kanan", parentId: "hip_r", x: 57, y: 73, angle: 0, color: "#a855f7" },
    { id: "foot_r", name: "Kaki Kanan", parentId: "knee_r", x: 54, y: 92, angle: 0, color: "#a855f7" },
  ],
};

// 2. Preset Sederhana 3-Sendi (Tail / Ekor / Belalai / Tentacle)
export const SKELETON_PRESET_CHAIN: SkeletonRig = {
  id: "preset-chain",
  name: "Rantai Fleksibel (Ekor/Belalai)",
  rootJointId: "root",
  mode: "pose",
  joints: [
    { id: "root", name: "Akar Pangkal", parentId: null, x: 20, y: 50, angle: 0, color: "#f59e0b" },
    { id: "seg1", name: "Ruas 1", parentId: "root", x: 40, y: 50, angle: 0, color: "#3b82f6" },
    { id: "seg2", name: "Ruas 2", parentId: "seg1", x: 60, y: 50, angle: 0, color: "#10b981" },
    { id: "tip", name: "Ujung Bebas", parentId: "seg2", x: 80, y: 50, angle: 0, color: "#ec4899" },
  ],
};

// 3. Preset Hewan Kaki Empat (Quadruped)
export const SKELETON_PRESET_QUADRUPED: SkeletonRig = {
  id: "preset-quadruped",
  name: "Hewan Kaki Empat (Kucing/Anjing/Kuda)",
  rootJointId: "spine_mid",
  mode: "pose",
  joints: [
    { id: "spine_mid", name: "Pusat Punggung", parentId: null, x: 50, y: 45, angle: 0, color: "#f59e0b" },
    { id: "spine_front", name: "Bahu Depan", parentId: "spine_mid", x: 35, y: 42, angle: 0, color: "#3b82f6" },
    { id: "neck", name: "Leher Depan", parentId: "spine_front", x: 28, y: 32, angle: 0, color: "#3b82f6" },
    { id: "head", name: "Kepala / Moncong", parentId: "neck", x: 20, y: 25, angle: 0, color: "#ec4899" },
    { id: "front_leg_l", name: "Kaki Depan Atas", parentId: "spine_front", x: 33, y: 60, angle: 0, color: "#10b981" },
    { id: "front_foot_l", name: "Telapak Depan", parentId: "front_leg_l", x: 33, y: 85, angle: 0, color: "#10b981" },
    { id: "pelvis_rear", name: "Pinggul Belakang", parentId: "spine_mid", x: 68, y: 45, angle: 0, color: "#8b5cf6" },
    { id: "rear_leg_l", name: "Paha Belakang", parentId: "pelvis_rear", x: 72, y: 65, angle: 0, color: "#8b5cf6" },
    { id: "rear_foot_l", name: "Telapak Belakang", parentId: "rear_leg_l", x: 74, y: 85, angle: 0, color: "#8b5cf6" },
    { id: "tail_base", name: "Pangkal Ekor", parentId: "pelvis_rear", x: 80, y: 40, angle: 0, color: "#06b6d4" },
    { id: "tail_tip", name: "Ujung Ekor", parentId: "tail_base", x: 90, y: 30, angle: 0, color: "#06b6d4" },
  ],
};

export interface SkeletonAnimationPreset {
  id: string;
  name: string;
  category: "walk" | "idle" | "gesture" | "action";
  speed: number;
  description: string;
  // Perubahan sudut sendi per fase (0 - 1)
  keyframes: Array<{
    phase: number; // 0.0 - 1.0 (siklus berulang)
    angles: Record<string, number>; // jointId -> delta angle
  }>;
}

export const SKELETON_ANIM_PRESETS: SkeletonAnimationPreset[] = [
  {
    id: "idle_breathing",
    name: "🌬️ Bernapas Santai (Idle)",
    category: "idle",
    speed: 1.0,
    description: "Gerakan naik-turun dada dan kepala yang natural saat karakter diam.",
    keyframes: [
      { phase: 0.0, angles: { chest: 0, neck: 0, head: 0, elbow_l: 0, elbow_r: 0 } },
      { phase: 0.5, angles: { chest: -4, neck: 2, head: 3, elbow_l: -3, elbow_r: 3 } },
      { phase: 1.0, angles: { chest: 0, neck: 0, head: 0, elbow_l: 0, elbow_r: 0 } },
    ],
  },
  {
    id: "walk_cycle",
    name: "🚶 Berjalan Siklus (Walk Cycle)",
    category: "walk",
    speed: 1.2,
    description: "Langkah kaki dan ayunan tangan bergantian secara simetris.",
    keyframes: [
      { phase: 0.0, angles: { hip_l: 14, knee_l: -10, foot_l: 8, hip_r: -12, knee_r: 10, foot_r: -8, shoulder_l: -12, elbow_l: -6, shoulder_r: 12, elbow_r: 6 } },
      { phase: 0.25, angles: { hip_l: 4, knee_l: 4, foot_l: 2, hip_r: 2, knee_r: 3, foot_r: 0, shoulder_l: -4, elbow_l: -2, shoulder_r: 4, elbow_r: 2 } },
      { phase: 0.5, angles: { hip_l: -12, knee_l: 10, foot_l: -8, hip_r: 14, knee_r: -10, foot_r: 8, shoulder_l: 12, elbow_l: 6, shoulder_r: -12, elbow_r: -6 } },
      { phase: 0.75, angles: { hip_l: 2, knee_l: 3, foot_l: 0, hip_r: 4, knee_r: 4, foot_r: 2, shoulder_l: 4, elbow_l: 2, shoulder_r: -4, elbow_r: -2 } },
      { phase: 1.0, angles: { hip_l: 14, knee_l: -10, foot_l: 8, hip_r: -12, knee_r: 10, foot_r: -8, shoulder_l: -12, elbow_l: -6, shoulder_r: 12, elbow_r: 6 } },
    ],
  },
  {
    id: "hand_wave",
    name: "👋 Melambaikan Tangan (Waving)",
    category: "gesture",
    speed: 1.4,
    description: "Tangan terangkat dan melambai ke kiri-kanan dengan anggun.",
    keyframes: [
      { phase: 0.0, angles: { shoulder_l: -18, elbow_l: -12, hand_l: -15, head: -3 } },
      { phase: 0.25, angles: { shoulder_l: -24, elbow_l: -16, hand_l: 12, head: 0 } },
      { phase: 0.5, angles: { shoulder_l: -20, elbow_l: -14, hand_l: 22, head: 3 } },
      { phase: 0.75, angles: { shoulder_l: -16, elbow_l: -10, hand_l: 5, head: 0 } },
      { phase: 1.0, angles: { shoulder_l: -18, elbow_l: -12, hand_l: -15, head: -3 } },
    ],
  },
  {
    id: "head_nod",
    name: "🗣️ Mengangguk / Berbicara",
    category: "gesture",
    speed: 1.2,
    description: "Gerakan anggukan kepala berulang seperti sedang berbicara santai.",
    keyframes: [
      { phase: 0.0, angles: { head: 0, chest: 0 } },
      { phase: 0.5, angles: { head: 6, chest: -2 } },
      { phase: 1.0, angles: { head: 0, chest: 0 } },
    ],
  },
];
