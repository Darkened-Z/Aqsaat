package com.warraich.devicelock

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.format.DateUtils
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONObject
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Locale

/** The customer's "My Plan" screen: totals, status and payment history. Plan data only. */
class PlanView(private val ctx: Context, private val onRefresh: () -> Unit, private val onCall: (String) -> Unit) {
    private val green = Color.parseColor("#0f6b4b")
    private val ink = Color.parseColor("#1a2b1f")
    private val mut = Color.parseColor("#7a7663")
    private val line = Color.parseColor("#ece8dc")
    private val bg = Color.parseColor("#f7f5ef")
    private val red = Color.parseColor("#a4362b")
    private val amber = Color.parseColor("#a26a10")

    private fun dp(v: Int) = (v * ctx.resources.displayMetrics.density).toInt()
    private fun rs(v: Int) = "Rs " + NumberFormat.getIntegerInstance(Locale.US).format(v)
    private fun date(s: String): String = runCatching {
        SimpleDateFormat("d MMM yyyy", Locale.US).format(SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(s)!!)
    }.getOrDefault(s)

    private fun box(color: Int, radius: Int, stroke: Int? = null) = GradientDrawable().apply {
        setColor(color); cornerRadius = dp(radius).toFloat(); if (stroke != null) setStroke(dp(1), stroke)
    }

    private fun text(s: String, size: Float, color: Int = ink, bold: Boolean = false) = TextView(ctx).apply {
        text = s; textSize = size; setTextColor(color); if (bold) typeface = Typeface.DEFAULT_BOLD
    }

    private fun card() = LinearLayout(ctx).apply {
        orientation = LinearLayout.VERTICAL
        background = box(Color.WHITE, 14, line)
        setPadding(dp(16), dp(14), dp(16), dp(14))
        layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { setMargins(0, 0, 0, dp(12)) }
    }

    private fun chip(s: String, fg: Int, bgc: Int) = text(s, 12f, fg, true).apply {
        background = box(bgc, 20); setPadding(dp(10), dp(4), dp(10), dp(4))
    }

    /** [plan] null with [failed] = nothing cached and the server couldn't be reached. */
    fun build(plan: JSONObject?, failed: Boolean, syncedMs: Long): View {
        val col = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }
        val scroll = ScrollView(ctx).apply { setBackgroundColor(bg); isFillViewport = true; addView(col) }

        val head = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(green)
            setPadding(dp(20), dp(28), dp(20), dp(22))
        }
        val shop = plan?.optJSONObject("shop")
        head.addView(text(shop?.optString("name").orEmpty().ifBlank { "Installment plan" }, 13f, Color.argb(190, 255, 255, 255)))
        head.addView(text("My Plan  ·  میری قسطیں", 24f, Color.WHITE, true).apply { setPadding(0, dp(2), 0, 0) })
        if (plan != null) {
            val prod = plan.optJSONObject("product")
            val name = listOf(prod?.optString("emoji").orEmpty(), prod?.optString("name").orEmpty()).filter { it.isNotBlank() }.joinToString(" ")
            val who = plan.optJSONObject("customer")?.optString("name").orEmpty()
            val sub = listOf(name, who, plan.optString("voucherNo")).filter { it.isNotBlank() }.joinToString("  ·  ")
            if (sub.isNotBlank()) head.addView(text(sub, 14f, Color.argb(220, 255, 255, 255)).apply { setPadding(0, dp(6), 0, 0) })
        }
        col.addView(head)

        val body = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(16), dp(16), dp(16), dp(24)) }
        col.addView(body)

        if (plan == null) {
            body.addView(card().apply {
                val loading = !failed && syncedMs == 0L
                addView(text(when { failed -> "Couldn't load your plan"; loading -> "Loading your plan…"; else -> "No plan linked yet" }, 16f, ink, true))
                if (loading) addView(text("One moment  ·  ایک لمحہ", 13f, mut).apply { setPadding(0, dp(6), 0, 0) })
                else addView(text(if (failed) "Connect to the internet and tap Refresh.\nانٹرنیٹ آن کریں اور ریفریش دبائیں۔" else "Ask the shop to link your plan to this phone.", 13f, mut).apply { setPadding(0, dp(6), 0, 0) })
            })
            body.addView(actions(""))
            body.addView(footer(syncedMs))
            return scroll
        }

        // Status + totals
        val status = plan.optString("status")
        val total = plan.optInt("total"); val paid = plan.optInt("paid"); val remaining = plan.optInt("remaining")
        body.addView(card().apply {
            addView(when (status) {
                "completed" -> chip("🎉 Fully paid  ·  مکمل ادا", green, Color.parseColor("#eaf5ee"))
                "overdue" -> chip("⚠️ ${plan.optInt("overdueCount")} late  ·  ${rs(plan.optInt("overdueAmount"))} overdue", red, Color.parseColor("#fdecea"))
                "due_today" -> chip("📅 Installment due today  ·  آج قسط ہے", amber, Color.parseColor("#fdf2d9"))
                else -> chip("✅ On track  ·  بروقت", green, Color.parseColor("#eaf5ee"))
            }.apply { layoutParams = LinearLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT) })
            addView(text("Remaining  ·  باقی رقم", 12f, mut, true).apply { setPadding(0, dp(14), 0, 0) })
            addView(text(rs(remaining), 30f, if (status == "overdue") red else ink, true))
            val pct = if (total > 0) paid * 100 / total else 0
            addView(LinearLayout(ctx).apply {
                background = box(Color.parseColor("#f4f1e6"), 4)
                layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, dp(8)).apply { setMargins(0, dp(10), 0, dp(8)) }
                addView(View(ctx).apply { background = box(green, 4) }, LinearLayout.LayoutParams(0, MATCH_PARENT, pct.toFloat()))
                addView(View(ctx), LinearLayout.LayoutParams(0, MATCH_PARENT, (100 - pct).toFloat()))
            })
            addView(text("Paid ${rs(paid)} of ${rs(total)}  ·  ${plan.optInt("paidCount")}/${plan.optInt("count")} installments", 13f, mut))
        })

        // Next installment
        plan.optJSONObject("next")?.let { n ->
            val st = n.optString("status")
            val due = n.optString("dueDate")
            val whenTxt = when (st) {
                "late" -> "was due ${date(due)}"
                "today" -> "due today"
                else -> "due ${date(due)}"
            }
            body.addView(card().apply {
                addView(text("Next installment  ·  اگلی قسط", 12f, mut, true))
                addView(LinearLayout(ctx).apply {
                    gravity = Gravity.CENTER_VERTICAL; setPadding(0, dp(6), 0, 0)
                    addView(text(rs(n.optInt("amount")), 22f, if (st == "late") red else ink, true), LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f))
                    addView(text("#${n.optInt("n")}  ·  $whenTxt", 13f, if (st == "late") red else mut))
                })
            })
        }

        body.addView(actions(shop?.optString("phone").orEmpty()))

        // History
        body.addView(text("Payment history  ·  ادائیگیوں کی تفصیل", 15f, ink, true).apply { setPadding(dp(2), dp(8), 0, dp(8)) })
        val list = card().apply { setPadding(dp(16), dp(4), dp(16), dp(4)) }
        val down = plan.optInt("down")
        if (down > 0) list.addView(row("Down payment", plan.optString("startDate").let { if (it.isBlank()) "" else date(it) }, rs(down), chip("Paid", green, Color.parseColor("#eaf5ee")), false))
        val sch = plan.optJSONArray("schedule")
        if (sch != null) for (i in 0 until sch.length()) {
            val s = sch.getJSONObject(i)
            val st = s.optString("status")
            val sub = when (st) {
                "paid" -> "Paid " + (s.optString("paidDate").takeIf { it.isNotBlank() }?.let { date(it) } ?: "")
                "late" -> "Due ${date(s.optString("dueDate"))}  ·  ${s.optInt("daysLate")} days late"
                "today" -> "Due today"
                else -> "Due ${date(s.optString("dueDate"))}"
            }
            val amt = if (st == "paid") s.optInt("paidAmount") else s.optInt("amount")
            val c = when (st) {
                "paid" -> chip("Paid", green, Color.parseColor("#eaf5ee"))
                "late" -> chip("Late", red, Color.parseColor("#fdecea"))
                "today" -> chip("Today", amber, Color.parseColor("#fdf2d9"))
                else -> chip("Upcoming", mut, Color.parseColor("#f4f1e6"))
            }
            list.addView(row("Installment #${s.optInt("n")}", sub, rs(amt), c, down > 0 || i > 0))
        }
        body.addView(list)
        body.addView(footer(syncedMs))
        return scroll
    }

    private fun row(title: String, sub: String, amount: String, chip: TextView, divider: Boolean) = LinearLayout(ctx).apply {
        orientation = LinearLayout.VERTICAL
        if (divider) addView(View(ctx).apply { setBackgroundColor(Color.parseColor("#f2eee2")) }, LinearLayout.LayoutParams(MATCH_PARENT, dp(1)))
        addView(LinearLayout(ctx).apply {
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(11), 0, dp(11))
            addView(LinearLayout(ctx).apply {
                orientation = LinearLayout.VERTICAL
                addView(text(title, 14f, ink, true))
                if (sub.isNotBlank()) addView(text(sub, 12f, mut))
            }, LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f))
            addView(LinearLayout(ctx).apply {
                orientation = LinearLayout.VERTICAL; gravity = Gravity.END
                // Explicit WRAP_CONTENT: the vertical default (MATCH_PARENT) squeezed the amount to
                // the chip's width when the chip is the narrower one ("Paid"), clipping "5,000".
                addView(text(amount, 14f, ink, true).apply { gravity = Gravity.END }, LinearLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
                addView(chip.apply { layoutParams = LinearLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT).apply { topMargin = dp(4) } })
            })
        })
    }

    private fun actions(phone: String) = LinearLayout(ctx).apply {
        layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { setMargins(0, 0, 0, dp(8)) }
        fun btn(label: String, filled: Boolean, click: () -> Unit) = Button(ctx).apply {
            text = label; isAllCaps = false; textSize = 14f; typeface = Typeface.DEFAULT_BOLD
            setTextColor(if (filled) Color.WHITE else ink)
            background = box(if (filled) green else Color.WHITE, 12, if (filled) null else line)
            stateListAnimator = null
            setOnClickListener { click() }
        }
        if (phone.isNotBlank()) {
            addView(btn("📞 Call shop", true) { onCall(phone) }, LinearLayout.LayoutParams(0, dp(48), 1f).apply { marginEnd = dp(8) })
        }
        addView(btn("🔄 Refresh", phone.isBlank()) { onRefresh() }, LinearLayout.LayoutParams(0, dp(48), 1f))
    }

    private fun footer(syncedMs: Long) = text(
        (if (syncedMs > 0) "Updated " + DateUtils.getRelativeTimeSpanString(syncedMs) else "Not updated yet") + "  ·  v" + BuildConfig.VERSION_NAME,
        11f, mut
    ).apply { gravity = Gravity.CENTER; setPadding(0, dp(14), 0, 0) }
}
