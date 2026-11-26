package com.warraich.devicelock

import android.Manifest
import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Telephony
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CompletableDeferred
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
            // No recorded reply = never tried with the SMS listener (pre-1.18): try now.
            if (p.simReply(iccid).isNotEmpty() && now - p.simNumberTry(iccid) < RETRY_MS) continue
            val carrier = info.carrierName?.toString().orEmpty()
            val code = code(carrier) ?: continue
            p.setSimNumberTry(iccid, now)
            lookup(ctx, p, sub, info.subscriptionId, iccid, carrier, code)
        }
    }

    /**
     * Some networks (Telenor) answer the code with an SMS instead of on screen. Listen for
     * incoming SMS on that SIM only, only for 90 s after our own request, and keep only the
     * number from a network short-code sender — personal messages are never read or kept.
     */
    @SuppressLint("MissingPermission")
    private suspend fun lookup(ctx: Context, p: Prefs, sub: TelephonyManager, subId: Int, iccid: String, carrier: String, code: String) {
        val viaSms = CompletableDeferred<String>()
        val smsOk = ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
        val rcv = object : BroadcastReceiver() {
            override fun onReceive(c: Context, i: Intent) {
                val sid = i.getIntExtra("subscription", i.getIntExtra("android.telephony.extra.SUBSCRIPTION_INDEX", -1))
                if (sid != -1 && sid != subId) return
                val msgs = runCatching { Telephony.Sms.Intents.getMessagesFromIntent(i) }.getOrNull().orEmpty()
                val from = msgs.firstOrNull()?.originatingAddress.orEmpty()
                if (parse(from) != null) return // a person, not the network
                parse(msgs.joinToString("") { it.messageBody.orEmpty() })?.let { viaSms.complete(it) }
            }
        }
        if (smsOk) runCatching { ContextCompat.registerReceiver(ctx, rcv, IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION), ContextCompat.RECEIVER_EXPORTED) }
        try {
            val reply = withTimeoutOrNull(30_000) { ask(sub, code) }
            val onScreen = reply?.let { parse(it) }
            val number = onScreen ?: if (smsOk) withTimeoutOrNull(90_000) { viaSms.await() } else null
            if (number != null) p.setSimNumber(iccid, number)
            p.setSimReply(iccid, "$carrier $code: " + when {
                onScreen != null -> "number on screen"
                number != null -> "number by SMS"
                reply == null -> "no reply"
                else -> reply.replace(Regex("\\s+"), " ").take(90)
            })
        } finally {
            if (smsOk) runCatching { ctx.unregisterReceiver(rcv) }
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
