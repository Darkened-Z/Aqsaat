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

## One-time setup (no PC needed again after this)
1. Build & **sign** the APK, host it at a public HTTPS URL (GitHub release, Supabase Storage, anywhere downloadable).
2. Get its signature checksum (base64url of the signing cert's SHA-256):
   ```
   keytool -list -printcert -jarfile app-release.apk
   # take the SHA-256, or compute PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM
   ```
   (See Android's "Checksum of the device policy controller" docs — it's the signing cert hash, base64url, no padding.)
3. On `/devices`, in **Provisioning QR**, paste the APK URL + checksum (+ optional shop Wi-Fi). It remembers them. This QR is the same for every phone.
4. Set `buildConfigField APP_BASE_URL` in `app/build.gradle` to your real Aqsat URL and rebuild, so phones only need the short code.

## Enroll a phone — counter flow, NO PC
1. On `/devices`: **Create enrollment** (plan/customer) → note the 7-char **code**.
2. **Factory-reset** the phone. On the first "Hi there" welcome screen, **tap it 6 times** → a QR scanner opens.
3. Scan the **Provisioning QR**. The phone joins Wi-Fi, downloads the APK, and makes it Device Owner by itself.
4. Device Lock opens → type the 7-char **code** → tap Enroll. Done.

### PC fallback (if a phone won't QR-provision)
Use `provision/enroll-device.bat`: `adb install`, open app, paste the `deviceId|secret|url` fallback string from `/devices`, then `adb shell dpm set-device-owner com.warraich.devicelock/.AdminReceiver`.

## Manage
`/devices`: force-lock, force-unlock (ignore overdue), auto, mark lost, release, delete, and today's unlock code per phone. Everything else is automatic from the plan's overdue state.

## Factory Reset Protection (close the recovery-wipe gap)
`DISALLOW_FACTORY_RESET` only blocks reset from Settings. A recovery-mode wipe can
still strip Device Owner on many phones. To survive that, the app arms FRP with your
**shop** Google account via `setFactoryResetProtectionPolicy` — set automatically on
every phone, no Google sign-in at the counter, and it does **not** need the customer
to add any account.

Setup:
1. Make one **dedicated shop Google account** (never a customer's — a wipe would then lock *them* out).
2. Get its **account ID** (obfuscated Gaia ID, not the email). One way: sign that account in on any Android phone, then read the id with Google's People API `people/me?personFields=metadata` (the `id` under a Google `source`), or use any "Gaia ID" lookup against the signed-in account. It's a long numeric string.
3. Put it in `app/build.gradle` → `buildConfigField FRP_ACCOUNT_IDS` (comma-separate for several), rebuild.

Caveats (be honest with yourself):
- **Android 11+ only.** Older phones keep just the Settings-level block.
- **OEM-dependent.** Honoured on AOSP/Pixel and many recent phones; Samsung One UI and some Vivo/Oppo may ignore the AOSP policy or need their own scheme. Where unsupported it silently no-ops — test per model and don't assume it's armed.
- On **Release** the app clears the FRP policy so the paid-off phone is clean.
- This is the shop account securing a financed phone, with signed consent — not capturing or touching the customer's own Google account.

## Config
- `applicationId` / package: `com.warraich.devicelock` (change in `app/build.gradle` + `set-device-owner` arg if you rebrand).
- Shop name/phone on the lock screen: `app/src/main/res/values/strings.xml`.
- `APP_BASE_URL` env on the server controls the URL baked into enrollment strings (else the request host is used).
