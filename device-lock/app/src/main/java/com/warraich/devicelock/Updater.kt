package com.warraich.devicelock

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.content.pm.ServiceInfo
import android.os.Build
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.ForegroundInfo
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

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
    private const val WORK = "devicelock-update"

    fun note(ctx: Context, msg: String) {
        val t = SimpleDateFormat("dd MMM HH:mm", Locale.US).format(Date())
        Prefs(ctx).updStatus = "$t $msg".take(160)
        Log.i(TAG, msg)
    }

    /**
     * Called after every check-in. The download runs as its own job (a "check in now" push
     * restarts the check-in job, which used to cut the download off), retries with backoff,
     * and runs as a foreground service so an idle phone doesn't cut its network.
     */
    fun installIfNewer(ctx: Context, latest: Int, apkUrl: String) {
        if (latest <= BuildConfig.VERSION_CODE || apkUrl.isBlank()) { cleanup(ctx); return }
        val p = Prefs(ctx)
        if (!LockManager(ctx).isDeviceOwner()) { note(ctx, "v$latest: not device owner"); return }
        val now = System.currentTimeMillis()
        if (p.updTryVer == latest && now - p.updTryMs < RETRY_MS) return
        p.updTryVer = latest; p.updTryMs = now
        val req = OneTimeWorkRequestBuilder<UpdateWorker>()
            .setInputData(workDataOf("latest" to latest, "url" to apkUrl))
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
            .build()
        WorkManager.getInstance(ctx).enqueueUniqueWork(WORK, ExistingWorkPolicy.KEEP, req)
    }

    private fun cleanup(ctx: Context) {
        ctx.cacheDir.listFiles()?.filter { it.name.startsWith("update-") }?.forEach { it.delete() }
    }

    /** True when the install was handed to Android; false = try again later. */
    suspend fun run(ctx: Context, latest: Int, apkUrl: String): Boolean = withContext(Dispatchers.IO) {
        if (latest <= BuildConfig.VERSION_CODE) return@withContext true
        val apk = try { Downloader.fetch(ctx.cacheDir, latest, apkUrl) }
            catch (e: Exception) { note(ctx, "v$latest: ${e.message}"); return@withContext false }
        if (!valid(ctx, apk, latest)) {
            apk.delete()
            note(ctx, "v$latest: downloaded file is not a valid update, fetching again")
            return@withContext false
        }
        runCatching { install(ctx, apk, latest) }
            .onFailure { note(ctx, "v$latest: ${it.javaClass.simpleName}: ${it.message}") }
            .isSuccess
    }

    /** Same app, the advertised version or newer — catches a corrupt or mixed-up file before Android does. */
    private fun valid(ctx: Context, apk: File, latest: Int): Boolean {
        @Suppress("DEPRECATION")
        val info = runCatching { ctx.packageManager.getPackageArchiveInfo(apk.path, 0) }.getOrNull() ?: return false
        @Suppress("DEPRECATION")
        val code = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong()
        return info.packageName == ctx.packageName && code >= latest
    }

    private fun install(ctx: Context, apk: File, latest: Int) {
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
    }
}

class UpdateWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        // Foreground keeps network access on an idle (Doze) phone. Device Owner apps may start one from the background.
        runCatching { setForeground(getForegroundInfo()) }
        val ok = Updater.run(applicationContext, inputData.getInt("latest", 0), inputData.getString("url").orEmpty())
        return when {
            ok -> Result.success()
            runAttemptCount < 6 -> Result.retry()
            else -> Result.failure()
        }
    }

    override suspend fun getForegroundInfo(): ForegroundInfo {
        val n = Notify.working(applicationContext, "Updating Device Lock…")
        return if (Build.VERSION.SDK_INT >= 29) ForegroundInfo(44, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC) else ForegroundInfo(44, n)
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
        if (status != PackageInstaller.STATUS_SUCCESS) {
            // A rejected file must not be retried as-is.
            context.cacheDir.listFiles()?.filter { it.name.startsWith("update-$ver.") }?.forEach { it.delete() }
            Prefs(context).updTryMs = 0L
        }
        Updater.note(context, "v$ver: " + if (status == PackageInstaller.STATUS_SUCCESS) "installed" else "failed $status $msg")
    }
}
