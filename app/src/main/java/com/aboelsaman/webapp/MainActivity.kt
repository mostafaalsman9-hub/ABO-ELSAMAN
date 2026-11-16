package com.aboelsaman.webapp

import android.app.Activity
import android.os.Bundle
import android.graphics.Color
import android.view.Gravity
import android.view.View
import android.widget.*
import com.google.firebase.auth.FirebaseAuth
import com.google.android.gms.tasks.Tasks
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class MainActivity : Activity() {

    private lateinit var auth: FirebaseAuth
    private lateinit var content: LinearLayout
    private lateinit var status: TextView

    private val apiUrl =
        "https://abo-elsaman.mostafaalsaman12.workers.dev/create"

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        auth = FirebaseAuth.getInstance()
        showScreen()
    }

    private fun showScreen() {
        val scroll = ScrollView(this)
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(30), dp(24), dp(30))
            setBackgroundColor(Color.rgb(13, 20, 35))
        }

        scroll.addView(content)
        setContentView(scroll)

        text("ABO ELSAMAN", 30, Color.WHITE, true)
        text("STUDIO", 17, Color.rgb(0, 210, 190), true)
        text("مصنع التطبيقات الذكي", 22, Color.WHITE, true)

        status = text("", 14, Color.LTGRAY)

        if (auth.currentUser == null) {
            showLogin()
        } else {
            showFactory()
        }
    }

    private fun text(
        value: String,
        size: Int,
        color: Int,
        bold: Boolean = false
    ): TextView {
        return TextView(this).apply {
            text = value
            textSize = size.toFloat()
            setTextColor(color)
            if (bold) setTypeface(null, android.graphics.Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(0, dp(10), 0, dp(10))
            content.addView(
                this,
                LinearLayout.LayoutParams(-1, -2)
            )
        }
    }

    private fun input(hint: String): EditText {
        return EditText(this).apply {
            this.hint = hint
            setHintTextColor(Color.GRAY)
            setTextColor(Color.WHITE)
            textSize = 16f
            setSingleLine(true)
            setPadding(dp(14), dp(12), dp(14), dp(12))
            setBackgroundColor(Color.rgb(35, 45, 65))
            content.addView(
                this,
                LinearLayout.LayoutParams(-1, dp(55)).apply {
                    bottomMargin = dp(12)
                }
            )
        }
    }

    private fun button(label: String, action: () -> Unit) {
        Button(this).apply {
            text = label
            textSize = 16f
            setOnClickListener { action() }
            content.addView(
                this,
                LinearLayout.LayoutParams(-1, dp(55)).apply {
                    bottomMargin = dp(12)
                }
            )
        }
    }

    private fun showLogin() {
        text("سجّل الدخول للبدء", 18, Color.WHITE, true)

        val email = input("البريد الإلكتروني")
        val password = input("كلمة المرور")
        password.inputType =
            android.text.InputType.TYPE_CLASS_TEXT or
            android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD

        button("تسجيل الدخول") {
            val e = email.text.toString().trim()
            val p = password.text.toString()

            if (e.isEmpty() || p.isEmpty()) {
                status.text = "أدخل البريد وكلمة المرور"
                return@button
            }

            status.text = "جاري تسجيل الدخول..."

            auth.signInWithEmailAndPassword(e, p)
                .addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        showScreen()
                    } else {
                        status.text =
                            task.exception?.localizedMessage ?: "فشل تسجيل الدخول"
                    }
                }
        }

        button("إنشاء حساب جديد") {
            val e = email.text.toString().trim()
            val p = password.text.toString()

            if (e.isEmpty() || p.length < 6) {
                status.text = "أدخل بريدًا صحيحًا وكلمة مرور من 6 أحرف على الأقل"
                return@button
            }

            status.text = "جاري إنشاء الحساب..."

            auth.createUserWithEmailAndPassword(e, p)
                .addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        showScreen()
                    } else {
                        status.text =
                            task.exception?.localizedMessage ?: "فشل إنشاء الحساب"
                    }
                }
        }
    }

    private fun showFactory() {
        text("مرحبًا بك في المصنع", 19, Color.WHITE, true)
        text("أنشئ تطبيق Android من أي موقع HTTPS", 15, Color.LTGRAY)

        val appName = input("اسم التطبيق")
        val website = input("رابط الموقع HTTPS")
        val packageId = input("معرّف التطبيق مثال: com.example.app")

        button("إنشاء التطبيق") {
            val name = appName.text.toString().trim()
            val site = website.text.toString().trim()
            val appId = packageId.text.toString().trim()

            if (name.isEmpty() || site.isEmpty() || appId.isEmpty()) {
                status.text = "أكمل جميع البيانات أولاً"
                return@button
            }

            if (!site.startsWith("https://")) {
                status.text = "رابط الموقع يجب أن يبدأ بـ https://"
                return@button
            }

            submitBuild(name, site, appId)
        }

        button("تسجيل الخروج") {
            auth.signOut()
            showScreen()
        }
    }

    private fun submitBuild(
        name: String,
        website: String,
        packageId: String
    ) {
        status.text = "جاري إرسال طلب إنشاء التطبيق..."

        thread {
            var connection: HttpURLConnection? = null

            try {
                val user = auth.currentUser
                    ?: throw Exception("يجب تسجيل الدخول أولاً")
                val token = Tasks.await(user.getIdToken(false)).token
                    ?: throw Exception("تعذر الحصول على رمز تسجيل الدخول")

                connection = (URL(apiUrl).openConnection() as HttpURLConnection)
                connection.requestMethod = "POST"
                connection.connectTimeout = 20000
                connection.readTimeout = 20000
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("Authorization", "Bearer $token")

                val body = JSONObject().apply {
                    put("app_name", name)
                    put("website_url", website)
                    put("application_id", packageId)
                }

                connection.outputStream.use {
                    it.write(body.toString().toByteArray(Charsets.UTF_8))
                }

                val code = connection.responseCode
                val stream = if (code in 200..299) {
                    connection.inputStream
                } else {
                    connection.errorStream
                }

                val result = stream?.bufferedReader()?.use {
                    it.readText()
                } ?: ""

                val message = try {
                    JSONObject(result).optString(
                        "message",
                        JSONObject(result).optString("error", result)
                    )
                } catch (_: Exception) {
                    result
                }

                runOnUiThread {
                    status.text = if (code == 200) {
                        "✅ $message"
                    } else {
                        "❌ $message"
                    }
                }

            } catch (e: Exception) {
                runOnUiThread {
                    status.text =
                        "حدث خطأ: ${e.localizedMessage ?: "تعذر الاتصال"}"
                }
            } finally {
                connection?.disconnect()
            }
        }
    }
}
