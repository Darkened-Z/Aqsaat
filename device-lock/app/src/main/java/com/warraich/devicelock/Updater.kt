package com.warraich.devicelock

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

/**
 * Silent self-update. As Device Owner the app can install a newer build of itself
 * with no prompt, so shop-side fixes reach phones without the customer doing anything.
 * Android rejects an APK signed with a different key, so the download URL can't be
 * used to swap in someone else's app.
 */
object Updater {
    private const val TAG = "DeviceLockUpdate"

    suspend fun installIfNewer(ctx: Context, latest: Int, apkUrl: String) {
        if (latest <= BuildConfig.VERSION_CODE || apkUrl.isBlank()) return
        if (!LockManager(ctx).isDeviceOwner()) return
        withContext(Dispatchers.IO) {
            runCatching {
                val pi = ctx.packageManager.packageInstaller
                val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
                    setAppPackageName(ctx.packageName)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
                }
                val id = pi.createSession(params)
                pi.openSession(id).use { s ->
                    val conn = (URL(apkUrl).openConnection() as HttpURLConnection).apply { connectTimeout = 20000; readTimeout = 60000 }
                    try {
                        if (conn.responseCode !in 200..299) { s.abandon(); return@runCatching }
                        s.openWrite("update.apk", 0, -1).use { out ->
                            conn.inputStream.use { it.copyTo(out) }
                            s.fsync(out)
                        }
                    } finally { conn.disconnect() }
                    val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
                    val pending = PendingIntent.getBroadcast(ctx, id, Intent(ctx, UpdateStatusReceiver::class.java), flags)
                    s.commit(pending.intentSender)
                }
            }.onFailure { Log.w(TAG, "update failed", it) }
        }
    }
}

class UpdateStatusReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -999)
        Log.i("DeviceLockUpdate", "status=$status ${intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: ""}")
    }
}
