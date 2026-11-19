@echo off
setlocal enabledelayedexpansion
title Kreatif Multimedia Studio - Compile Menu

:MENU
cls
echo ================================================================
echo           KREATIF MULTIMEDIA STUDIO - BUILD MENU
echo ================================================================
echo  [1] Compile Windows Installer (.exe / .msi)
echo  [2] Compile Linux Binary (via WSL / Docker)
echo  [3] Cross-Compile / Trigger GitHub Actions Release (Windows, Linux, macOS)
echo  [4] Quick Build Frontend Only (Vite + TypeScript)
echo  [5] Exit
echo ================================================================
set /p CHOICE="Pilih opsi [1-5]: "

if "%CHOICE%"=="1" goto BUILD_WINDOWS
if "%CHOICE%"=="2" goto BUILD_LINUX
if "%CHOICE%"=="3" goto TRIGGER_ACTIONS
if "%CHOICE%"=="4" goto BUILD_FRONTEND
if "%CHOICE%"=="5" goto EXIT
goto MENU

:BUILD_WINDOWS
cls
echo ================================================================
echo  Memulai Kompilasi Installer Windows (.exe & .msi)
echo ================================================================
echo 1. Building Frontend (Vite)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Gagal build frontend!
    pause
    goto MENU
)

echo.
echo 2. Bundling Aplikasi Tauri untuk Windows...
call npm run tauri build
if %errorlevel% neq 0 (
    echo [ERROR] Gagal build Tauri Windows!
    pause
    goto MENU
)

echo.
echo [SUKSES] Installer Windows berhasil dibuat di:
echo src-tauri\target\release\bundle\nsis\
echo src-tauri\target\release\bundle\msi\
echo ================================================================
pause
goto MENU

:BUILD_LINUX
cls
echo ================================================================
echo  Kompilasi Linux (.deb / .AppImage)
echo ================================================================
echo Mengecek ketersediaan WSL (Windows Subsystem for Linux)...
wsl --status >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [INFO] WSL tidak terdeteksi di sistem ini.
    echo Kompilasi Linux native (.deb/.AppImage) paling optimal dijalankan
    echo melalui GitHub Actions atau melalui mesin Linux / WSL.
    echo.
    echo Ingin trigger rilis otomatis multi-platform via GitHub Actions? (Y/N)
    set /p CONFIRM="Pilih [Y/N]: "
    if /i "!CONFIRM!"=="Y" goto TRIGGER_ACTIONS
    goto MENU
)

echo Menjalankan build di WSL Linux...
wsl bash -c "cd $(wslpath '%CD%') && npm run build && npm run tauri build"
pause
goto MENU

:TRIGGER_ACTIONS
cls
echo ================================================================
echo  Trigger CI/CD GitHub Actions (Windows + Linux + macOS ARM & Intel)
echo ================================================================
echo Pilihan ini akan membuat Git Tag rilis dan melakukan push ke GitHub,
echo yang otomatis memicu GitHub Actions untuk meng-compile binary untuk:
echo   - Windows (.msi, .exe)
echo   - Linux (.deb, .AppImage)
echo   - macOS Apple Silicon M1/M2/M3/M4 (.dmg)
echo   - macOS Intel (.dmg)
echo.
set /p VERSION_TAG="Masukkan versi rilis (contoh: v1.0.0): "
if "!VERSION_TAG!"=="" (
    echo [BATAL] Versi tidak boleh kosong.
    pause
    goto MENU
)

echo.
echo Membuat Git Tag !VERSION_TAG! dan push ke remote...
git tag !VERSION_TAG!
git push origin !VERSION_TAG!
if %errorlevel% neq 0 (
    echo.
    echo [CATATAN] Jika remote belum dihubungkan, hubungkan dulu dengan:
    echo git remote add origin https://github.com/USERNAME/REPO.git
    echo git push -u origin main --tags
) else (
    echo.
    echo [SUKSES] Tag !VERSION_TAG! berhasil di-push!
    echo Periksa tab Actions di GitHub repository Anda untuk mengunduh installer.
)
pause
goto MENU

:BUILD_FRONTEND
cls
echo ================================================================
echo  Building Frontend Web Only...
echo ================================================================
call npm run build
echo ================================================================
pause
goto MENU

:EXIT
exit
