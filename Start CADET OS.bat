@echo off
chcp 65001 >nul
title CADET OS
cd /d "%~dp0"

if not exist node_modules (
  echo Installing for the first time, this takes a minute...
  call npm install
)

echo.
echo  CADET OS is starting. Your browser will open in a moment.
echo  Keep this window open while you use the app. Close it to stop.
echo.
start "" cmd /c "timeout /t 3 >nul & start http://localhost:5173/"
call npx vite --port 5173
