package com.warraich.devicelock

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.UserManager
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

data class SimSlot(val slot: Int, val iccid: String, val carrier: String, val number: String, val reply: String = "")
data class SimSnapshot(val readable: Boolean, val absent: Boolean, val iccids: List<String>, val slots: List<SimSlot>) {
    fun toJson(): JSONObject = JSONObject()
        .put("readable", readable).put("absent", absent)
        .put("iccids", JSONArray(iccids))
        .put("slots", JSONArray(slots.map { JSONObject().put("slot", it.slot).put("iccid", it.iccid).put("carrier", it.carrier).put("number", it.number).put("reply", it.reply) }))
}

/**
 * SIM lock. The phone is bound to the SIM(s) the server registered (simIccids from
 * check-in). A foreign SIM, or none of the registered ones present (incl. no SIM at
 * all), locks the phone right here — no network needed. Mirrors lib/simLock.js.
 * As Device Owner the app may read the SIM serial (ICCID) on Android 10+.
 */
object SimGuard {
    const val MESSAGE = "Original SIM card not found. Insert the shop-registered SIM or contact the shop."

    private fun granted(ctx: Context, perm: String) =
        ContextCompat.checkSelfPermission(ctx, perm) == PackageManager.PERMISSION_GRANTED

    @SuppressLint("MissingPermission", "HardwareIds")
    fun snapshot(ctx: Context): SimSnapshot {
        val none = SimSnapshot(false, false, emptyList(), emptyList())
        val tm = ctx.getSystemService(TelephonyManager::class.java) ?: return none
        val slotCount = runCatching { if (Build.VERSION.SDK_INT >= 30) tm.activeModemCount else tm.phoneCount }.getOrDefault(1).coerceAtLeast(1)
        val states = (0 until slotCount).map { s ->
            runCatching { if (Build.VERSION.SDK_INT >= 26) tm.getSimState(s) else tm.simState }.getOrDefault(TelephonyManager.SIM_STATE_UNKNOWN)
        }
        if (states.all { it == TelephonyManager.SIM_STATE_ABSENT }) return SimSnapshot(true, true, emptyList(), emptyList())
        if (!granted(ctx, Manifest.permission.READ_PHONE_STATE)) return none

        val sm = ctx.getSystemService(SubscriptionManager::class.java)
        val subs = runCatching { sm?.activeSubscriptionInfoList }.getOrNull().orEmpty()
        val slots = subs.map { info ->
            val sub = runCatching { tm.createForSubscriptionId(info.subscriptionId) }.getOrDefault(tm)
            val iccid = (runCatching { sub.simSerialNumber }.getOrNull()?.takeIf { it.isNotBlank() }
                ?: runCatching { info.iccId }.getOrNull()).orEmpty().trim().uppercase()
            val number = runCatching {
                if (Build.VERSION.SDK_INT >= 33) sm!!.getPhoneNumber(info.subscriptionId) else sub.line1Number
            }.getOrNull().orEmpty().ifBlank { SimNumber.cached(ctx, iccid) }
            SimSlot(info.simSlotIndex, iccid, info.carrierName?.toString().orEmpty(), number, Prefs(ctx).simReply(iccid))
        }
        val iccids = slots.map { it.iccid }.filter { Regex("^[0-9A-F]{10,22}$").matches(it) }.distinct()
        // A SIM is in but an ID couldn't be read (still starting up, ROM limits): don't judge.
        val readable = states.any { it == TelephonyManager.SIM_STATE_READY } && iccids.isNotEmpty() && iccids.size == slots.size
        return SimSnapshot(readable, false, iccids, slots)
    }

    /** true = changed, false = matches, null = can't tell. */
    fun changed(s: SimSnapshot, baseline: List<String>): Boolean? {
        if (baseline.isEmpty()) return null
        if (s.absent) return true
        if (!s.readable) return null
        return s.iccids.any { it !in baseline } || s.iccids.none { it in baseline }
    }

    private fun baseline(p: Prefs) = p.simIccids.split(",").map { it.trim() }.filter { it.isNotEmpty() }

    /**
     * Local decision, used on SIM events, at boot, and after every check-in. Locks on a
     * change (unless a code-granted unlock is running); lifts only a lock it set itself.
     */
    fun enforce(ctx: Context, snap: SimSnapshot = snapshot(ctx)) {
        val p = Prefs(ctx)
        if (!p.enrolled) return
        val ch = changed(snap, baseline(p))
        if (ch == true && p.simMode == "lock" && System.currentTimeMillis() >= p.unlockUntilMs) {
            p.simLocked = true
            if (p.lockState != "hard" || p.message != MESSAGE) {
                p.lockState = "hard"; p.message = MESSAGE
            }
            LockManager(ctx).showLock(MESSAGE)
        } else if (p.simLocked && (ch == false || p.simMode != "lock")) {
            p.simLocked = false
            if (p.lockState == "hard" && p.message == MESSAGE) { p.lockState = "none"; p.message = "" }
        }
    }

    /** One check-in (which also runs [enforce], online or not) after the SIM has had time to load. */
    fun checkSoon(ctx: Context, delaySec: Long = 60) {
        val req = androidx.work.OneTimeWorkRequestBuilder<CheckinWorker>()
            .setInitialDelay(delaySec, java.util.concurrent.TimeUnit.SECONDS).build()
        androidx.work.WorkManager.getInstance(ctx).enqueueUniqueWork("devicelock-simcheck", androidx.work.ExistingWorkPolicy.REPLACE, req)
    }

    /** No airplane mode / mobile-network fiddling while SIM lock is on (Android 9+). */
    fun applyPolicy(ctx: Context, mode: String) {
        val lm = LockManager(ctx)
        if (Build.VERSION.SDK_INT < 28 || !lm.isDeviceOwner()) return
        val dpm = ctx.getSystemService(android.app.admin.DevicePolicyManager::class.java)
        val admin = AdminReceiver.component(ctx)
        for (r in listOf(UserManager.DISALLOW_AIRPLANE_MODE, UserManager.DISALLOW_CONFIG_MOBILE_NETWORKS)) runCatching {
            if (mode == "off") dpm.clearUserRestriction(admin, r) else dpm.addUserRestriction(admin, r)
        }
    }
}
