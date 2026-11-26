package com.warraich.devicelock

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

/**
 * Pakistani SIMs rarely store their own number, so Android reports it blank.
 * Ask the network instead with its free "my number" USSD code, silently, and
 * remember the answer per SIM (ICCID). One try per SIM a day until it works.
 */
object SimNumber {
    private const val RETRY_MS = 24 * 3600_000L

    private fun code(carrier: String): String? {
        val c = carrier.lowercase()
        return when {
            "jazz" in c || "mobilink" in c || "warid" in c -> "*99#"
            "telenor" in c -> "*8888#"
            "zong" in c || "cmpak" in c -> "*8#"
            "ufone" in c || "onic" in c -> "*780*3#"
            else -> null
        }
    }

    /** 03XXXXXXXXX from a USSD reply, or null. */
    fun parse(reply: String): String? =
        Regex("""(?:\+?92|0)?(3\d{9})(?!\d)""").find(reply.replace(Regex("[\\s-]"), ""))?.groupValues?.get(1)?.let { "0$it" }

    fun cached(ctx: Context, iccid: String): String = Prefs(ctx).simNumber(iccid)

    @SuppressLint("MissingPermission", "HardwareIds")
    suspend fun fill(ctx: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) return
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) return
        val p = Prefs(ctx)
        val tm = ctx.getSystemService(TelephonyManager::class.java) ?: return
        val subs = runCatching { ctx.getSystemService(SubscriptionManager::class.java)?.activeSubscriptionInfoList }.getOrNull().orEmpty()
        for (info in subs) {
            val sub = runCatching { tm.createForSubscriptionId(info.subscriptionId) }.getOrNull() ?: continue
            val iccid = (runCatching { sub.simSerialNumber }.getOrNull()?.takeIf { it.isNotBlank() }
                ?: runCatching { info.iccId }.getOrNull()).orEmpty().trim().uppercase()
            if (iccid.isEmpty() || p.simNumber(iccid).isNotEmpty()) continue
            val now = System.currentTimeMillis()
            if (now - p.simNumberTry(iccid) < RETRY_MS) continue
            val code = code(info.carrierName?.toString().orEmpty()) ?: continue
            p.setSimNumberTry(iccid, now)
            val reply = withTimeoutOrNull(30_000) { ask(sub, code) } ?: continue
            parse(reply)?.let { p.setSimNumber(iccid, it) }
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun ask(tm: TelephonyManager, code: String): String? = suspendCancellableCoroutine { cont ->
        val cb = object : TelephonyManager.UssdResponseCallback() {
            override fun onReceiveUssdResponse(t: TelephonyManager, request: String, response: CharSequence) {
                if (cont.isActive) cont.resume(response.toString())
            }
            override fun onReceiveUssdResponseFailed(t: TelephonyManager, request: String, failureCode: Int) {
                if (cont.isActive) cont.resume(null)
            }
        }
        runCatching { tm.sendUssdRequest(code, cb, Handler(Looper.getMainLooper())) }
            .onFailure { if (cont.isActive) cont.resume(null) }
    }
}
