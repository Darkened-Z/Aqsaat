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
        box.addView(TextView(this).apply { text = "Paste enrollment string from the Devices page:"; textSize = 14f })
        val input = EditText(this).apply {
            hint = "deviceId|secret|https://your-app-url"
            layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT)
        }
        box.addView(input)
        box.addView(Button(this).apply {
            text = "Enroll this phone"
            setOnClickListener {
                val parts = input.text.toString().trim().split("|")
                if (parts.size != 3 || parts.any { it.isBlank() }) {
                    Toast.makeText(this@MainActivity, "Invalid string", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                p.saveEnrollment(parts[0], parts[1], parts[2])
                CheckinWorker.schedule(this@MainActivity)
                LockManager(this@MainActivity).applyOwnerPolicies()
                checkNow()
                render()
            }
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

    private fun checkNow() {
        if (!p.enrolled) return
        CoroutineScope(Dispatchers.Main).launch {
            val r = withContext(Dispatchers.IO) { Api.checkin(p.baseUrl!!, p.deviceId!!, p.secret!!) }
            val now = System.currentTimeMillis()
            if (r.reachable) {
                p.lastOkMs = now
                when (r.action) {
                    "lock" -> if (now >= p.unlockUntilMs) { p.lockState = "hard"; p.message = r.message; LockManager(this@MainActivity).showLock(r.message) }
                    "release" -> { Toast.makeText(this@MainActivity, "Released", Toast.LENGTH_SHORT).show() }
                    else -> { if (r.action == "ok") p.unlockUntilMs = 0L; p.lockState = if (r.action == "warn") "warn" else "none" }
                }
                Toast.makeText(this@MainActivity, "Server: ${r.action}", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this@MainActivity, "Could not reach server", Toast.LENGTH_SHORT).show()
            }
            render()
        }
    }
}
