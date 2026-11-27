package com.warraich.devicelock

import android.annotation.SuppressLint
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.telephony.TelephonyManager
import org.json.JSONObject

/** Hardware identity + state shown on the shop's Device Lock page. Device Owner may read IMEI / serial. */
object DeviceInfo {
    @SuppressLint("MissingPermission", "HardwareIds")
    fun collect(ctx: Context): JSONObject {
        val tm = ctx.getSystemService(TelephonyManager::class.java)
        val imei = { slot: Int -> runCatching { if (Build.VERSION.SDK_INT >= 26) tm?.getImei(slot) else null }.getOrNull().orEmpty() }
        val serial = runCatching { if (Build.VERSION.SDK_INT >= 26) Build.getSerial() else Build.SERIAL }.getOrNull().orEmpty()
        val bm = ctx.getSystemService(BatteryManager::class.java)
        val cm = ctx.getSystemService(ConnectivityManager::class.java)
        val caps = runCatching { cm?.getNetworkCapabilities(cm.activeNetwork) }.getOrNull()
        val network = when {
            caps == null -> "offline"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "Wi-Fi"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "mobile"
            else -> "other"
        }
        return JSONObject()
            .put("imei1", imei(0)).put("imei2", imei(1))
            .put("serial", if (serial == Build.UNKNOWN) "" else serial)
            .put("brand", Build.BRAND).put("model", Build.MODEL)
            .put("android", Build.VERSION.RELEASE).put("sdk", Build.VERSION.SDK_INT)
            .put("battery", runCatching { bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) }.getOrNull() ?: JSONObject.NULL)
            .put("charging", runCatching { bm?.isCharging }.getOrNull() == true)
            .put("network", network)
            // Factory-reset protection: which shop accounts this phone has armed.
            .put("frpSupported", Build.VERSION.SDK_INT >= 30 && LockManager(ctx).isDeviceOwner())
            .put("frpIds", Prefs(ctx).frpIds)
            .put("upd", Prefs(ctx).updStatus)
            .put("pinned", LockManager(ctx).pinned())
            .put("lock", Prefs(ctx).lockState)
            .put("pinFix", Prefs(ctx).pinFix)
            .put("appsFix", Prefs(ctx).appsFix)
            .put("diag", runCatching { LockManager(ctx).diag() }.getOrDefault("err"))
    }
}
