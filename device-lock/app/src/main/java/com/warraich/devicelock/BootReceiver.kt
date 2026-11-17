package com.warraich.devicelock

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Re-arm the heartbeat and re-show the lock after a reboot. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val p = Prefs(context)
        if (!p.enrolled) return
        CheckinWorker.schedule(context)
        LockManager(context).applyOwnerPolicies()
        val now = System.currentTimeMillis()
        if (p.lockState == "hard" && now >= p.unlockUntilMs) {
            LockManager(context).showLock(p.message)
        }
    }
}
