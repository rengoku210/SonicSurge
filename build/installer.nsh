; SonicSurge Custom NSIS Installer Script
; This file is included by electron-builder's NSIS process

!macro customHeader
  !system "echo SonicSurge Installer"
!macroend

!macro customInit
  ; Set installer branding
  BrandingText "SonicSurge v${VERSION} — Gaming Soundboard"
!macroend

!macro customInstall
  ; Create desktop shortcut with custom icon
  CreateShortcut "$DESKTOP\SonicSurge.lnk" "$INSTDIR\SonicSurge.exe" "" "$INSTDIR\SonicSurge.exe" 0
  
  ; Create Start Menu entry
  CreateDirectory "$SMPROGRAMS\SonicSurge"
  CreateShortcut "$SMPROGRAMS\SonicSurge\SonicSurge.lnk" "$INSTDIR\SonicSurge.exe" "" "$INSTDIR\SonicSurge.exe" 0
  CreateShortcut "$SMPROGRAMS\SonicSurge\Uninstall SonicSurge.lnk" "$INSTDIR\Uninstall SonicSurge.exe"
!macroend

!macro customUnInstall
  ; Remove shortcuts on uninstall
  Delete "$DESKTOP\SonicSurge.lnk"
  Delete "$SMPROGRAMS\SonicSurge\SonicSurge.lnk"
  Delete "$SMPROGRAMS\SonicSurge\Uninstall SonicSurge.lnk"
  RMDir "$SMPROGRAMS\SonicSurge"
!macroend
