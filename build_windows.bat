@echo off
title Build Windows Installer - Kreatif Multimedia Studio
echo ================================================================
echo  COMPILING WINDOWS INSTALLER (.exe / .msi)
echo ================================================================

echo 1. Build Frontend Web Assets...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Gagal mengompilasi frontend.
    pause
    exit /b %errorlevel%
)

echo.
echo 2. Bundling Aplikasi Tauri Windows...
call npm run tauri build
if %errorlevel% neq 0 (
    echo [ERROR] Gagal bundling Tauri Windows.
    pause
    exit /b %errorlevel%
)

echo.
echo ================================================================
echo [SUKSES] File installer Windows telah tersedia di:
echo %~dp0src-tauri\target\release\bundle\nsis\
echo %~dp0src-tauri\target\release\bundle\msi\
echo ================================================================
pause
