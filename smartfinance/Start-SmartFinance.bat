@echo off
title Smart Finance — Telegram Mini App
cd /d "%~dp0"
echo ========================================================
echo   Smart Finance Telegram Mini App Server
echo   Bot: @smartfinance1_bot
echo ========================================================
echo.
node scripts/run-all.mjs
pause
