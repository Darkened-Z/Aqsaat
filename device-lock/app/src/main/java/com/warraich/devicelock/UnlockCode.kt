package com.warraich.devicelock

import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Mirror of lib/deviceLock.js on the server. Must match exactly so a code read
 * from the /devices page validates offline on the phone.
 * Known-answer vector: unlockCode("KAT", 20000) == "090651".
 */
object UnlockCode {
    fun dayNumber(ms: Long = System.currentTimeMillis()): Long = ms / 86_400_000L

    fun code(secret: String, day: Long = dayNumber()): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        val d = mac.doFinal("unlock:$day".toByteArray(Charsets.UTF_8))
        val i = d.size
        val n = ((d[i - 4].toLong() and 0xff) shl 24) or
                ((d[i - 3].toLong() and 0xff) shl 16) or
                ((d[i - 2].toLong() and 0xff) shl 8) or
                (d[i - 1].toLong() and 0xff)
        return (n % 1_000_000L).toString().padStart(6, '0')
    }

    /** Accept today +/- 1 day so a clock/timezone offset near midnight still works. */
    fun isValid(secret: String, entered: String): Boolean {
        val e = entered.trim()
        val today = dayNumber()
        return e == code(secret, today) || e == code(secret, today - 1) || e == code(secret, today + 1)
    }
}
