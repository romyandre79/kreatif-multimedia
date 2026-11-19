# Panduan Kontribusi

Terima kasih atas minat Anda untuk berkontribusi di **Kreatif Multimedia Studio**! Panduan ini membantu Anda memulai.

---

## Prasyarat Development

1. **Node.js** v18+ atau v20+ dan npm.
2. **Rust & Cargo** — install via [rustup.rs](https://rustup.rs/).
3. Dependensi sistem sesuai OS (lihat [README.md](./README.md#-panduan-memulai-development)).

## Memulai

```bash
# Clone repositori
git clone https://github.com/<username>/kreatif-multimedia.git
cd kreatif-multimedia

# Install dependensi frontend
npm install

# Jalankan mode development
npm run tauri dev
```

## Alur Kontribusi

1. **Fork** repositori ini.
2. Buat branch baru: `git checkout -b fitur/nama-fitur-baru`.
3. Lakukan perubahan dan tulis commit yang jelas:
   - Gunakan format: `feat: tambah fitur X`, `fix: perbaiki bug Y`, `docs: perbarui dokumentasi Z`.
4. Push branch: `git push origin fitur/nama-fitur-baru`.
5. Buat **Pull Request** ke branch `main`.

## Konvensi Kode

- **Frontend (TypeScript/React)**: Gunakan format Prettier dan aturan ESLint yang ada di konfigurasi proyek.
- **Backend (Rust)**: Jalankan `cargo fmt` dan `cargo clippy` sebelum commit.
- **Commit Message**: Ikuti format [Conventional Commits](https://www.conventionalcommits.org/), misal:
  - `feat:` untuk fitur baru
  - `fix:` untuk perbaikan bug
  - `docs:` untuk perubahan dokumentasi
  - `refactor:` untuk refaktor kode
  - `chore:` untuk tugas pemeliharaan

## Melaporkan Bug

Buat issue baru di GitHub dengan informasi:
- Versi aplikasi & OS yang digunakan.
- Langkah untuk mereproduksi bug.
- Screenshot / log error jika ada.

## Mengajukan Fitur Baru

Buat issue baru dengan label `enhancement` dan jelaskan:
- Apa fitur yang diinginkan.
- Mengapa fitur ini berguna.
- Contoh penggunaan (jika ada).
