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
    val apkUrl: String = "",
    val payUrl: String = "",        // blank = online payment off / nothing due
    val dueAmount: Int = 0,
    val checkinMinutes: Int = 360,  // 15 while lost / force-locked
    val frpAccountIds: String = "", // shop Google account IDs for factory-reset protection
    val simMode: String = "off",    // lock | alert | off
    val simIccids: String = "",     // registered SIM serials, comma-separated
    val override: Boolean = false,  // manual lock from the shop: ends any offline-code unlock
    val graceUntil: Long = 0L       // timed unlock from the shop: hold the lock until this time
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

    /** The customer's plan as JSON text: "" = no plan linked, null = server not reached. */
    fun plan(baseUrl: String, deviceId: String, secret: String): String? {
        return try {
            val conn = (URL("$baseUrl/api/device/plan").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"; connectTimeout = 15000; readTimeout = 15000; doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
            conn.outputStream.use { it.write(JSONObject().put("deviceId", deviceId).put("secret", secret).toString().toByteArray()) }
            if (conn.responseCode !in 200..299) { conn.disconnect(); return null }
            val text = conn.inputStream.bufferedReader().use { it.readText() }
            conn.disconnect()
            JSONObject(text).optJSONObject("plan")?.toString() ?: ""
        } catch (e: Exception) {
            null
        }
    }

    /** POST deviceId+secret (+ last-known location). Network/5xx errors return reachable=false (never a wrong lock). */
    fun checkin(baseUrl: String, deviceId: String, secret: String,
                lat: Double? = null, lng: Double? = null, acc: Float? = null, locPerm: String = "", pushToken: String = "",
                sim: JSONObject? = null, info: JSONObject? = null): CheckinResult {
        return try {
            val conn = (URL("$baseUrl/api/device/checkin").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15000
                readTimeout = 15000
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
            val body = JSONObject().put("deviceId", deviceId).put("secret", secret).put("version", BuildConfig.VERSION_CODE).put("locPerm", locPerm).put("pushToken", pushToken)
            if (sim != null) body.put("sim", sim)
            if (info != null) body.put("info", info)
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
                apkUrl = j.optString("apkUrl", ""),
                payUrl = j.optString("payUrl", ""),
                dueAmount = j.optInt("dueAmount", 0),
                checkinMinutes = j.optInt("checkinMinutes", 360),
                frpAccountIds = j.optString("frpAccountIds", ""),
                simMode = j.optString("simMode", "off"),
                simIccids = j.optString("simIccids", ""),
                override = j.optBoolean("override", false),
                graceUntil = j.optLong("graceUntil", 0L)
            )
        } catch (e: Exception) {
            CheckinResult(false)
        }
    }
}
