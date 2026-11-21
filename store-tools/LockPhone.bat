@echo off
setlocal enabledelayedexpansion
title Warraich Corporation - Lock a Phone
color 0A
cd /d "%~dp0"
echo "%~dp0" | find /I "%TEMP%" >nul && ( echo  Please EXTRACT the ZIP first ^(right-click ^> Extract All^), then run LockPhone.bat from that folder. & pause & exit /b )

set ADB=%~dp0platform-tools\adb.exe
set APK=%~dp0device-lock.apk
set PKG=com.warraich.devicelock/.AdminReceiver

echo(
echo  ============================================================
echo    WARRAICH CORPORATION  -  PHONE LOCK TOOL
echo  ============================================================
echo(

REM ---- First-run setup: fetch adb tools if missing ----
if not exist "%ADB%" (
  echo  First time setup. Downloading tools, please wait...
  powershell -NoProfile -Command "try{Invoke-WebRequest 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip' -OutFile 'pt.zip'}catch{exit 1}"
  if errorlevel 1 ( echo  COULD NOT DOWNLOAD TOOLS - check internet. & pause & exit /b )
  powershell -NoProfile -Command "Expand-Archive -Force 'pt.zip' '.'"
  del pt.zip >nul 2>&1
)

REM ---- Refresh the lock app; keep the bundled copy if offline ----
echo  Getting the latest lock app...
powershell -NoProfile -Command "try{Invoke-WebRequest 'https://aqsaat.vercel.app/device-lock.apk' -OutFile 'device-lock.new'}catch{exit 1}"
if not errorlevel 1 ( move /y "device-lock.new" "%APK%" >nul ) else ( del "device-lock.new" >nul 2>&1 & echo  No internet - using the lock app included in this folder. )
if not exist "%APK%" ( echo  COULD NOT DOWNLOAD LOCK APP - connect to internet and try again. & pause & exit /b )

echo(
echo  BEFORE YOU START, THE PHONE MUST BE:
echo    1^) Factory reset  (NO Google account added)
echo    2^) USB debugging turned ON
echo    3^) Connected with the USB cable
echo    4^) Tap ALLOW on the phone when it asks about this computer
echo(
echo  Press any key when the phone is connected...
pause >nul

echo(
echo  Looking for the phone...
"%ADB%" start-server >nul 2>&1
"%ADB%" wait-for-device
echo  Phone found. Installing the lock app...
"%ADB%" install -r "%APK%"

echo  Applying the lock...
"%ADB%" shell dpm set-device-owner %PKG% > "%~dp0result.txt" 2>&1
type "%~dp0result.txt"
echo(

findstr /C:"Success" "%~dp0result.txt" >nul
if !errorlevel!==0 (
  color 0A
  echo  ============================================================
  echo    DONE!  THIS PHONE IS NOW LOCKED-READY.
  echo  ============================================================
  echo  Next: open the "Device Lock" app on the phone and type the
  echo  7-letter enrollment code from the Devices page.
  "%ADB%" shell monkey -p com.warraich.devicelock 1 >nul 2>&1
) else (
  color 0C
  echo  ============================================================
  echo    IT DID NOT WORK.
  echo  ============================================================
  echo  Most common reason: a Google account is still on the phone.
  echo  Factory reset again, DO NOT add any account, then retry.
  echo  If it still fails, send this screen to the owner.
)
del "%~dp0result.txt" >nul 2>&1
echo(
pause
