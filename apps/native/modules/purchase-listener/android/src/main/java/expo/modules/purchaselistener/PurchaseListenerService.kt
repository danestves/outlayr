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
import expo.modules.notifications.notifications.model.NotificationContent
import expo.modules.notifications.notifications.model.NotificationRequest
import expo.modules.notifications.notifications.triggers.ChannelAwareTrigger
import expo.modules.notifications.service.NotificationsService
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest
import java.text.Normalizer
import java.util.UUID
import java.util.regex.Pattern
import expo.modules.notifications.notifications.model.Notification as ExpoNotification

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
  private const val KEY_PUSHED = "pushed"
  private const val KEY_SENDERS = "senders"
  private const val KEY_SNAPSHOT = "snapshot"
  private const val PUSH_CHANNEL = "purchases"
  private const val PUSH_WINDOW_MS = 10 * 60 * 1000L
  private const val QUEUE_DIRECTORY = "pending-writes"
  private const val QUEUE_FILE = "queue.jsonl"
  private const val SENDER_LIMIT = 20
  private const val SENDER_TEXT_CAP = 200
  private const val WALLET = "com.google.android.apps.walletnfcrel"
  private val WHITESPACE = Regex("\\s+")
  private val SPACES = Regex("[\\s\\u00a0\\u202f]+")
  private val DEFAULT_APPS = setOf(WALLET)

  private val lock = Any()
  private var snapshotKey: String? = null
  private var snapshot: Snapshot? = null

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

  fun setSnapshot(context: Context, json: String) {
    synchronized(lock) {
      prefs(context).edit().putString(KEY_SNAPSHOT, json).apply()
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
      val current = snapshot(preferences)
      val money = current?.pattern("money")
      val matched = money?.matcher(text)?.find() == true
      if (matched) {
        remember(preferences, sbn.packageName, label, text, sbn.postTime)
      }
      val allowed = preferences.getStringSet(KEY_APPS, DEFAULT_APPS)?.contains(sbn.packageName) == true
      if (!allowed || !(matched || money == null)) return
      val card = (if (sbn.packageName == WALLET) current?.group("cardUsed", text) else null)
        ?.replace(SPACES, " ")
        ?.trim()
        ?.takeIf { it.isNotEmpty() }
        ?: label
      val id = UUID.randomUUID().toString()
      val key = dedupeKey(text)
      append(context, line(id, card, text, key, sbn.postTime))
      if (current != null) {
        confirm(context, preferences, current, id, card, text, key)
      }
    }
  }

  private fun confirm(
    context: Context,
    preferences: SharedPreferences,
    snapshot: Snapshot,
    id: String,
    card: String,
    text: String,
    key: String,
  ) {
    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    if (!manager.areNotificationsEnabled()) return
    val purchase = read(snapshot, text) ?: return
    if (!claim(preferences, key)) return
    val known = snapshot.cards.optJSONObject(card)
    val cardLabel = if (known == null) card else known.optString("label").takeIf { !known.isNull("label") && it.isNotEmpty() }
    val pickCard = known?.optBoolean("pick") == true
    val merchant = purchase.merchant.orEmpty()
    val amount = if (purchase.income) "+${purchase.amountText}" else purchase.amountText
    val places = snapshot.places.optJSONObject(if (purchase.income) "income" else "expense")
    val category = if (merchant.isEmpty()) null else places?.optString(placeKey(merchant))?.takeIf { it.isNotEmpty() }
    val newPlace = snapshot.newPlace.takeIf { merchant.isNotEmpty() && category == null && !pickCard && it.isNotEmpty() }
    val content = NotificationContent.Builder()
      .setTitle(if (merchant.isEmpty()) amount else "$amount · $merchant")
      .setText(listOfNotNull(category, cardLabel, newPlace).joinToString(" · "))
      .setBody(JSONObject().put("walletWrite", id).put("pickCard", pickCard).put("card", card))
      .setAutoDismiss(true)
      .build()
    val request = NotificationRequest(UUID.randomUUID().toString(), content, ChannelAwareTrigger(PUSH_CHANNEL))
    NotificationsService.present(context, ExpoNotification(request))
  }

  private class Purchase(val amountText: String, val income: Boolean, val merchant: String?)

  private fun read(snapshot: Snapshot, text: String): Purchase? {
    val money = snapshot.pattern("money")?.matcher(text) ?: return null
    if (!money.find() || snapshot.found("declined", text)) return null
    val amountText = money.group().trim()
    if (amountText.none { it in '1'..'9' }) return null
    val income = snapshot.found("incoming", text)
    val tail = text.substring(money.end())
    val named = snapshot.group(if (income) "receivedFrom" else "paidTo", tail)?.trim()?.takeIf { it.isNotEmpty() }
    val raw = when {
      named == null -> lineBefore(snapshot, text.substring(0, money.start()))
      snapshot.found("cardReference", named) -> snapshot.group("parenthesized", tail)
      else -> named
    }
    val head = raw?.substringBefore(",")
    val merchant = head?.let { snapshot.pattern("posPrefix")?.matcher(it)?.replaceFirst("") ?: it }
    return Purchase(amountText, income, merchant?.trim()?.takeIf { it.isNotEmpty() })
  }

  private fun lineBefore(snapshot: Snapshot, above: String): String? {
    val lines = above.split("\n")
    if (lines.size < 2 || lines.last().isNotBlank()) return null
    val line = lines[lines.size - 2].trim()
    return if (line.isEmpty() || snapshot.found("afterNumber", line)) null else line
  }

  private fun placeKey(merchant: String): String {
    val folded = merchant.map { if (it.code < 128) it.lowercaseChar() else it }.joinToString("")
    return Normalizer.normalize(folded, Normalizer.Form.NFC)
  }

  private fun claim(preferences: SharedPreferences, key: String): Boolean {
    val now = System.currentTimeMillis()
    val digest = MessageDigest.getInstance("SHA-256")
      .digest(key.toByteArray(Charsets.UTF_8))
      .joinToString("") { "%02x".format(it) }
    val pushed = try {
      JSONObject(preferences.getString(KEY_PUSHED, null) ?: "{}")
    } catch (_: Exception) {
      JSONObject()
    }
    val recent = JSONObject()
    for (name in pushed.keys()) {
      val at = pushed.optLong(name)
      if (now - at in 0..PUSH_WINDOW_MS) recent.put(name, at)
    }
    if (recent.has(digest)) return false
    recent.put(digest, now)
    preferences.edit().putString(KEY_PUSHED, recent.toString()).apply()
    return true
  }

  private fun snapshot(preferences: SharedPreferences): Snapshot? {
    val raw = preferences.getString(KEY_SNAPSHOT, null)
    if (raw != snapshotKey) {
      snapshotKey = raw
      snapshot = raw?.let {
        try {
          Snapshot(JSONObject(it))
        } catch (_: Exception) {
          null
        }
      }
    }
    return snapshot
  }

  private class Snapshot(json: JSONObject) {
    val cards: JSONObject = json.optJSONObject("cards") ?: JSONObject()
    val newPlace: String = json.optString("newPlace")
    val places: JSONObject = json.optJSONObject("places") ?: JSONObject()
    private val patterns = json.optJSONObject("patterns")
    private val compiled = mutableMapOf<String, Pattern?>()

    fun pattern(name: String): Pattern? = compiled.getOrPut(name) {
      val item = patterns?.optJSONObject(name) ?: return@getOrPut null
      try {
        val flags = if (item.optBoolean("ignoreCase")) Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE else 0
        Pattern.compile(item.getString("source"), flags)
      } catch (_: Exception) {
        null
      }
    }

    fun found(name: String, text: String): Boolean = pattern(name)?.matcher(text)?.find() == true

    fun group(name: String, text: String): String? {
      val matcher = pattern(name)?.matcher(text) ?: return null
      return if (matcher.find() && matcher.groupCount() >= 1) matcher.group(1) else null
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

  private fun line(id: String, card: String, text: String, key: String, postedAt: Long): String {
    return JSONObject()
      .put("id", id)
      .put("amount", 0)
      .put("income", false)
      .put("note", "")
      .put("category", JSONObject.NULL)
      .put("categoryId", JSONObject.NULL)
      .put("date", postedAt)
      .put("amountText", JSONObject.NULL)
      .put("card", card)
      .put("currency", JSONObject.NULL)
      .put("dedupeKey", key)
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
