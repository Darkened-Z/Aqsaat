package com.warraich.devicelock

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * The hard lock. Pins itself with lock-task so it can't be swiped away, shows the
 * shop message, an emergency dialer, an unlock-code box (works fully offline), and
 * — when the shop has online payment on — the amount due with a JazzCash pay link
 * (QR for another phone, or pay right here). It keeps checking in while shown and
 * closes itself as soon as the server stops saying "lock".
 */
class LockActivity : AppCompatActivity() {
    private lateinit var p: Prefs
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var poll: Job? = null
    private var web: WebView? = null
    private var lastCheckinMs = 0L
    private var shown = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        p = Prefs(this)
        showMain(intent.getStringExtra("message"))
        runCatching { startLockTask() }
    }

    // Every check-in that still says "lock" re-launches this; redraw only when what
    // is shown changed, so a half-typed unlock code isn't wiped.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val msg = intent.getStringExtra("message")?.ifBlank { null } ?: p.message
        if (web == null && shown != "$msg|${p.payUrl}|${p.dueAmount}") showMain(msg)
    }

    override fun onResume() {
        super.onResume()
        poll?.cancel()
        poll = scope.launch {
            while (isActive) {
                if (closeIfUnlocked()) return@launch
                // Every 60s, or every 15s while a payment is in flight.
                val every = if (web != null) 15_000L else 60_000L
                if (System.currentTimeMillis() - lastCheckinMs >= every) checkinNow()
                delay(3_000L)
            }
        }
    }

    override fun onPause() { poll?.cancel(); super.onPause() }
    override fun onDestroy() { scope.cancel(); web?.destroy(); super.onDestroy() }

    private suspend fun checkinNow() {
        lastCheckinMs = System.currentTimeMillis()
        withContext(Dispatchers.IO) { runCatching { Checkin.run(applicationContext) } }
    }

    /** Push-triggered or polled check-ins flip lockState; the activity follows it. */
    private fun closeIfUnlocked(): Boolean {
        if (p.lockState == "hard" && System.currentTimeMillis() >= p.unlockUntilMs) return false
        runCatching { stopLockTask() }
        if (web != null) Toast.makeText(this, "Payment received — phone unlocked", Toast.LENGTH_LONG).show()
        finish()
        return true
    }

    private fun pad(dp: Int) = (dp * resources.displayMetrics.density).toInt()

    private fun showMain(extraMsg: String?) {
        web?.destroy(); web = null
        val msg = extraMsg?.ifBlank { null } ?: p.message
        shown = "$msg|${p.payUrl}|${p.dueAmount}"
        setContentView(ScrollView(this).apply {
            isFillViewport = true
            setBackgroundColor(0xFF0B4F37.toInt())
            addView(buildView(msg))
        })
    }

    private fun buildView(msg: String): LinearLayout {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
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

        val url = p.payUrl
        if (url.isNotBlank() && p.dueAmount > 0) {
            root.addView(label("Pay Rs ${"%,d".format(p.dueAmount)} to unlock now", 18f, 22))
            root.addView(label("ادائیگی کریں، فون فوراً کھل جائے گا", 15f, 4))
            root.addView(Button(this).apply {
                text = "Pay on this phone (JazzCash)"
                layoutParams = LinearLayout.LayoutParams(pad(260), WRAP_CONTENT).apply { topMargin = pad(12) }
                setOnClickListener { showPay(url) }
            })
            qr(url, pad(170))?.let { bmp ->
                root.addView(label("Or scan with another phone:", 13f, 14))
                root.addView(ImageView(this).apply {
                    setImageBitmap(bmp)
                    layoutParams = LinearLayout.LayoutParams(pad(170), pad(170)).apply { topMargin = pad(6) }
                })
            }
        }

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

    /**
     * JazzCash checkout inside the lock screen, so lock-task never has to be lifted.
     * Only http(s) navigation is allowed: no intents out to other apps.
     */
    @SuppressLint("SetJavaScriptEnabled")
    private fun showPay(url: String) {
        val wv = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, 0, 1f)
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean {
                    val s = req.url.scheme
                    return s != "https" && s != "http"
                }
                override fun onPageFinished(view: WebView, u: String) {
                    // Back on our page after checkout: ask the server right away.
                    if (u.contains("/pay/") && u.contains("r=")) scope.launch { checkinNow() }
                }
            }
            loadUrl(url)
        }
        web = wv
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.WHITE)
            addView(Button(this@LockActivity).apply {
                text = "← Back"
                layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT)
                setOnClickListener { showMain(null) }
            })
            addView(wv)
        })
    }

    private fun qr(text: String, size: Int): Bitmap? = runCatching {
        val m = QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, size, size, mapOf(EncodeHintType.MARGIN to 1))
        val px = IntArray(size * size) { i -> if (m[i % size, i / size]) Color.BLACK else Color.WHITE }
        Bitmap.createBitmap(px, size, size, Bitmap.Config.ARGB_8888)
    }.getOrNull()

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

    // Block back/home escape while hard-locked. Back inside checkout returns to the lock.
    override fun onBackPressed() {
        val w = web ?: return
        if (w.canGoBack()) w.goBack() else showMain(null)
    }
    override fun onUserLeaveHint() {
        if (p.lockState == "hard" && System.currentTimeMillis() >= p.unlockUntilMs) {
            startActivity(Intent(this, LockActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }
}
