; Registers the UnityCapture DirectShow filter as the "lenso" webcam during install
; (the installer already runs elevated because perMachine is set) and removes it on uninstall.
!macro customInstall
  ExecWait 'regsvr32 /s "$INSTDIR\resources\vendor\UnityCaptureFilter64.dll" "/i:UnityCaptureName=lenso"'
  ExecWait 'regsvr32 /s "$INSTDIR\resources\vendor\UnityCaptureFilter32.dll" "/i:UnityCaptureName=lenso"'
!macroend

!macro customUnInstall
  ExecWait 'regsvr32 /s /u "$INSTDIR\resources\vendor\UnityCaptureFilter64.dll"'
  ExecWait 'regsvr32 /s /u "$INSTDIR\resources\vendor\UnityCaptureFilter32.dll"'
!macroend
