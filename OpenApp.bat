@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo GymPlan is running at http://localhost:5173
echo Close this window to stop the app.
start "" /b node tools\serve.js
timeout /t 1 /nobreak >nul
start "" http://localhost:5173
pause >nul
