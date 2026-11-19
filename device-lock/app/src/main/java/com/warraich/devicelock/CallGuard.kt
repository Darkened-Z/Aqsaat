package com.warraich.devicelock

import android.os.Build
import android.telecom.Call
import android.telecom.CallScreeningService
import androidx.annotation.RequiresApi

/**
 * Blocks every call except the one shop number the owner allows, but only while the
 * server has put the phone in "shop_only" mode (lost/stolen recovery). Emergency
 * calls are never routed through screening, so they always go through.
 *
 * Needs the Call Screening role, which the shop grants with one tap at enrollment.
 * Incoming screening works on Android 7+; outgoing screening on Android 10+.
 */
@RequiresApi(Build.VERSION_CODES.N)
class CallGuard : CallScreeningService() {
    override fun onScreenCall(details: Call.Details) {
        val p = Prefs(applicationContext)
        val block = p.callMode == "shop_only" && !isAllowed(details, p.allowNumber)
        val resp = CallResponse.Builder()
        if (block) resp.setDisallowCall(true).setRejectCall(true).setSkipNotification(true)
        respondToCall(details, resp.build())
    }

    private fun isAllowed(details: Call.Details, allowed: String): Boolean {
        if (allowed.isBlank()) return true   // misconfigured: never trap the phone
        val num = details.handle?.schemeSpecificPart ?: return false
        val a = tail(allowed)
        val n = tail(num)
        return n.isNotEmpty() && (n == a || n.endsWith(a) || a.endsWith(n))
    }

    private fun tail(s: String) = s.filter { it.isDigit() }.takeLast(9)
}
