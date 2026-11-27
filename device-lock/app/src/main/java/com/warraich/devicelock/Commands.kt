package com.warraich.devicelock

import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.UserManager
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Remote fixes queued by the shop in /devices (lib/deviceCommands.js). Each runs once;
 * its id is acked on the next check-in so the server drops it. Results go to
 * Prefs.cmdLog, which check-in reports so the shop sees what happened.
 */
object Commands {
    /** Runs the new ones in [cmds]; true if any ran. */
    fun run(ctx: Context, cmds: JSONArray?): Boolean {
        if (cmds == null || cmds.length() == 0) return false
        val p = Prefs(ctx)
        val seen = p.cmdSeen.split(",").filter { it.isNotBlank() }.toMutableList()
        val acks = p.cmdAcks.split(",").filter { it.isNotBlank() }.toMutableList()
        var ran = false
        for (i in 0 until cmds.length()) {
            val c = cmds.optJSONObject(i) ?: continue
            val id = c.optString("id")
            if (id.isBlank()) continue
            if (id in seen) { if (id !in acks) acks += id; continue }
            val op = c.optString("op"); val arg = c.optString("arg")
            val msg = runCatching { exec(ctx, op, arg) }.getOrElse { "error: ${it.message}" }
            val t = SimpleDateFormat("d MMM HH:mm", Locale.US).format(Date())
            p.cmdLog = ("$t $op${if (arg.isNotBlank()) " $arg" else ""}: $msg\n" + p.cmdLog).take(600)
            seen += id; acks += id; ran = true
        }
        p.cmdSeen = seen.takeLast(40).joinToString(",")
        p.cmdAcks = acks.joinToString(",")
        return ran
    }

    private fun exec(ctx: Context, op: String, arg: String): String {
        val lm = LockManager(ctx)
        if (!lm.isDeviceOwner()) return "error: app is not device owner"
        val dpm = ctx.getSystemService(DevicePolicyManager::class.java)
        val admin = AdminReceiver.component(ctx)
        val pm = ctx.packageManager
        val flags = PackageManager.MATCH_UNINSTALLED_PACKAGES or PackageManager.MATCH_DISABLED_COMPONENTS
        return when (op) {
            "clear_restriction" -> {
                val key = if (arg.startsWith("no_")) arg else "no_$arg"
                dpm.clearUserRestriction(admin, key)
                val um = ctx.getSystemService(UserManager::class.java)
                if (um.hasUserRestriction(key)) "still on (set by the phone maker or system, not this app)" else "lifted"
            }
            "show_app" -> {
                val ai = runCatching { pm.getApplicationInfo(arg, flags) }.getOrNull()
                    ?: return "not on this phone, install it from Play Store"
                val done = mutableListOf<String>()
                if (ai.flags and ApplicationInfo.FLAG_INSTALLED == 0 && runCatching { dpm.enableSystemApp(admin, arg) }.isSuccess) done += "reinstalled"
                if (runCatching { dpm.isApplicationHidden(admin, arg) }.getOrDefault(false) && dpm.setApplicationHidden(admin, arg, false)) done += "unhidden"
                if (ai.flags and ApplicationInfo.FLAG_SUSPENDED != 0 && runCatching { dpm.setPackagesSuspended(admin, arrayOf(arg), false) }.isSuccess) done += "unsuspended"
                val now = pm.getApplicationInfo(arg, flags)
                val state = when {
                    now.flags and ApplicationInfo.FLAG_INSTALLED == 0 -> "not installed"
                    !now.enabled -> "installed but disabled (enable it in Settings > Apps)"
                    else -> "ok"
                }
                (if (done.isEmpty()) "nothing blocked by this app" else done.joinToString(", ")) + " · now $state"
            }
            "restore_apps" -> {
                val before = Prefs(ctx).appsFix
                lm.restoreSystemApps()
                Prefs(ctx).appsFix.takeIf { it != before } ?: "nothing missing"
            }
            "clear_pinning" -> {
                if (!lm.pinned()) "was not pinned" else {
                    dpm.setLockTaskPackages(admin, emptyArray())
                    dpm.setLockTaskPackages(admin, arrayOf(ctx.packageName))
                    if (lm.pinned()) "still pinned" else "cleared"
                }
            }
            "reapply" -> { lm.applyOwnerPolicies(); "done" }
            else -> "error: unknown fix (update the app)"
        }
    }
}
