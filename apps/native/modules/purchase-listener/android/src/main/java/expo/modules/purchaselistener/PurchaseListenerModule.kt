package expo.modules.purchaselistener

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PurchaseListenerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PurchaseListener")

    Function("isEnabled") {
      val context = appContext.reactContext
      if (context == null) false else PurchaseListenerStore.isEnabled(context)
    }

    Function("openSettings") {
      val context = appContext.currentActivity ?: appContext.reactContext
      if (context != null) {
        PurchaseListenerStore.openSettings(context)
      }
    }

    Function("apps") {
      val context = appContext.reactContext
      if (context == null) emptyList() else PurchaseListenerStore.apps(context)
    }

    Function("setApps") { packages: List<String> ->
      val context = appContext.reactContext
      if (context != null) {
        PurchaseListenerStore.setApps(context, packages)
      }
    }

    Function("setSnapshot") { json: String ->
      val context = appContext.reactContext
      if (context != null) {
        PurchaseListenerStore.setSnapshot(context, json)
      }
    }

    Function("senders") {
      val context = appContext.reactContext
      if (context == null) emptyList() else PurchaseListenerStore.senders(context)
    }
  }
}
