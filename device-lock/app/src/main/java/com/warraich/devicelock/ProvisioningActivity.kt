package com.warraich.devicelock

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.Intent
import android.os.Bundle

/**
 * Required for QR / managed provisioning on Android 10+ (API 29+). The system calls
 * GET_PROVISIONING_MODE (we ask for a fully-managed device) and, once Device Owner is
 * set, ADMIN_POLICY_COMPLIANCE (we apply restrictions, then hand off to MainActivity
 * for the claim-code step). Without these, QR provisioning fails on newer phones.
 */
class ProvisioningActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        when (intent.action) {
            DevicePolicyManager.ACTION_GET_PROVISIONING_MODE -> {
                val result = Intent().putExtra(
                    DevicePolicyManager.EXTRA_PROVISIONING_MODE,
                    DevicePolicyManager.PROVISIONING_MODE_FULLY_MANAGED_DEVICE
                )
                setResult(RESULT_OK, result)
                finish()
            }
            DevicePolicyManager.ACTION_ADMIN_POLICY_COMPLIANCE -> {
                LockManager(this).applyOwnerPolicies()
                startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                setResult(RESULT_OK)
                finish()
            }
            else -> finish()
        }
    }
}
