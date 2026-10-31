@echo off
:: Removes the "lenso" virtual webcam.
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Requesting administrator rights...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)
cd /d "%~dp0"
set BIN=vendor\unitycapture\bin
regsvr32 /s /u "%BIN%\UnityCaptureFilter32.dll"
regsvr32 /s /u "%BIN%\UnityCaptureFilter64.dll"
echo Removed.
pause
