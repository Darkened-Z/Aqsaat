package com.warraich.devicelock

import android.content.Context
import android.util.Log
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Instant control from the shop. The server sends a data-only "checkin" push when
 * the owner locks/unlocks/marks paid; the phone then checks in right away instead
 * of waiting for the 6h heartbeat. The push carries no command itself — the
 * authenticated check-in decides — so a forged push can at most trigger a check-in.
 * Off when the build has no Firebase config or the phone has no Play services.
 */
object Push {
    private const val TAG = "DeviceLockPush"

    val configured: Boolean get() = BuildConfig.FCM_APP_ID.isNotBlank() && BuildConfig.FCM_PROJECT_ID.isNotBlank()

    fun init(ctx: Context) {
        if (!configured) return
        runCatching {
            if (FirebaseApp.getApps(ctx).isEmpty()) {
                FirebaseApp.initializeApp(ctx, FirebaseOptions.Builder()
                    .setApplicationId(BuildConfig.FCM_APP_ID)
                    .setApiKey(BuildConfig.FCM_API_KEY)
                    .setProjectId(BuildConfig.FCM_PROJECT_ID)
                    .setGcmSenderId(BuildConfig.FCM_SENDER_ID)
                    .build())
            }
            FirebaseMessaging.getInstance().token
                .addOnSuccessListener { t ->
                    val p = Prefs(ctx)
                    if (t != null && t != p.pushToken) { p.pushToken = t; checkInNow(ctx) }
                }
                .addOnFailureListener { Log.i(TAG, "no push token (Play services missing?)", it) }
        }.onFailure { Log.w(TAG, "init failed", it) }
    }

    /** Run one check-in as soon as possible (expedited, falls back to normal work). */
    fun checkInNow(ctx: Context) {
        if (!Prefs(ctx).enrolled) return
        val req = OneTimeWorkRequestBuilder<CheckinWorker>()
            .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
            .build()
        WorkManager.getInstance(ctx).enqueueUniqueWork("devicelock-now", ExistingWorkPolicy.REPLACE, req)
    }
}

class PushService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        Prefs(this).pushToken = token
        Push.checkInNow(this)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        if (message.data["type"] == "checkin") Push.checkInNow(this)
    }
}
