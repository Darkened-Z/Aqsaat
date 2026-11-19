package com.warraich.devicelock

import android.content.Context

/** Local persisted state. Survives reboots; cleared only on uninstall or release. */
class Prefs(ctx: Context) {
    private val sp = ctx.getSharedPreferences("devicelock", Context.MODE_PRIVATE)

    var deviceId: String?  get() = sp.getString("deviceId", null);  set(v) = sp.edit().putString("deviceId", v).apply()
    var secret: String?    get() = sp.getString("secret", null);    set(v) = sp.edit().putString("secret", v).apply()
    // Falls back to the compiled-in shop URL when not set by enrollment.
    var baseUrl: String?
        get() = sp.getString("baseUrl", null) ?: BuildConfig.APP_BASE_URL.ifBlank { null }
        set(v) = sp.edit().putString("baseUrl", v).apply()

    val enrolled: Boolean get() = deviceId != null && secret != null && baseUrl != null

    // "none" | "warn" | "hard"
    var lockState: String get() = sp.getString("lockState", "none") ?: "none"; set(v) = sp.edit().putString("lockState", v).apply()
    var message: String   get() = sp.getString("message", "") ?: "";          set(v) = sp.edit().putString("message", v).apply()

    // Last time the server was reached with any valid answer (for the offline deadline).
    var lastOkMs: Long       get() = sp.getLong("lastOkMs", 0L);       set(v) = sp.edit().putLong("lastOkMs", v).apply()
    // Temporary unlock granted by an offline code: ignore server 'lock' until this time.
    var unlockUntilMs: Long  get() = sp.getLong("unlockUntilMs", 0L);  set(v) = sp.edit().putLong("unlockUntilMs", v).apply()
    var offlineLockDays: Int get() = sp.getInt("offlineLockDays", 7);  set(v) = sp.edit().putInt("offlineLockDays", v).apply()

    // Call policy pushed from the server. "open" = all calls; "shop_only" = block
    // every call except allowNumber (lost/stolen recovery).
    var callMode: String    get() = sp.getString("callMode", "open") ?: "open"; set(v) = sp.edit().putString("callMode", v).apply()
    var allowNumber: String get() = sp.getString("allowNumber", "") ?: "";      set(v) = sp.edit().putString("allowNumber", v).apply()

    fun saveEnrollment(id: String, sec: String, url: String) {
        deviceId = id; secret = sec; baseUrl = url.trimEnd('/')
        lastOkMs = System.currentTimeMillis()
    }

    fun clear() = sp.edit().clear().apply()
}
