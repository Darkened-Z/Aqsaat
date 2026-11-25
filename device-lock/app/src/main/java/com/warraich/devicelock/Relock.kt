package com.warraich.devicelock

import android.content.Context
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/** Checks in right after a timed / code unlock ends, so the held lock comes back on time (online or not). */
object Relock {
    fun at(ctx: Context, atMs: Long) {
        val delay = (atMs - System.currentTimeMillis()).coerceAtLeast(0L) + 5_000L
        val req = OneTimeWorkRequestBuilder<CheckinWorker>().setInitialDelay(delay, TimeUnit.MILLISECONDS).build()
        WorkManager.getInstance(ctx).enqueueUniqueWork("devicelock-relock", ExistingWorkPolicy.REPLACE, req)
    }
}
