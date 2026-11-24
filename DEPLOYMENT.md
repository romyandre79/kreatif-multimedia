# 🚀 Panduan Deployment Server: Kreatif Multimedia

Dokumen ini memandu langkah demi langkah cara men-deploy **Kreatif Multimedia** ke server untuk ketiga kebutuhan utama:
1. **Web Studio (Browser-based NLE)** via Docker / Nginx / Vercel.
2. **Heavy Cloud Render Server (FFmpeg API)** via Docker / VPS Ubuntu.
3. **Automasi Build Installer Desktop (Windows `.exe`, macOS `.dmg`, Linux `.deb`)** via GitHub Actions CI/CD.

---

## 🌐 Opsi 1: Deploy Web Studio (Frontend Browser)

Aplikasi frontend dibangun dengan React + Vite + Canvas/WebGL. Semua render awal dapat berjalan langsung di sisi client (browser pengguna).

### A. Menggunakan Docker & Nginx (Rekomendasi untuk VPS / Server Pribadi)
Kami telah menyediakan [Dockerfile](file:///c:/lara/www/kreatif/kreatif-multimedia/Dockerfile), [deploy/nginx.conf](file:///c:/lara/www/kreatif/kreatif-multimedia/deploy/nginx.conf), dan [docker-compose.yml](file:///c:/lara/www/kreatif/kreatif-multimedia/docker-compose.yml).

1. Clone repositori ke server Anda:
   ```bash
   git clone <URL_REPO_ANDA> kreatif-multimedia
   cd kreatif-multimedia
   ```
2. Jalankan dengan Docker Compose:
   ```bash
   docker compose up -d --build
   ```
3. Buka browser:
   - Akses: `http://IP_SERVER_ANDA` atau `http://domain-anda.com`
   - Nginx sudah dikonfigurasi dengan header keamanan browser:
     - `Cross-Origin-Opener-Policy: same-origin`
     - `Cross-Origin-Embedder-Policy: credentialless`
     - Kompresi Gzip untuk pemuatan aset berkecepatan tinggi.

### B. Menggunakan Cloudflare Pages / Vercel / Netlify (Gratis Tanpa Kelola Server)
1. Hubungkan akun GitHub Anda ke Vercel atau Cloudflare Pages.
2. Konfigurasi build:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Klik **Deploy**. Website siap digunakan dalam hitungan menit.

---

## ⚙️ Opsi 2: Deploy Cloud Render Server (FFmpeg Background Service)

Jika Anda ingin merender video panjang/beresolusi tinggi di server (bukan di browser client):

Folder [server-render](file:///c:/lara/www/kreatif/kreatif-multimedia/server-render) sudah berisi layanan Node.js + native FFmpeg:

1. **Jalankan via Docker Compose**:
   ```bash
   # Otomatis menjalankan web dan render-api di port 4000
   docker compose up -d render-api
   ```
2. **Cek Kesehatan Service**:
   ```bash
   curl http://localhost:4000/health
   # Respons: {"status":"ok","service":"Kreatif Multimedia Render Service",...}
   ```
3. **Endpoint Render Video**:
   - `POST /api/render/ffmpeg`
   - Body:
     ```json
     {
       "args": ["-f", "lavfi", "-i", "color=c=blue:s=1280x720:d=5", "-c:v", "libx264"],
       "outputFilename": "video_sample.mp4"
     }
     ```
   - Hasil render dapat langsung diunduh dari `/output/video_sample.mp4`.

---

## 📦 Opsi 3: Automasi Build Installer Desktop (GitHub Actions CI/CD)

Jika Anda ingin mendistribusikan aplikasi dalam bentuk installer desktop tanpa perlu kompilasi manual di setiap laptop:

File alur kerja sudah tersedia di [.github/workflows/release.yml](file:///c:/lara/www/kreatif/kreatif-multimedia/.github/workflows/release.yml).

### Cara Menghasilkan File Installer (.exe, .dmg, .deb):
1. Pastikan semua perubahan sudah di-commit dan di-push ke GitHub:
   ```bash
   git add .
   git commit -m "Update fitur v1.0.0"
   git push origin main
   ```
2. Buat tag rilis baru:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. **GitHub Actions** akan otomatis berjalan:
   - Menyiapkan environment Windows, Ubuntu, dan macOS.
   - Mengunduh library binary FFmpeg sidecar yang sesuai.
   - Mengompilasi Rust (Tauri) dan React frontend.
   - Mempublikasikan installer ke tab **Releases** di repositori GitHub Anda:
     - `Kreatif-Multimedia_1.0.0_x64-setup.exe` (Windows)
     - `Kreatif-Multimedia_1.0.0_amd64.deb` / `.AppImage` (Linux)
     - `Kreatif-Multimedia_1.0.0_aarch64.dmg` (macOS Apple Silicon M1/M2/M3/M4)
     - `Kreatif-Multimedia_1.0.0_x64.dmg` (macOS Intel)

---

## 🔒 Konfigurasi Domain & SSL (HTTPS dengan Let's Encrypt / Certbot)

Jika menggunakan VPS (Ubuntu/Debian) dengan Nginx host:
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d studio.domainanda.com
```
Certbot akan otomatis memasang sertifikat SSL HTTPS gratis dan memperbarui perpanjangannya secara berkala.
