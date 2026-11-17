# Device Lock (DPC) — Warraich Corporation

A self-provisioned Android **Device Owner** app that locks a financed phone when the
customer's Aqsat installment plan goes overdue, and unlocks it when they pay. No Knox,
no Google Enterprise account, no OEM relationship required.

## What it does
- Checks in to Aqsat every ~6 hours (`/api/device/checkin`).
- **OK** → normal. **Warn** (overdue within grace) → reminder. **Lock** (overdue past grace) → full-screen lock.
- **Offline fallback:** if it can't reach the server for `offlineLockDays` (default 7), it hard-locks itself, so a phone kept off the network doesn't escape.
- **Offline unlock code:** the owner reads today's 6-digit code (shown per device on the Devices page) to the customer; it validates on the phone with no network and grants a 72h unlock.
- **Release:** when the loan is fully paid (or marked Released), the app drops all restrictions and clears Device Owner so the phone is fully the customer's.

## Honest limits — tell the customer, keep it legal
- It must be enrolled **before** handover, on a phone with no Google account yet. Nothing retroactive.
- Device Owner blocks factory reset from **Settings**, but a hardware **recovery-mode wipe** can still strip it on many phones. The backstop is Google's Factory Reset Protection (FRP) — only effective if an account was synced. Decide your FRP policy at enrollment.
- ColorOS/FuntouchOS (Oppo/Vivo/Realme) are less predictable than Samsung. Test per model.
- Only works while the plan data in Aqsat is correct. Logic **fails open** (never locks) on missing data; use **Mark lost** for stolen phones.
- The lock screen always shows the shop name + number and an emergency dialer. Keep signed consent per sale.

## Build
Open `device-lock/` in Android Studio (Giraffe+). Or CLI:
```
cd device-lock
gradle wrapper        # once, to generate the wrapper
./gradlew assembleRelease
```
APK: `app/build/outputs/apk/release/app-release.apk` (debug-signed; fine for sideloading).

## Enroll a phone (counter flow)
1. On the Devices page (`/devices` on your Aqsat URL), sign in, fill the plan/customer, **Create enrollment**, copy the string (`deviceId|secret|https://yourapp`).
2. Factory-reset the phone. **Do not add a Google account** during setup.
3. Developer options → USB debugging → connect USB.
4. `adb install app-release.apk`, open the app, paste the string, tap **Enroll**.
5. Run `provision/enroll-device.bat` (or `adb shell dpm set-device-owner com.warraich.devicelock/.AdminReceiver`).

## Manage
`/devices`: force-lock, force-unlock (ignore overdue), auto, mark lost, release, delete, and today's unlock code per phone. Everything else is automatic from the plan's overdue state.

## Config
- `applicationId` / package: `com.warraich.devicelock` (change in `app/build.gradle` + `set-device-owner` arg if you rebrand).
- Shop name/phone on the lock screen: `app/src/main/res/values/strings.xml`.
- `APP_BASE_URL` env on the server controls the URL baked into enrollment strings (else the request host is used).
