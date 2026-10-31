@echo off
:: Registers the "lenso" virtual webcam (UnityCapture DirectShow filter).
:: Run once. Asks for admin because regsvr32 needs it.

>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Requesting administrator rights...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
set SRC=vendor\unitycapture\UnityCapture-master\Install
set BIN=vendor\unitycapture\bin
if not exist "%BIN%" mkdir "%BIN%"
if exist "%SRC%\UnityCaptureFilter64.dll" (
    copy /y "%SRC%\UnityCaptureFilter32.dll" "%BIN%\" >nul
    copy /y "%SRC%\UnityCaptureFilter64.dll" "%BIN%\" >nul
)

echo Registering virtual camera "lenso" ...
regsvr32 /s "%BIN%\UnityCaptureFilter32.dll" "/i:UnityCaptureName=lenso"
regsvr32 /s "%BIN%\UnityCaptureFilter64.dll" "/i:UnityCaptureName=lenso"
if '%errorlevel%' NEQ '0' (
    echo FAILED. Try running this file as administrator manually.
) else (
    echo Done. "lenso" now shows up as a webcam in Zoom, Teams, Discord, Chrome, OBS.
)
echo.
pause
