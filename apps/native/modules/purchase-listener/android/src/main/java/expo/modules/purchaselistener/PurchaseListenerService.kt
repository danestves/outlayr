package expo.modules.purchaselistener

import android.app.Activity
import android.app.Notification
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ApplicationInfo
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import java.util.regex.Pattern

class PurchaseListenerService : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification) {
    try {
      PurchaseListenerStore.onPosted(this, sbn)
    } catch (_: Exception) {
    }
  }
}

internal object PurchaseListenerStore {
  private const val PREFS = "purchase-listener"
  private const val KEY_APPS = "apps"
  private const val KEY_PATTERN = "moneyPattern"
  private const val KEY_IGNORE_CASE = "moneyPatternIgnoreCase"
  private const val KEY_SENDERS = "senders"
  private const val QUEUE_DIRECTORY = "pending-writes"
  private const val QUEUE_FILE = "queue.jsonl"
  private const val SENDER_LIMIT = 20
  private const val SENDER_TEXT_CAP = 200
  private val WHITESPACE = Regex("\\s+")
  private val DEFAULT_APPS = setOf("com.google.android.apps.walletnfcrel")

  private val lock = Any()
  private var compiledKey: String? = null
  private var compiledIgnoreCase = false
  private var compiled: Pattern? = null

  fun isEnabled(context: Context): Boolean {
    val component = ComponentName(context, PurchaseListenerService::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      val manager = context.getSystemService(NotificationManager::class.java) ?: return false
      return manager.isNotificationListenerAccessGranted(component)
    }
    val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
      ?: return false
    return flat.split(':').any { ComponentName.unflattenFromString(it) == component }
  }

  fun openSettings(context: Context) {
    val component = ComponentName(context, PurchaseListenerService::class.java).flattenToString()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val detail = Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS)
      detail.putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, component)
      if (launch(context, detail)) return
    }
    launch(context, Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
  }

  fun apps(context: Context): List<String> {
    return synchronized(lock) {
      prefs(context).getStringSet(KEY_APPS, DEFAULT_APPS)?.toList() ?: emptyList()
    }
  }

  fun setApps(context: Context, packages: List<String>) {
    synchronized(lock) {
      prefs(context).edit().putStringSet(KEY_APPS, packages.toHashSet()).apply()
    }
  }

  fun setMoneyPattern(context: Context, source: String, ignoreCase: Boolean) {
    synchronized(lock) {
      prefs(context).edit()
        .putString(KEY_PATTERN, source)
        .putBoolean(KEY_IGNORE_CASE, ignoreCase)
        .apply()
    }
  }

  fun senders(context: Context): List<Map<String, Any>> {
    return synchronized(lock) {
      readSenders(prefs(context).getString(KEY_SENDERS, null)).map { sender ->
        mapOf<String, Any>(
          "packageName" to sender.packageName,
          "label" to sender.label,
          "text" to sender.text,
          "at" to sender.at.toDouble(),
        )
      }
    }
  }

  fun onPosted(context: Context, sbn: StatusBarNotification) {
    val notification = sbn.notification ?: return
    if (sbn.packageName == context.packageName) return
    val flags = notification.flags
    if ((flags and Notification.FLAG_GROUP_SUMMARY) != 0) return
    if ((flags and Notification.FLAG_ONGOING_EVENT) != 0) return
    if ((flags and Notification.FLAG_FOREGROUND_SERVICE) != 0) return
    val extras = notification.extras ?: return
    val body = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
      ?: extras.getCharSequence(Notification.EXTRA_TEXT)
    val text = listOf(extras.getCharSequence(Notification.EXTRA_TITLE), body)
      .map { it?.toString()?.trim().orEmpty() }
      .filter { it.isNotEmpty() }
      .joinToString("\n")
    if (text.isEmpty()) return
    val label = label(context, sbn.packageName, extras)
    synchronized(lock) {
      val preferences = prefs(context)
      val source = preferences.getString(KEY_PATTERN, null)?.takeIf { it.isNotEmpty() }
      val matched = source != null && matches(source, preferences.getBoolean(KEY_IGNORE_CASE, false), text)
      if (matched) {
        remember(preferences, sbn.packageName, label, text, sbn.postTime)
      }
      val allowed = preferences.getStringSet(KEY_APPS, DEFAULT_APPS)?.contains(sbn.packageName) == true
      if (allowed && (matched || source == null)) {
        append(context, line(label, text, sbn.postTime))
      }
    }
  }

  private fun launch(context: Context, intent: Intent): Boolean {
    if (context !is Activity) {
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    return try {
      context.startActivity(intent)
      true
    } catch (_: Exception) {
      false
    }
  }

  private fun prefs(context: Context) =
    context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  @Suppress("DEPRECATION")
  private fun postedApp(extras: Bundle): ApplicationInfo? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      extras.getParcelable("android.appInfo", ApplicationInfo::class.java)
    } else {
      extras.getParcelable<ApplicationInfo>("android.appInfo")
    }
  }

  private fun label(context: Context, packageName: String, extras: Bundle): String {
    val fromExtras = postedApp(extras)?.let { info ->
      try {
        info.loadLabel(context.packageManager).toString().trim()
      } catch (_: Exception) {
        ""
      }
    }
    if (!fromExtras.isNullOrEmpty()) return fromExtras
    try {
      val info = context.packageManager.getApplicationInfo(packageName, 0)
      val loaded = info.loadLabel(context.packageManager).toString().trim()
      if (loaded.isNotEmpty()) return loaded
    } catch (_: Exception) {
    }
    return packageName
  }

  private fun matches(source: String, ignoreCase: Boolean, text: String): Boolean {
    if (compiledKey != source || compiledIgnoreCase != ignoreCase) {
      compiledKey = source
      compiledIgnoreCase = ignoreCase
      compiled = try {
        val flags = if (ignoreCase) Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE else 0
        Pattern.compile(source, flags)
      } catch (_: Exception) {
        null
      }
    }
    return compiled?.matcher(text)?.find() == true
  }

  private data class Sender(val packageName: String, val label: String, val text: String, val at: Long)

  private fun readSenders(raw: String?): List<Sender> {
    if (raw.isNullOrEmpty()) return emptyList()
    return try {
      val array = JSONArray(raw)
      buildList {
        for (index in 0 until array.length()) {
          val item = array.optJSONObject(index) ?: continue
          val packageName = item.optString("packageName")
          if (packageName.isEmpty()) continue
          add(
            Sender(
              packageName,
              item.optString("label", packageName),
              item.optString("text"),
              item.optLong("at"),
            )
          )
        }
      }
    } catch (_: Exception) {
      emptyList()
    }
  }

  private fun remember(
    preferences: SharedPreferences,
    packageName: String,
    label: String,
    text: String,
    at: Long,
  ) {
    val next = JSONArray()
    val seen = mutableSetOf<String>()
    fun add(name: String, appLabel: String, body: String, postedAt: Long) {
      if (!seen.add(name) || next.length() >= SENDER_LIMIT) return
      next.put(
        JSONObject()
          .put("packageName", name)
          .put("label", appLabel)
          .put("text", body.take(SENDER_TEXT_CAP))
          .put("at", postedAt)
      )
    }
    add(packageName, label, text, at)
    for (sender in readSenders(preferences.getString(KEY_SENDERS, null))) {
      add(sender.packageName, sender.label, sender.text, sender.at)
    }
    preferences.edit().putString(KEY_SENDERS, next.toString()).apply()
  }

  private fun dedupeKey(text: String): String {
    val collapsed = text.lowercase().trim().split(WHITESPACE).joinToString(" ")
    return "notification:expense:$collapsed"
  }

  private fun line(label: String, text: String, postedAt: Long): String {
    return JSONObject()
      .put("id", UUID.randomUUID().toString())
      .put("amount", 0)
      .put("income", false)
      .put("note", "")
      .put("category", JSONObject.NULL)
      .put("categoryId", JSONObject.NULL)
      .put("date", postedAt)
      .put("amountText", JSONObject.NULL)
      .put("card", label)
      .put("currency", JSONObject.NULL)
      .put("dedupeKey", dedupeKey(text))
      .put("text", text)
      .toString() + "\n"
  }

  private fun append(context: Context, line: String) {
    val directory = File(context.applicationContext.filesDir, QUEUE_DIRECTORY)
    if (!directory.isDirectory && !directory.mkdirs() && !directory.isDirectory) return
    FileOutputStream(File(directory, QUEUE_FILE), true).use { output ->
      output.write(line.toByteArray(Charsets.UTF_8))
    }
  }
}
