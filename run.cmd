@echo off
:: Starts the lenso receiver. Leave this window open while you use the webcam.
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
    echo Run setup.cmd first.
    pause
    exit /b 1
)
.venv\Scripts\python.exe server\main.py %*
pause
