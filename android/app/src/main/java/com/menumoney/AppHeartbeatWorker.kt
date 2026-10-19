
package com.menumoney

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class AppHeartbeatWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val config = encryptedPrefs(applicationContext)

        val baseUrl = config.getString("baseUrl", null)
            ?: return@withContext Result.failure()

        val token = config.getString("token", null)
            ?: return@withContext Result.failure()

        val installationId = config.getString("installationId", null)
            ?: return@withContext Result.failure()

        val appVersion = config.getString("appVersion", "unknown")
            ?: "unknown"

        var connection: HttpURLConnection? = null

        try {
            val endpoint =
                "${baseUrl.trimEnd('/')}/app-activity/heartbeat"

            connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15000
                readTimeout = 15000
                doOutput = true

                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer $token")
            }

            val payload = JSONObject().apply {
                put("installationId", installationId)
                put("appVersion", appVersion)
            }

            connection.outputStream.use {
                it.write(payload.toString().toByteArray(Charsets.UTF_8))
            }

            when (connection.responseCode) {
                in 200..299 -> Result.success()
                401, 403 -> Result.failure()
                in 500..599 -> Result.retry()
                else -> Result.failure()
            }
        } catch (_: Exception) {
            Result.retry()
        } finally {
            connection?.disconnect()
        }
    }
}
