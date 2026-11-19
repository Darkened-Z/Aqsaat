package com.warraich.devicelock

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/**
 * Heartbeat. Decides lock state from the server answer, or — when offline past the
 * deadline — locks on its own so a phone kept off the network doesn't escape.
 */
class CheckinWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val p = Prefs(applicationContext)
        if (!p.enrolled) return Result.success()

        val loc = Loc.last(applicationContext)
        val r = Api.checkin(p.baseUrl!!, p.deviceId!!, p.secret!!, loc?.latitude, loc?.longitude, loc?.accuracy)
        val now = System.currentTimeMillis()

        if (r.reachable) {
            p.lastOkMs = now
            p.offlineLockDays = r.offlineLockDays
            p.callMode = r.callMode
            p.allowNumber = r.allowNumber
            when (r.action) {
                "release" -> { releaseSelf(p); return Result.success() }
                "lock" -> {
                    // A code-granted temporary unlock still holds until it expires.
                    if (now < p.unlockUntilMs) setState(p, "none", "") else setState(p, "hard", r.message)
                }
                "warn" -> setState(p, if (now < p.unlockUntilMs) "none" else "warn", r.message)
                else -> { p.unlockUntilMs = 0L; setState(p, "none", "") } // ok → clear any grace
            }
        } else {
            // Offline: lock once the deadline passes, unless inside a code grace window.
            val deadline = p.lastOkMs + p.offlineLockDays.toLong() * 86_400_000L
            if (now > deadline && now >= p.unlockUntilMs) {
                setState(p, "hard", "Phone could not reach the shop server. Please contact the shop.")
            }
        }
        return Result.success()
    }

    private fun setState(p: Prefs, state: String, msg: String) {
        p.lockState = state
        p.message = msg
        if (state == "hard") LockManager(applicationContext).showLock(msg)
    }

    private fun releaseSelf(p: Prefs) {
        val lm = LockManager(applicationContext)
        val dpm = applicationContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as android.app.admin.DevicePolicyManager
        if (lm.isDeviceOwner()) {
            // Hand the phone fully back to the customer: drop restrictions and ownership.
            lm.clearFrpPolicy()
            runCatching {
                val admin = AdminReceiver.component(applicationContext)
                for (r in listOf(
                    android.os.UserManager.DISALLOW_FACTORY_RESET,
                    android.os.UserManager.DISALLOW_SAFE_BOOT,
                    android.os.UserManager.DISALLOW_ADD_USER,
                    android.os.UserManager.DISALLOW_DEBUGGING_FEATURES,
                    android.os.UserManager.DISALLOW_MODIFY_ACCOUNTS
                )) runCatching { dpm.clearUserRestriction(admin, r) }
                dpm.setUninstallBlocked(admin, applicationContext.packageName, false)
            }
            runCatching { dpm.clearDeviceOwnerApp(applicationContext.packageName) }
        }
        p.clear()
        WorkManager.getInstance(applicationContext).cancelUniqueWork(UNIQUE)
    }

    companion object {
        const val UNIQUE = "devicelock-checkin"

        fun schedule(ctx: Context) {
            val req = PeriodicWorkRequestBuilder<CheckinWorker>(6, TimeUnit.HOURS)
                .build()
            WorkManager.getInstance(ctx)
                .enqueueUniquePeriodicWork(UNIQUE, ExistingPeriodicWorkPolicy.UPDATE, req)
        }
    }
}
