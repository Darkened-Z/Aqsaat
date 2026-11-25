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
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Silent self-update. As Device Owner the app can install a newer build of itself
 * with no prompt, so shop-side fixes reach phones without the customer doing anything.
 * Android rejects an APK signed with a different key, so the download URL can't be
 * used to swap in someone else's app. Every attempt's outcome goes to the shop via
 * check-in info ("upd").
 */
object Updater {
    private const val TAG = "DeviceLockUpdate"
    private const val RETRY_MS = 60 * 60_000L

    fun note(ctx: Context, msg: String) {
        val t = SimpleDateFormat("dd MMM HH:mm", Locale.US).format(Date())
        Prefs(ctx).updStatus = "$t $msg".take(160)
        Log.i(TAG, msg)
    }

    suspend fun installIfNewer(ctx: Context, latest: Int, apkUrl: String) {
        if (latest <= BuildConfig.VERSION_CODE || apkUrl.isBlank()) return
        val p = Prefs(ctx)
        if (!LockManager(ctx).isDeviceOwner()) { note(ctx, "v$latest: not device owner"); return }
        val now = System.currentTimeMillis()
        if (p.updTryVer == latest && now - p.updTryMs < RETRY_MS) return
        p.updTryVer = latest; p.updTryMs = now
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
                        if (conn.responseCode !in 200..299) { s.abandon(); note(ctx, "v$latest: download HTTP ${conn.responseCode}"); return@runCatching }
                        s.openWrite("update.apk", 0, -1).use { out ->
                            conn.inputStream.use { it.copyTo(out) }
                            s.fsync(out)
                        }
                    } finally { conn.disconnect() }
                    val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
                    val pending = PendingIntent.getBroadcast(ctx, id, Intent(ctx, UpdateStatusReceiver::class.java).putExtra("ver", latest), flags)
                    note(ctx, "v$latest: installing")
                    s.commit(pending.intentSender)
                }
            }.onFailure { note(ctx, "v$latest: ${it.javaClass.simpleName}: ${it.message}") }
        }
    }
}

class UpdateStatusReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val ver = intent.getIntExtra("ver", 0)
        val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -999)
        val msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE).orEmpty()
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            // The OEM ignored the silent-install flag: show the system's update prompt instead.
            @Suppress("DEPRECATION")
            val confirm = intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
            val shown = confirm != null && runCatching { context.startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }.isSuccess
            Updater.note(context, "v$ver: needs tap on phone" + if (shown) " (prompt shown)" else " (prompt blocked)")
            return
        }
        Updater.note(context, "v$ver: " + if (status == PackageInstaller.STATUS_SUCCESS) "installed" else "failed $status $msg")
    }
}
