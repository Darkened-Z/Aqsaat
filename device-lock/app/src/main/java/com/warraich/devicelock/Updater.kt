package com.warraich.devicelock

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import android.util.Log
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
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
    private const val RETRY_MS = 20 * 60_000L

    fun note(ctx: Context, msg: String) {
        val t = SimpleDateFormat("dd MMM HH:mm", Locale.US).format(Date())
        Prefs(ctx).updStatus = "$t $msg".take(160)
        Log.i(TAG, msg)
    }

    /**
     * Called after every check-in. The download runs as its own background job: inside the
     * check-in job, a "check in now" push restarted the job and cut the download off.
     */
    fun installIfNewer(ctx: Context, latest: Int, apkUrl: String) {
        if (latest <= BuildConfig.VERSION_CODE || apkUrl.isBlank()) return
        val p = Prefs(ctx)
        if (!LockManager(ctx).isDeviceOwner()) { note(ctx, "v$latest: not device owner"); return }
        val now = System.currentTimeMillis()
        if (p.updTryVer == latest && now - p.updTryMs < RETRY_MS) return
        p.updTryVer = latest; p.updTryMs = now
        val req = OneTimeWorkRequestBuilder<UpdateWorker>()
            .setInputData(workDataOf("latest" to latest, "url" to apkUrl))
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(ctx).enqueueUniqueWork("devicelock-update", ExistingWorkPolicy.KEEP, req)
    }

    suspend fun run(ctx: Context, latest: Int, apkUrl: String) {
        if (latest <= BuildConfig.VERSION_CODE) return
        withContext(Dispatchers.IO) {
            runCatching {
                val apk = download(ctx, latest, apkUrl) ?: return@runCatching
                val pi = ctx.packageManager.packageInstaller
                val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
                    setAppPackageName(ctx.packageName)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
                }
                val id = pi.createSession(params)
                pi.openSession(id).use { s ->
                    try {
                        s.openWrite("update.apk", 0, apk.length()).use { out ->
                            apk.inputStream().use { it.copyTo(out) }
                            s.fsync(out)
                        }
                    } catch (e: Exception) { s.abandon(); throw e }
                    val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
                    val pending = PendingIntent.getBroadcast(ctx, id, Intent(ctx, UpdateStatusReceiver::class.java).putExtra("ver", latest), flags)
                    note(ctx, "v$latest: installing")
                    s.commit(pending.intentSender)
                }
            }.onFailure { note(ctx, "v$latest: ${it.javaClass.simpleName}: ${it.message}") }
        }
    }

    /**
     * Downloads into cacheDir, resuming a partial file (HTTP Range), so a slow or
     * dropping connection still finishes over a few tries instead of starting over.
     */
    private fun download(ctx: Context, ver: Int, url: String): java.io.File? {
        val done = java.io.File(ctx.cacheDir, "update-$ver.apk")
        if (done.exists()) return done
        ctx.cacheDir.listFiles()?.filter { it.name.startsWith("update-") && !it.name.startsWith("update-$ver.") }?.forEach { it.delete() }
        val part = java.io.File(ctx.cacheDir, "update-$ver.part")
        var last: Exception? = null
        repeat(4) {
            try {
                val have = part.length()
                val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 30_000; readTimeout = 120_000
                    if (have > 0) setRequestProperty("Range", "bytes=$have-")
                }
                try {
                    val code = conn.responseCode
                    if (code == 416) { part.delete(); return@repeat }
                    if (code !in 200..299) { note(ctx, "v$ver: download HTTP $code"); return null }
                    val append = code == 206
                    val total = if (append) conn.getHeaderField("Content-Range")?.substringAfter('/')?.toLongOrNull() ?: -1L
                                else conn.contentLengthLong
                    java.io.FileOutputStream(part, append).use { out -> conn.inputStream.use { it.copyTo(out, 64 * 1024) } }
                    if (total > 0 && part.length() != total) throw java.io.IOException("short download ${part.length()}/$total")
                } finally { conn.disconnect() }
                part.renameTo(done)
                return done
            } catch (e: Exception) { last = e }
        }
        note(ctx, "v$ver: download ${part.length() / 1024}KB so far, ${last?.javaClass?.simpleName}: ${last?.message}")
        return null
    }
}

class UpdateWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        Updater.run(applicationContext, inputData.getInt("latest", 0), inputData.getString("url").orEmpty())
        return Result.success()
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
