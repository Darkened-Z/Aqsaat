package com.warraich.devicelock

import android.app.ActivityManager
import android.app.admin.DevicePolicyManager
import android.app.admin.FactoryResetProtectionPolicy
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.UserManager

/** Wraps Device Owner powers and the lock-screen launch. Safe to call when not owner. */
class LockManager(private val ctx: Context) {
    private val dpm = ctx.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val admin by lazy { AdminReceiver.component(ctx) }

    fun isDeviceOwner(): Boolean = dpm.isDeviceOwnerApp(ctx.packageName)

    /** Lock down the obvious escape routes. No-op unless we are Device Owner. */
    fun applyOwnerPolicies() {
        if (!isDeviceOwner()) return
        runCatching { dpm.setUninstallBlocked(admin, ctx.packageName, true) }
        runCatching { dpm.setLockTaskPackages(admin, arrayOf(ctx.packageName)) }
        for (r in listOf(
            UserManager.DISALLOW_FACTORY_RESET,
            UserManager.DISALLOW_SAFE_BOOT,
            UserManager.DISALLOW_ADD_USER,
            UserManager.DISALLOW_DEBUGGING_FEATURES
        )) runCatching { dpm.addUserRestriction(admin, r) }
        // Customers must be able to add their own Google account; lift it on phones set up by v1.2 or older.
        runCatching { dpm.clearUserRestriction(admin, UserManager.DISALLOW_MODIFY_ACCOUNTS) }
        grantRuntimePerms()
        // Force location services on so a fresh fix is available for recovery.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) runCatching { dpm.setLocationEnabled(admin, true) }
        applyFrpPolicy(Prefs(ctx).frpIds)
        restoreSystemApps()
    }

    /**
     * Fully-managed setup removes the phone maker's preloaded apps (WhatsApp, Facebook…
     * on DCODE) for the user unless the DPC itself asks to keep them; their icons and the
     * Play Store then say "Blocked by work policy". Put back every preloaded app that has
     * a launcher icon but isn't installed, or is hidden, for this user.
     */
    fun restoreSystemApps() {
        if (!isDeviceOwner()) return
        val pm = ctx.packageManager
        val fixed = mutableListOf<String>()
        val apps = runCatching { pm.getInstalledApplications(PackageManager.MATCH_UNINSTALLED_PACKAGES) }.getOrDefault(emptyList())
        for (ai in apps) {
            if (ai.flags and ApplicationInfo.FLAG_SYSTEM == 0) continue
            val pkg = ai.packageName
            val missing = ai.flags and ApplicationInfo.FLAG_INSTALLED == 0
            val hidden = runCatching { dpm.isApplicationHidden(admin, pkg) }.getOrDefault(false)
            if (!missing && !hidden) continue
            val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER).setPackage(pkg)
            if (runCatching { pm.queryIntentActivities(launcher, PackageManager.MATCH_UNINSTALLED_PACKAGES or PackageManager.MATCH_DISABLED_COMPONENTS) }.getOrDefault(emptyList()).isEmpty()) continue
            if (missing) runCatching { dpm.enableSystemApp(admin, pkg) }
            if (hidden) runCatching { dpm.setApplicationHidden(admin, pkg, false) }
            fixed += pkg
        }
        if (fixed.isNotEmpty()) {
            Prefs(ctx).appsFix = (java.text.SimpleDateFormat("d MMM HH:mm", java.util.Locale.US).format(java.util.Date()) +
                " restored ${fixed.size}: " + fixed.joinToString(", ") { it.removePrefix("com.") }).take(160)
        }
    }

    /**
     * As Device Owner, silently grant the permissions the feature set needs so the
     * customer is never prompted and can't deny them: location (for recovery of a
     * phone reported lost) and notifications (for the shop-managed disclosure).
     */
    private fun grantRuntimePerms() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
        val perms = mutableListOf(
            android.Manifest.permission.ACCESS_FINE_LOCATION,
            android.Manifest.permission.ACCESS_COARSE_LOCATION,
            // SIM serial / IMEI for SIM lock and the device info shown to the shop.
            android.Manifest.permission.READ_PHONE_STATE,
            // Silent USSD to learn each SIM's own number (Pakistani SIMs don't store it).
            android.Manifest.permission.CALL_PHONE,
            // Telenor answers the "my number" code by SMS; only that reply is read (SimNumber).
            android.Manifest.permission.RECEIVE_SMS
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) perms += android.Manifest.permission.READ_PHONE_NUMBERS
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) perms += android.Manifest.permission.ACCESS_BACKGROUND_LOCATION
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) perms += android.Manifest.permission.POST_NOTIFICATIONS
        for (perm in perms) runCatching {
            dpm.setPermissionGrantState(admin, ctx.packageName, perm, DevicePolicyManager.PERMISSION_GRANT_STATE_GRANTED)
        }
    }

    /**
     * Arms Factory Reset Protection with the shop account(s), so a recovery-mode wipe
     * (which DISALLOW_FACTORY_RESET can't stop) leaves the phone demanding the shop
     * account at setup. Android 11+ and only where the OEM honours the AOSP policy;
     * a no-op / throw elsewhere is swallowed.
     */
    /** [serverIds] from check-in (comma-separated); falls back to the compiled-in list. True if applied. */
    fun applyFrpPolicy(serverIds: String): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R || !isDeviceOwner()) return false
        val ids = serverIds.ifBlank { BuildConfig.FRP_ACCOUNT_IDS }.split(",").map { it.trim() }.filter { it.isNotEmpty() }
        return runCatching {
            dpm.setFactoryResetProtectionPolicy(admin, if (ids.isEmpty()) null else FactoryResetProtectionPolicy.Builder()
                .setFactoryResetProtectionAccounts(ids)
                .setFactoryResetProtectionEnabled(true)
                .build())
        }.isSuccess
    }

    /** Called on Release so the freed phone no longer challenges for the shop account. */
    fun clearFrpPolicy() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R || !isDeviceOwner()) return
        runCatching { dpm.setFactoryResetProtectionPolicy(admin, null) }
    }

    fun pinned(): Boolean = runCatching {
        ctx.getSystemService(ActivityManager::class.java).lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
    }.getOrDefault(false)

    /**
     * Lock-task left on after the lock lifted blocks every other app ("Blocked by work
     * policy") with no lock screen to close it: the unlock arrived while the lock screen
     * was in the background, so it never ran stopLockTask. Dropping our package from the
     * allowlist makes the system end lock-task; then it's put back for the next lock.
     */
    fun exitStaleLockTask() {
        val p = Prefs(ctx)
        if (p.lockState == "hard" && System.currentTimeMillis() >= p.unlockUntilMs) return
        if (!pinned() || !isDeviceOwner()) return
        runCatching { dpm.setLockTaskPackages(admin, emptyArray()) }
        runCatching { dpm.setLockTaskPackages(admin, arrayOf(ctx.packageName)) }
        p.pinFix = java.text.SimpleDateFormat("d MMM HH:mm", java.util.Locale.US).format(java.util.Date()) + if (pinned()) " failed" else " cleared"
    }

    fun showLock(message: String) {
        val i = Intent(ctx, LockActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra("message", message)
        ctx.startActivity(i)
    }
}
