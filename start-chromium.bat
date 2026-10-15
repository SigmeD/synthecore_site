@echo off
cd /d "%~dp0"
"C:\Program Files\PowerShell\7\pwsh.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-chromium.ps1"
if errorlevel 1 (
  echo Chromium startup failed. See output/playwright/chromium-stderr.log
)
pause
