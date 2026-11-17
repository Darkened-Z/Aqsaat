package com.warraich.devicelock

import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.Intent
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
            UserManager.DISALLOW_DEBUGGING_FEATURES,
            UserManager.DISALLOW_MODIFY_ACCOUNTS
        )) runCatching { dpm.addUserRestriction(admin, r) }
    }

    fun showLock(message: String) {
        val i = Intent(ctx, LockActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra("message", message)
        ctx.startActivity(i)
    }
}
