package com.warraich.devicelock

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * SIM inserted / removed / swapped. CARRIER_CONFIG_CHANGED is exempt from Android 8's
 * background-broadcast limits, so this fires even when the app isn't running.
 */
class SimReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (!Prefs(context).enrolled) return
        SimGuard.enforce(context)
        Push.checkInNow(context)
    }
}
