package com.warraich.devicelock

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ForegroundInfo
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/** Periodic heartbeat; the logic lives in [Checkin] so "Check now" behaves identically. */
class CheckinWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        Checkin.run(applicationContext)
        return Result.success()
    }

    // Expedited (push-triggered) work runs as a foreground service before Android 12.
    override suspend fun getForegroundInfo(): ForegroundInfo =
        ForegroundInfo(43, Notify.working(applicationContext))

    companion object {
        const val UNIQUE = "devicelock-checkin"

        fun schedule(ctx: Context, minutes: Int = Prefs(ctx).checkinMinutes) {
            val req = PeriodicWorkRequestBuilder<CheckinWorker>(minutes.coerceAtLeast(15).toLong(), TimeUnit.MINUTES)
                .build()
            WorkManager.getInstance(ctx)
                .enqueueUniquePeriodicWork(UNIQUE, ExistingPeriodicWorkPolicy.UPDATE, req)
        }
    }
}

/**
 * Decides lock state from the server answer, or — when offline past the deadline —
 * locks on its own so a phone kept off the network doesn't escape.
 */
object Checkin {
    /** [freshLocation] false = last-known fix only (lock-screen polling every minute). */
    suspend fun run(ctx: Context, freshLocation: Boolean = true): CheckinResult? {
        val p = Prefs(ctx)
        if (!p.enrolled) return null

        val loc = if (freshLocation) Loc.fresh(ctx) else Loc.last(ctx)
        if (freshLocation) runCatching { SimNumber.fill(ctx) }
        val sim = SimGuard.snapshot(ctx)
        LockManager(ctx).exitStaleLockTask()
        val info = runCatching { DeviceInfo.collect(ctx) }.getOrNull()
        val r = Api.checkin(p.baseUrl!!, p.deviceId!!, p.secret!!, loc?.latitude, loc?.longitude, loc?.accuracy, locPerm(ctx), p.pushToken, sim.toJson(), info)
        val now = System.currentTimeMillis()

        if (r.reachable) {
            p.lastOkMs = now
            p.offlineLockDays = r.offlineLockDays
            p.callMode = r.callMode
            p.allowNumber = r.allowNumber
            p.payUrl = r.payUrl
            p.dueAmount = r.dueAmount
            // Lost / force-locked phones report every 15 min instead of every 6 h.
            if (r.checkinMinutes != p.checkinMinutes) {
                p.checkinMinutes = r.checkinMinutes
                CheckinWorker.schedule(ctx, r.checkinMinutes)
            }
            if (r.frpAccountIds != p.frpIds && LockManager(ctx).applyFrpPolicy(r.frpAccountIds)) p.frpIds = r.frpAccountIds
            if (r.simMode != p.simMode) SimGuard.applyPolicy(ctx, r.simMode)
            p.simMode = r.simMode
            p.simIccids = r.simIccids
            when (r.action) {
                "release" -> { releaseSelf(ctx, p); return r }
                "lock", "warn" -> {
                    // A manual lock from the shop ends any unlock. Otherwise an offline code
                    // or the shop's timed unlock holds the lock until it runs out.
                    // Pre-1.12 a code unlock lived only in unlockUntilMs (with lockState "none").
                    if (p.codeUntilMs == 0L && p.lockState == "none" && p.unlockUntilMs > now) p.codeUntilMs = p.unlockUntilMs
                    if (r.override) p.codeUntilMs = 0L
                    p.unlockUntilMs = if (r.override) 0L else maxOf(if (p.codeUntilMs > now) p.codeUntilMs else 0L, r.graceUntil)
                    val held = now < p.unlockUntilMs
                    if (held) Relock.at(ctx, p.unlockUntilMs)
                    when {
                        r.action == "warn" -> setState(ctx, p, if (held) "none" else "warn", r.message)
                        held -> { p.lockState = "hard"; p.message = r.message }
                        else -> setState(ctx, p, "hard", r.message)
                    }
                }
                else -> { p.unlockUntilMs = 0L; p.codeUntilMs = 0L; setState(ctx, p, "none", "") } // ok → clear any grace
            }
            SimGuard.enforce(ctx, sim)
            LockManager(ctx).exitStaleLockTask()
            Updater.installIfNewer(ctx, r.latestVersion, r.apkUrl)
        } else {
            SimGuard.enforce(ctx, sim)
            val deadline = p.lastOkMs + p.offlineLockDays.toLong() * 86_400_000L
            if (now > deadline && now >= p.unlockUntilMs) {
                setState(ctx, p, "hard", "Phone could not reach the shop server. Please contact the shop.")
            } else if (p.lockState == "hard" && now >= p.unlockUntilMs) {
                // A timed / code unlock ran out with no network: the held lock comes back.
                LockManager(ctx).showLock(p.message)
            }
        }
        return r
    }

    /** "fg+bg" | "fg" | "none" — tells the shop why location may be missing. */
    private fun locPerm(ctx: Context): String {
        val fg = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!fg) return "none"
        val bg = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
        return if (bg) "fg+bg" else "fg"
    }

    private fun setState(ctx: Context, p: Prefs, state: String, msg: String) {
        p.lockState = state
        p.message = msg
        if (state == "hard") LockManager(ctx).showLock(msg)
    }

    private fun releaseSelf(ctx: Context, p: Prefs) {
        val lm = LockManager(ctx)
        val dpm = ctx.getSystemService(Context.DEVICE_POLICY_SERVICE) as android.app.admin.DevicePolicyManager
        if (lm.isDeviceOwner()) {
            // Hand the phone fully back to the customer: drop restrictions and ownership.
            lm.clearFrpPolicy()
            runCatching {
                val admin = AdminReceiver.component(ctx)
                for (r in listOf(
                    android.os.UserManager.DISALLOW_FACTORY_RESET,
                    android.os.UserManager.DISALLOW_SAFE_BOOT,
                    android.os.UserManager.DISALLOW_ADD_USER,
                    android.os.UserManager.DISALLOW_DEBUGGING_FEATURES,
                    android.os.UserManager.DISALLOW_MODIFY_ACCOUNTS,
                    android.os.UserManager.DISALLOW_AIRPLANE_MODE,
                    android.os.UserManager.DISALLOW_CONFIG_MOBILE_NETWORKS
                )) runCatching { dpm.clearUserRestriction(admin, r) }
                dpm.setUninstallBlocked(admin, ctx.packageName, false)
            }
            runCatching { dpm.clearDeviceOwnerApp(ctx.packageName) }
        }
        p.clear()
        WorkManager.getInstance(ctx).cancelUniqueWork(CheckinWorker.UNIQUE)
    }
}
