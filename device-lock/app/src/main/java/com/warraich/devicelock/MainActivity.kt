package com.warraich.devicelock

import android.os.Bundle
import android.text.format.DateUtils
import android.view.Gravity
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Status + enrollment screen. Not the lock — this is the owner/setup view. */
class MainActivity : AppCompatActivity() {
    private lateinit var p: Prefs

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        p = Prefs(this)
        render()
    }

    private fun pad(dp: Int) = (dp * resources.displayMetrics.density).toInt()

    private fun render() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad(24), pad(32), pad(24), pad(24))
        }
        root.addView(TextView(this).apply { text = "Device Lock"; textSize = 24f })
        val owner = LockManager(this).isDeviceOwner()
        root.addView(TextView(this).apply {
            text = if (owner) "✓ Device Owner active" else "⚠ Not Device Owner — run ADB provisioning"
            textSize = 14f; setPadding(0, pad(6), 0, pad(16))
        })

        if (!p.enrolled) root.addView(enrollBlock()) else root.addView(statusBlock())
        setContentView(root)
    }

    private fun enrollBlock(): LinearLayout {
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        box.addView(TextView(this).apply {
            text = "Enter the enrollment code from the Devices page:"; textSize = 14f
        })
        val code = EditText(this).apply {
            hint = "e.g. K7M2PQR"
            filters = arrayOf(android.text.InputFilter.AllCaps(), android.text.InputFilter.LengthFilter(7))
            layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT)
        }
        box.addView(code)
        box.addView(Button(this).apply {
            text = "Enroll this phone"
            setOnClickListener {
                val c = code.text.toString().trim()
                if (c.length < 6) { Toast.makeText(this@MainActivity, "Enter the code", Toast.LENGTH_SHORT).show(); return@setOnClickListener }
                val base = p.baseUrl
                if (base.isNullOrBlank()) { Toast.makeText(this@MainActivity, "App has no server URL compiled in", Toast.LENGTH_LONG).show(); return@setOnClickListener }
                isEnabled = false
                CoroutineScope(Dispatchers.Main).launch {
                    val r = withContext(Dispatchers.IO) { Api.claim(base, c) }
                    if (r.ok) {
                        p.saveEnrollment(r.deviceId, r.secret, r.baseUrl)
                        CheckinWorker.schedule(this@MainActivity)
                        LockManager(this@MainActivity).applyOwnerPolicies()
                        Notify.managed(this@MainActivity)
                        Push.init(this@MainActivity)
                        requestCallScreeningRole()
                        checkNow()
                        render()
                    } else {
                        isEnabled = true
                        Toast.makeText(this@MainActivity, "Enroll failed: ${r.error}", Toast.LENGTH_LONG).show()
                    }
                }
            }
        })
        box.addView(TextView(this).apply {
            text = "Device Owner must already be set (via the provisioning QR)."
            textSize = 12f; setPadding(0, pad(10), 0, 0)
        })
        return box
    }

    private fun statusBlock(): LinearLayout {
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val last = if (p.lastOkMs > 0)
            DateUtils.getRelativeTimeSpanString(p.lastOkMs).toString() else "never"
        box.addView(TextView(this).apply {
            text = "Device: ${p.deviceId}\nState: ${p.lockState}\nLast server contact: $last"
            textSize = 14f; setPadding(0, 0, 0, pad(16))
        })
        box.addView(Button(this).apply {
            text = "Check now"
            setOnClickListener { checkNow() }
        })
        return box
    }

    /**
     * Ask for the Call Screening role so CallGuard can block all but the shop number
     * when a phone is marked lost. One system prompt the shop taps "Allow" to during
     * setup. Android 10+; older phones keep the lock-screen "Call shop" path only.
     */
    private fun requestCallScreeningRole() {
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.Q) return
        val rm = getSystemService(android.app.role.RoleManager::class.java) ?: return
        runCatching {
            if (rm.isRoleAvailable(android.app.role.RoleManager.ROLE_CALL_SCREENING)
                && !rm.isRoleHeld(android.app.role.RoleManager.ROLE_CALL_SCREENING)) {
                startActivityForResult(rm.createRequestRoleIntent(android.app.role.RoleManager.ROLE_CALL_SCREENING), 7001)
            }
        }
    }

    private fun checkNow() {
        if (!p.enrolled) return
        Toast.makeText(this, "Checking…", Toast.LENGTH_SHORT).show()
        CoroutineScope(Dispatchers.Main).launch {
            val r = withContext(Dispatchers.IO) { Checkin.run(this@MainActivity) } ?: return@launch
            if (r.reachable) {
                val msg = if (r.latestVersion > BuildConfig.VERSION_CODE) "Server: ${r.action} — updating app…" else "Server: ${r.action}"
                Toast.makeText(this@MainActivity, msg, Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this@MainActivity, "Could not reach server", Toast.LENGTH_SHORT).show()
            }
            render()
        }
    }
}
