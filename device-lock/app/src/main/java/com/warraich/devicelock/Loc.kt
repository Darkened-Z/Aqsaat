package com.warraich.devicelock

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationManager

/**
 * Best-effort last-known device location from the platform providers only — no
 * Google Play Services, so it works on Vivo/Oppo builds that ship without them.
 * The location permission is auto-granted to this app as Device Owner.
 */
object Loc {
    @SuppressLint("MissingPermission")
    fun last(ctx: Context): Location? {
        val lm = ctx.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return null
        var best: Location? = null
        for (p in listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER)) {
            val l = runCatching { lm.getLastKnownLocation(p) }.getOrNull() ?: continue
            if (best == null || l.time > best!!.time) best = l
        }
        return best
    }
}
