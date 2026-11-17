package com.warraich.devicelock

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class CheckinResult(
    val reachable: Boolean,
    val action: String = "",        // ok | warn | lock | release
    val message: String = "",
    val offlineLockDays: Int = 7
)

object Api {
    /** POST deviceId+secret. Network/5xx errors return reachable=false (never a wrong lock). */
    fun checkin(baseUrl: String, deviceId: String, secret: String): CheckinResult {
        return try {
            val conn = (URL("$baseUrl/api/device/checkin").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15000
                readTimeout = 15000
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
            val body = JSONObject().put("deviceId", deviceId).put("secret", secret).toString()
            conn.outputStream.use { it.write(body.toByteArray()) }
            val ok = conn.responseCode in 200..299
            if (!ok) { conn.disconnect(); return CheckinResult(false) }
            val text = conn.inputStream.bufferedReader().use { it.readText() }
            conn.disconnect()
            val j = JSONObject(text)
            CheckinResult(
                reachable = true,
                action = j.optString("action", "ok"),
                message = j.optString("message", ""),
                offlineLockDays = j.optInt("offlineLockDays", 7)
            )
        } catch (e: Exception) {
            CheckinResult(false)
        }
    }
}
