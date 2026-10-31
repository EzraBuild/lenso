@echo off
:: Creates the Python environment and installs dependencies. Run once.
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
    echo Creating Python environment...
    py -3 -m venv .venv || python -m venv .venv
)
.venv\Scripts\python.exe -m pip install --upgrade pip -q
.venv\Scripts\python.exe -m pip install -r server\requirements.txt -q
.venv\Scripts\python.exe tools\make_icon.py
echo.
echo Setup done. Next: run install-camera.cmd once (admin), then run.cmd
pause
