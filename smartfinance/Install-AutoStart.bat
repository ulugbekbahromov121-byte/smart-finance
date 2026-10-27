@echo off
title Smart Finance — Windows AutoStart Sozlash
cd /d "%~dp0"
echo ========================================================
echo   Smart Finance Windows Startup-ga biriktirilmoqda...
echo ========================================================
echo.

powershell -NoProfile -Command ^
  "$WshShell = New-Object -ComObject WScript.Shell; " ^
  "$Shortcut = $WshShell.CreateShortcut([Environment]::GetFolderPath('Startup') + '\SmartFinance-AutoStart.lnk'); " ^
  "$Shortcut.TargetPath = 'wscript.exe'; " ^
  "$Shortcut.Arguments = '\"" + (Get-Location).Path + "\Start-Background.vbs\"'; " ^
  "$Shortcut.WorkingDirectory = (Get-Location).Path; " ^
  "$Shortcut.WindowStyle = 7; " ^
  "$Shortcut.Save();"

echo [OK] Windows Startup-ga muvaffaqiyatli qo'shildi!
echo Endi kompyuter yonganda Smart Finance fonda avtomatik ishga tushadi.
echo Antigravity yoki boshqa oynalarni yopsangiz ham 24/7 ishlab turadi.
echo.
pause
