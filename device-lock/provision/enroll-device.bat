@echo off
REM ==== Counter provisioning: make Device Lock the Device Owner ====
REM Requirements on this PC: platform-tools (adb) on PATH, phone in USB debugging.
REM The phone MUST be freshly reset with NO Google account added yet.
REM
REM Steps:
REM   1. Factory reset the phone (or brand new). Skip/period: do NOT add any Google account.
REM   2. Enable Developer options -> USB debugging, connect USB, accept the prompt.
REM   3. Install the app:   adb install app-release.apk
REM   4. Open the app, paste the enrollment string from the Devices page, tap Enroll.
REM   5. Run this script.
setlocal
set PKG=com.warraich.devicelock
echo Installing APK (if present in this folder)...
if exist app-release.apk adb install -r app-release.apk
echo.
echo Setting Device Owner...
adb shell dpm set-device-owner %PKG%/.AdminReceiver
echo.
echo If you saw "Success", the phone is now locked-financed.
echo If it failed with "already provisioned", the phone had an account - reset and retry.
pause
