=====================================================
  HOW TO LOCK A PHONE (USB cable, on the computer)
  Warraich Corporation
=====================================================

In this folder:
  - LockPhone.bat      <- run this
  - device-lock.apk    <- the lock app (installed for you, don't open it)
  - these guides

ONE-TIME SETUP
  - Right-click the ZIP > "Extract All". Do NOT run it from inside the ZIP.
  - Put the extracted folder on the Desktop.
  - The first run downloads the phone tools (needs internet).

FOR EACH NEW PHONE
 1) Factory reset the phone.
 2) During setup you may join Wi-Fi, but DO NOT add any Google account.
    Skip everything.
 3) Settings > About phone > tap "Build number" 7 times.
 4) Settings > System > Developer options > turn ON "USB debugging".
 5) Connect the phone to the computer with the USB cable.
 6) On the phone, tick "Always allow" and tap ALLOW.
 7) Double-click LockPhone.bat.
    (If a blue "Windows protected your PC" box appears:
     More info > Run anyway.)
 8) Press any key when it asks.
 9) Green "DONE!" = phone is ready.
10) On aqsaat.vercel.app/devices, pick the plan and create the
    enrollment. You get a 7-character code.
11) Type that code into the "Device Lock" app on the phone.
12) The Devices page shows a green "App active" under the phone.
13) Turn USB debugging back OFF on the phone.

IF IT SAYS "IT DID NOT WORK"
  - Usually an account is still on the phone (Google / Xiaomi / Vivo etc.).
    Remove it in Settings > Accounts, or factory reset again.
  - "Phone found" never appears: try another cable and check you
    tapped Allow on the phone.
  - Still failing: send a photo of the screen to the owner.

REMEMBER
  - When the loan is fully paid, press Release on the Devices page.
    The phone frees itself the next time it goes online.
  - Never Delete a phone before it is released (the system blocks it).
=====================================================
