@echo off
title Smart Finance — Status
cd /d "%~dp0"
echo ========================================================
echo   Smart Finance — Holat tekshiruvi
echo ========================================================
echo.

netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [Server] Next.js ishlab turibdi (Port 3000: OK)
) else (
    echo [Server] Next.js hozirda ISHLAMAYAPTI!
)

tasklist /FI "IMAGENAME eq cloudflared.exe" | findstr cloudflared.exe >nul
if %errorlevel% equ 0 (
    echo [Tunnel] Cloudflare Tunnel ishlab turibdi (cloudflared.exe: OK)
) else (
    echo [Tunnel] Cloudflare Tunnel hozirda ISHLAMAYAPTI!
)

echo.
if exist "data\current_url.txt" (
    set /p LIVE_URL=<data\current_url.txt
    echo ========================================================
    echo   JONLI HTTPS MANZILI:
    echo   %LIVE_URL%
    echo ========================================================
)

echo.
echo Songi 8 qator log:
echo --------------------------------------------------------
if exist "data\service.log" (
    powershell -NoProfile -Command "Get-Content data\service.log -Tail 8"
) else (
    echo Hozircha log fayli mavjud emas.
)
echo --------------------------------------------------------
echo.
pause
