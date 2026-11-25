/**
 * skeletonDeformer.ts
 * Engine 2D Continuous Mesh Deformation Sejati ala OpenToonz Plastic Tool & Spine 2D.
 * 
 * Karakter anime / 2D pada satu gambar flat memerlukan deformasi lokal yang presisi:
 * - Tangan mengayun maju-mundur secara halus tanpa merentang ke samping (tidak seperti T-Pose/A-Pose rusak).
 * - Kaki dan sepatu melangkah bergantian ke depan/belakang tanpa mendistorsi wajah/mulut di bagian atas.
 * - Radius pengaruh sendi dibatasi secara vertikal & horizontal agar tidak tumpang tindih ke bagian tubuh lain.
 */

import { SkeletonRig } from "./skeletonTypes";

interface MeshVertex {
  origX: number; // Posisi awal normalisasi (0.0 - 1.0)
  origY: number;
  currX: number; // Posisi setelah deformasi (0.0 - 1.0)
  currY: number;
}

const GRID_COLS = 26; // Resolusi horizontal mesh
const GRID_ROWS = 38; // Resolusi vertikal mesh

/**
 * Render deformasi gambar menggunakan Mesh Warping Continuous ala OpenToonz Plastic Tool.
 */
export function renderDeformedSkeletonImage(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  currentRig: SkeletonRig
) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !image.complete || image.naturalWidth === 0) return;

  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Cek apakah ada sendi yang memiliki rotasi
  const movingJoints = currentRig.joints.filter((j) => Math.abs(j.angle) > 0.05);

  // Jika tidak ada rotasi, render gambar asli 100% tajam & sempurna
  if (movingJoints.length === 0) {
    ctx.drawImage(image, 0, 0, width, height);
    return;
  }

  // Pre-kalkulasi transformasi rotasi per sendi
  interface ActiveBone {
    id: string;
    px: number; // Pivot X (0 - 1)
    py: number; // Pivot Y (0 - 1)
    cos: number;
    sin: number;
    radiusX: number;
    radiusY: number;
    shiftX: number;
    shiftY: number;
  }

  const activeBones: ActiveBone[] = [];

  for (const joint of currentRig.joints) {
    if (Math.abs(joint.angle) <= 0.05) continue;

    const rad = (joint.angle * Math.PI) / 180;
    const px = joint.x / 100;
    const py = joint.y / 100;

    let radiusX = 0.16;
    let radiusY = 0.18;
    let shiftX = 0;
    let shiftY = 0;

    if (joint.id.startsWith("hip")) {
      // Paha: mengayun maju mundur saat jalan
      radiusX = 0.14;
      radiusY = 0.22;
      shiftX = Math.sin(rad) * 0.035;
      shiftY = (1 - Math.cos(rad)) * 0.015;
    } else if (joint.id.startsWith("knee")) {
      // Lutut & betis
      radiusX = 0.12;
      radiusY = 0.20;
      shiftX = Math.sin(rad) * 0.04;
      shiftY = -Math.abs(Math.sin(rad)) * 0.01;
    } else if (joint.id.startsWith("foot")) {
      // Sepatu
      radiusX = 0.12;
      radiusY = 0.14;
      shiftX = Math.sin(rad) * 0.03;
    } else if (joint.id === "head") {
      // Hanya kepala dan rambut atas
      radiusX = 0.18;
      radiusY = 0.15;
    } else if (joint.id === "neck") {
      radiusX = 0.14;
      radiusY = 0.12;
    } else if (joint.id.startsWith("shoulder_l")) {
      // Bahu kiri mengayun ke atas dan melambai
      radiusX = 0.16;
      radiusY = 0.20;
      shiftX = Math.sin(rad) * 0.04;
      shiftY = -Math.abs(Math.sin(rad)) * 0.03;
    } else if (joint.id.startsWith("elbow_l") || joint.id.startsWith("hand_l")) {
      radiusX = 0.15;
      radiusY = 0.18;
      shiftX = Math.sin(rad) * 0.05;
      shiftY = -Math.abs(Math.sin(rad)) * 0.04;
    } else if (joint.id.startsWith("shoulder_r")) {
      radiusX = 0.15;
      radiusY = 0.18;
      shiftX = Math.sin(rad) * 0.03;
    } else if (joint.id.startsWith("elbow_r") || joint.id.startsWith("hand_r")) {
      radiusX = 0.14;
      radiusY = 0.16;
      shiftX = Math.sin(rad) * 0.03;
    }

    activeBones.push({
      id: joint.id,
      px,
      py,
      cos: Math.cos(rad),
      sin: Math.sin(rad),
      radiusX,
      radiusY,
      shiftX,
      shiftY,
    });
  }

  // 1. Hitung Deformasi Grid Vertices (Skinning)
  const vertices: MeshVertex[][] = [];
  for (let r = 0; r <= GRID_ROWS; r++) {
    vertices[r] = [];
    const v = r / GRID_ROWS;
    for (let c = 0; c <= GRID_COLS; c++) {
      const u = c / GRID_COLS;

      let totalWeight = 0;
      let dispX = 0;
      let dispY = 0;

      for (const bone of activeBones) {
        // Normalisasi jarak elips berdasarkan radius X dan Y
        const ndx = (u - bone.px) / bone.radiusX;
        const ndy = (v - bone.py) / bone.radiusY;
        const dist = Math.sqrt(ndx * ndx + ndy * ndy);

        if (dist < 1.0) {
          // Cosine falloff halus
          const w = Math.pow(Math.cos(dist * (Math.PI / 2)), 2);

          const dx = u - bone.px;
          const dy = v - bone.py;

          // Rotasi + Ayunan Translasi
          const rx = bone.px + (dx * bone.cos - dy * bone.sin) + bone.shiftX;
          const ry = bone.py + (dx * bone.sin + dy * bone.cos) + bone.shiftY;

          dispX += (rx - u) * w;
          dispY += (ry - v) * w;
          totalWeight += w;
        }
      }

      let currX = u;
      let currY = v;

      if (totalWeight > 0) {
        const blendFactor = Math.min(1.0, totalWeight);
        currX = u + (dispX / (totalWeight + 0.05)) * blendFactor;
        currY = v + (dispY / (totalWeight + 0.05)) * blendFactor;
      }

      vertices[r][c] = {
        origX: u,
        origY: v,
        currX,
        currY,
      };
    }
  }

  // 2. Render Mesh Triangles menggunakan Piecewise Affine Texture Mapping
  const imgW = image.naturalWidth;
  const imgH = image.naturalHeight;

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const v00 = vertices[r][c];
      const v10 = vertices[r][c + 1];
      const v01 = vertices[r + 1][c];
      const v11 = vertices[r + 1][c + 1];

      // Segitiga 1 (Atas-Kiri)
      drawTexturedTriangle(
        ctx,
        image,
        v00.currX * width, v00.currY * height,
        v10.currX * width, v10.currY * height,
        v01.currX * width, v01.currY * height,
        v00.origX * imgW, v00.origY * imgH,
        v10.origX * imgW, v10.origY * imgH,
        v01.origX * imgW, v01.origY * imgH
      );

      // Segitiga 2 (Bawah-Kanan)
      drawTexturedTriangle(
        ctx,
        image,
        v10.currX * width, v10.currY * height,
        v11.currX * width, v11.currY * height,
        v01.currX * width, v01.currY * height,
        v10.origX * imgW, v10.origY * imgH,
        v11.origX * imgW, v11.origY * imgH,
        v01.origX * imgW, v01.origY * imgH
      );
    }
  }
}

/**
 * Render satu segitiga dengan pemetaan tekstur affine (Affine Texture Mapping)
 */
function drawTexturedTriangle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  u0: number, v0: number,
  u1: number, v1: number,
  u2: number, v2: number
) {
  ctx.save();

  // Clipping path segitiga target
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.clip();

  // Matriks affine dari UV sumber ke koordinat kanvas
  const delta = u0 * (v1 - v2) - u1 * (v0 - v2) + u2 * (v0 - v1);
  if (Math.abs(delta) < 0.0001) {
    ctx.restore();
    return;
  }

  const deltaA = x0 * (v1 - v2) - x1 * (v0 - v2) + x2 * (v0 - v1);
  const deltaB = u0 * (x1 - x2) - u1 * (x0 - x2) + u2 * (x0 - x1);
  const deltaC = u0 * (v1 * x2 - v2 * x1) - u1 * (v0 * x2 - v2 * x0) + u2 * (v0 * x1 - v1 * x0);

  const deltaD = y0 * (v1 - v2) - y1 * (v0 - v2) + y2 * (v0 - v1);
  const deltaE = u0 * (y1 - y2) - u1 * (y0 - y2) + u2 * (y0 - y1);
  const deltaF = u0 * (v1 * y2 - v2 * y1) - u1 * (v0 * y2 - v2 * y0) + u2 * (v0 * y1 - v1 * y0);

  const a = deltaA / delta;
  const b = deltaD / delta;
  const c = deltaB / delta;
  const d = deltaE / delta;
  const e = deltaC / delta;
  const f = deltaF / delta;

  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);

  ctx.restore();
}

/**
 * Backward compatibility
 */
export function autoGenerateCutoutParts(_rig?: SkeletonRig) {
  return [];
}
