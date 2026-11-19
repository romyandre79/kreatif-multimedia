@echo off
setlocal enabledelayedexpansion
title Release Cloud Multi-Platform - Kreatif Multimedia Studio
echo ================================================================
echo  TRIGGER CI/CD GITHUB ACTIONS (WINDOWS + LINUX + MACOS)
echo ================================================================
echo.
echo Catatan: Kompilasi macOS (.dmg) dan Linux (.deb/.AppImage) secara native
echo dari OS Windows paling handal dijalankan via GitHub Actions runner resmi Apple & Linux.
echo.
set /p VERSION="Masukkan Tag Versi rilis baru (contoh: v1.0.0): "

if "%VERSION%"=="" (
    echo [BATAL] Versi tidak boleh kosong.
    pause
    exit /b 1
)

echo.
echo Memeriksa status Git...
git status --porcelain
echo.
echo Membuat Git tag %VERSION%...
git tag %VERSION%
if %errorlevel% neq 0 (
    echo [ERROR] Gagal membuat tag %VERSION%. Mungkin tag sudah ada.
    pause
    exit /b %errorlevel%
)

echo Mengirim tag ke remote GitHub...
git push origin %VERSION%
if %errorlevel% neq 0 (
    echo.
    echo [PERINGATAN] Gagal push ke remote.
    echo Pastikan remote origin sudah terhubung:
    echo   git remote add origin https://github.com/USERNAME/REPO.git
    echo   git push -u origin main --tags
    pause
    exit /b %errorlevel%
)

echo.
echo ================================================================
echo [SUKSES] Tag %VERSION% berhasil dikirim ke GitHub!
echo GitHub Actions sekarang sedang otomatis meng-compile:
echo   - Windows: Installer .exe & .msi
echo   - Linux: .deb & .AppImage
echo   - macOS: Apple Silicon .dmg (M1/M2/M3/M4) & Intel .dmg
echo.
echo Anda bisa memantau dan mengunduh hasilnya di tab:
echo GitHub -> Actions -> Release Multi-Platform
echo ================================================================
pause
