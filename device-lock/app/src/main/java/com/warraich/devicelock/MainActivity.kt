package com.warraich.devicelock

import android.os.Bundle
import org.json.JSONObject
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

/** Before enrollment: the shop's setup screen. After: the customer's "My Plan" screen. */
class MainActivity : AppCompatActivity() {
    private lateinit var p: Prefs

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        p = Prefs(this)
        render()
    }

    override fun onResume() {
        super.onResume()
        if (p.enrolled) { LockManager(this).exitStaleLockTask(); loadPlan() }
    }

    private fun pad(dp: Int) = (dp * resources.displayMetrics.density).toInt()

    private fun render() {
        if (p.enrolled) { showPlan(false); return }
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

        root.addView(enrollBlock())
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
                        loadPlan()
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

    private fun showPlan(failed: Boolean) {
        val plan = p.planJson.takeIf { it.isNotBlank() }?.let { runCatching { JSONObject(it) }.getOrNull() }
        setContentView(PlanView(this, onRefresh = { refresh() }, onCall = { call(it.ifBlank { getString(R.string.shop_phone) }) })
            .build(plan, failed && plan == null, p.planAtMs))
    }

    private fun loadPlan(done: ((Boolean) -> Unit)? = null) {
        val base = p.baseUrl ?: return
        val id = p.deviceId ?: return
        val sec = p.secret ?: return
        CoroutineScope(Dispatchers.Main).launch {
            val json = withContext(Dispatchers.IO) { Api.plan(base, id, sec) }
            if (json != null) { p.planJson = json; p.planAtMs = System.currentTimeMillis() }
            if (!isFinishing) showPlan(json == null)
            done?.invoke(json != null)
        }
    }

    private fun refresh() {
        Toast.makeText(this, "Updating…", Toast.LENGTH_SHORT).show()
        loadPlan { ok -> if (!ok) Toast.makeText(this, "No internet — showing last saved", Toast.LENGTH_SHORT).show() }
        checkNow(quiet = true)
    }

    private fun call(number: String) {
        runCatching { startActivity(android.content.Intent(android.content.Intent.ACTION_DIAL, android.net.Uri.parse("tel:$number"))) }
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

    private fun checkNow(quiet: Boolean = false) {
        if (!p.enrolled) return
        if (!quiet) Toast.makeText(this, "Checking…", Toast.LENGTH_SHORT).show()
        CoroutineScope(Dispatchers.Main).launch {
            val r = withContext(Dispatchers.IO) { Checkin.run(this@MainActivity) } ?: return@launch
            if (quiet) {
                if (r.reachable && r.latestVersion > BuildConfig.VERSION_CODE) Toast.makeText(this@MainActivity, "Updating app…", Toast.LENGTH_SHORT).show()
            } else if (r.reachable) {
                val msg = if (r.latestVersion > BuildConfig.VERSION_CODE) "Server: ${r.action} — updating app…" else "Server: ${r.action}"
                Toast.makeText(this@MainActivity, msg, Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this@MainActivity, "Could not reach server", Toast.LENGTH_SHORT).show()
            }
            render()
        }
    }
}
