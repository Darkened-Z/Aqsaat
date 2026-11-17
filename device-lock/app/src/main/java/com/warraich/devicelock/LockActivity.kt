package com.warraich.devicelock

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

/**
 * The hard lock. Pins itself with lock-task so it can't be swiped away, shows the
 * shop message, an emergency dialer, and an unlock-code box (works fully offline).
 */
class LockActivity : AppCompatActivity() {
    private lateinit var p: Prefs

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        p = Prefs(this)
        val msg = intent.getStringExtra("message")?.ifBlank { null } ?: p.message
        setContentView(buildView(msg))
        runCatching { startLockTask() }
    }

    private fun pad(dp: Int) = (dp * resources.displayMetrics.density).toInt()

    private fun buildView(msg: String): LinearLayout {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(0xFF0B4F37.toInt())
            setPadding(pad(28), pad(28), pad(28), pad(28))
        }
        fun label(t: String, size: Float, top: Int) = TextView(this).apply {
            text = t; textSize = size; setTextColor(0xFFFFFFFF.toInt())
            gravity = Gravity.CENTER; setPadding(0, pad(top), 0, 0)
        }
        root.addView(label("🔒", 48f, 0))
        root.addView(label(getString(R.string.shop_name), 22f, 12))
        root.addView(label(msg.ifBlank { "Phone locked. Please contact the shop." }, 16f, 16))
        root.addView(label("Call: ${getString(R.string.shop_phone)}", 15f, 10))

        val code = EditText(this).apply {
            hint = "Unlock code"; setHintTextColor(0xFFBFE8D5.toInt()); setTextColor(0xFFFFFFFF.toInt())
            inputType = android.text.InputType.TYPE_CLASS_NUMBER
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(pad(220), WRAP_CONTENT).apply { topMargin = pad(24) }
        }
        root.addView(code)

        root.addView(Button(this).apply {
            text = "Unlock"
            layoutParams = LinearLayout.LayoutParams(pad(220), WRAP_CONTENT).apply { topMargin = pad(10) }
            setOnClickListener { tryUnlock(code.text.toString()) }
        })
        root.addView(Button(this).apply {
            text = "Emergency call"
            layoutParams = LinearLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT).apply { topMargin = pad(18) }
            setOnClickListener {
                runCatching { startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:"))) }
            }
        })
        return root
    }

    private fun tryUnlock(entered: String) {
        val secret = p.secret
        if (secret != null && UnlockCode.isValid(secret, entered)) {
            p.unlockUntilMs = System.currentTimeMillis() + 72L * 3_600_000L // 72h grace
            p.lockState = "none"
            runCatching { stopLockTask() }
            Toast.makeText(this, "Unlocked for 72 hours", Toast.LENGTH_LONG).show()
            finish()
        } else {
            Toast.makeText(this, "Wrong code", Toast.LENGTH_SHORT).show()
        }
    }

    // Block back/home escape while hard-locked.
    override fun onBackPressed() { /* swallow */ }
    override fun onUserLeaveHint() {
        if (p.lockState == "hard" && System.currentTimeMillis() >= p.unlockUntilMs) {
            startActivity(Intent(this, LockActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }
}
