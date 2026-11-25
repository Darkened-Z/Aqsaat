package com.warraich.devicelock

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

/**
 * Permanent, honest disclosure that the phone is shop-managed and its location is
 * shared while a balance is owed. Transparency is the legal basis — this is not a
 * hidden tracker. Shown whenever the app is enrolled.
 */
object Notify {
    private const val CH = "managed"
    private const val ID = 42

    /** Brief notification while a push-triggered check-in runs (needed before Android 12). */
    fun working(ctx: Context): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.getSystemService(NotificationManager::class.java)
                ?.createNotificationChannel(NotificationChannel(CH, "Device management", NotificationManager.IMPORTANCE_LOW))
        }
        return androidx.core.app.NotificationCompat.Builder(ctx, CH)
            .setSmallIcon(android.R.drawable.ic_popup_sync)
            .setContentTitle(ctx.getString(R.string.shop_name))
            .setContentText("Checking with the shop…")
            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_LOW)
            .build()
    }

    fun managed(ctx: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = ctx.getSystemService(NotificationManager::class.java) ?: return
        runCatching {
            nm.createNotificationChannel(NotificationChannel(CH, "Device management", NotificationManager.IMPORTANCE_LOW))
            val n = Notification.Builder(ctx, CH)
                .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
                .setContentTitle(ctx.getString(R.string.shop_name))
                .setContentText("This phone is financed by the shop. While a balance is owed it is managed and its location is shared with the shop.")
                .setStyle(Notification.BigTextStyle().bigText("This phone is financed by the shop. While a balance is owed it is managed and its location is shared with the shop. Contact: ${ctx.getString(R.string.shop_phone)}"))
                .setOngoing(true)
                .build()
            nm.notify(ID, n)
        }
    }
}
