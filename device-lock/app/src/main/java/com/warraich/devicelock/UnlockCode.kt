package com.warraich.devicelock

import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Mirror of lib/deviceLock.js on the server. Must match exactly so a code read
 * from the /devices page validates offline on the phone.
 * Known-answer vector: unlockCode("KAT", 20000) == "090651".
 * kind "" = 3 days, "30" = 30 min, "120" = 2 hours.
 */
object UnlockCode {
    fun dayNumber(ms: Long = System.currentTimeMillis()): Long = ms / 86_400_000L

    private val KINDS = listOf("" to 72L * 3_600_000L, "30" to 30L * 60_000L, "120" to 120L * 60_000L)

    fun code(secret: String, day: Long = dayNumber(), kind: String = ""): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        val d = mac.doFinal("unlock$kind:$day".toByteArray(Charsets.UTF_8))
        val i = d.size
        val n = ((d[i - 4].toLong() and 0xff) shl 24) or
                ((d[i - 3].toLong() and 0xff) shl 16) or
                ((d[i - 2].toLong() and 0xff) shl 8) or
                (d[i - 1].toLong() and 0xff)
        return (n % 1_000_000L).toString().padStart(6, '0')
    }

    /** How long the entered code unlocks for, or null if wrong. Today +/- 1 day for clock offsets near midnight. */
    fun grant(secret: String, entered: String): Long? {
        val e = entered.trim()
        val today = dayNumber()
        for ((kind, ms) in KINDS) for (day in listOf(today, today - 1, today + 1)) if (e == code(secret, day, kind)) return ms
        return null
    }
}
