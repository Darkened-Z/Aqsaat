package com.warraich.devicelock

import android.app.Application

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        val p = Prefs(this)
        if (p.enrolled) {
            CheckinWorker.schedule(this)
            LockManager(this).applyOwnerPolicies()
        }
    }
}
