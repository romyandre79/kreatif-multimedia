@echo off
title Build Linux Installer - Kreatif Multimedia Studio
echo ================================================================
echo  COMPILING LINUX INSTALLER (.deb / .AppImage)
echo ================================================================

wsl --status >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] WSL (Windows Subsystem for Linux) tidak ditemukan.
    echo.
    echo Karena kompilasi Linux membutuhkan toolchain Linux native (WebKitGTK, GLib),
    echo cara termudah mengompilasinya langsung dari Windows adalah:
    echo 1. Menggunakan CI/CD GitHub Actions (Jalankan build_release_cloud.bat)
    echo 2. Atau mengaktifkan WSL di Windows (wsl --install).
    echo.
    pause
    exit /b 1
)

echo Menjalankan build Linux di lingkungan WSL...
wsl bash -c "cd $(wslpath '%CD%') && npm run build && npm run tauri build"
if %errorlevel% neq 0 (
    echo [ERROR] Gagal kompilasi di WSL. Pastikan dependensi Linux (libwebkit2gtk) sudah terinstall di WSL.
    pause
    exit /b %errorlevel%
)

echo.
echo ================================================================
echo [SUKSES] Paket Linux (.deb / .AppImage) berhasil dibuat di:
echo %~dp0src-tauri\target\release\bundle\
echo ================================================================
pause
