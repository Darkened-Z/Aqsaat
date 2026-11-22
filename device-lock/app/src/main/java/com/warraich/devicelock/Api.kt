package com.warraich.devicelock

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class CheckinResult(
    val reachable: Boolean,
    val action: String = "",        // ok | warn | lock | release
    val message: String = "",
    val offlineLockDays: Int = 7,
    val callMode: String = "open",  // open | shop_only
    val allowNumber: String = "",
    val latestVersion: Int = 0,
    val apkUrl: String = ""
)

data class ClaimResult(val ok: Boolean, val deviceId: String = "", val secret: String = "", val baseUrl: String = "", val error: String = "")

object Api {
    /** Exchange a short claim code for this device's id + secret. */
    fun claim(baseUrl: String, claimCode: String): ClaimResult {
        return try {
            val conn = (URL("$baseUrl/api/device/claim").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"; connectTimeout = 15000; readTimeout = 15000; doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
            conn.outputStream.use { it.write(JSONObject().put("claimCode", claimCode).toString().toByteArray()) }
            val ok = conn.responseCode in 200..299
            val text = (if (ok) conn.inputStream else conn.errorStream).bufferedReader().use { it.readText() }
            conn.disconnect()
            val j = JSONObject(text)
            if (ok) ClaimResult(true, j.getString("deviceId"), j.getString("secret"), j.optString("baseUrl", baseUrl))
            else ClaimResult(false, error = j.optString("error", "failed"))
        } catch (e: Exception) {
            ClaimResult(false, error = e.message ?: "network error")
        }
    }

    /** POST deviceId+secret (+ last-known location). Network/5xx errors return reachable=false (never a wrong lock). */
    fun checkin(baseUrl: String, deviceId: String, secret: String,
                lat: Double? = null, lng: Double? = null, acc: Float? = null): CheckinResult {
        return try {
            val conn = (URL("$baseUrl/api/device/checkin").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15000
                readTimeout = 15000
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
            val body = JSONObject().put("deviceId", deviceId).put("secret", secret).put("version", BuildConfig.VERSION_CODE)
            if (lat != null && lng != null) {
                body.put("lat", lat).put("lng", lng)
                if (acc != null) body.put("acc", acc.toDouble())
            }
            conn.outputStream.use { it.write(body.toString().toByteArray()) }
            val ok = conn.responseCode in 200..299
            if (!ok) { conn.disconnect(); return CheckinResult(false) }
            val text = conn.inputStream.bufferedReader().use { it.readText() }
            conn.disconnect()
            val j = JSONObject(text)
            CheckinResult(
                reachable = true,
                action = j.optString("action", "ok"),
                message = j.optString("message", ""),
                offlineLockDays = j.optInt("offlineLockDays", 7),
                callMode = j.optString("callMode", "open"),
                allowNumber = j.optString("allowNumber", ""),
                latestVersion = j.optInt("latestVersion", 0),
                apkUrl = j.optString("apkUrl", "")
            )
        } catch (e: Exception) {
            CheckinResult(false)
        }
    }
}
