@echo off
:: Opens the lenso control app (Electron). It starts the receiver by itself if needed.
cd /d "%~dp0app"
if not exist "..\.venv\Scripts\python.exe" (
    echo Run setup.cmd first.
    pause
    exit /b 1
)
if not exist node_modules (
    echo Installing the control app, one time...
    call npm install --no-audit --no-fund --loglevel=error || (pause & exit /b 1)
)
if not exist out\main\index.js (
    echo Building the control app, one time...
    call npm run build || (pause & exit /b 1)
)
start "" "node_modules\electron\dist\electron.exe" .
