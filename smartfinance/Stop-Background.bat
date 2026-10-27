@echo off
title Smart Finance — Stop Service
echo ========================================================
echo   Smart Finance to'xtatilmoqda...
echo ========================================================
echo.
taskkill /F /IM cloudflared.exe >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo.
echo [OK] Barcha fon jarayonlari muvaffaqiyatli to'xtatildi.
echo.
pause
