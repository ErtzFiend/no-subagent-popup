@echo off
setlocal
echo No Subagent Popup - guarded installer
echo Fully exit Hermes first, including its tray icon.
echo This installer never kills an application process.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%LOCALAPPDATA%\no-subagent-popup\project\scripts\install-windows.ps1"
if errorlevel 1 (
  echo.
  echo Installation did not complete. The message above explains why.
  pause
  exit /b 1
)
echo.
echo Installation verified. Opening Hermes in your desktop session.
start "" "%LOCALAPPDATA%\hermes\hermes-agent\apps\desktop\release\win-unpacked\Hermes.exe"
pause
