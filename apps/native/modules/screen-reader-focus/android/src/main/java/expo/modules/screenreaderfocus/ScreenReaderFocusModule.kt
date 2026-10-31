package expo.modules.screenreaderfocus

import android.content.Context
import android.view.View
import android.view.accessibility.AccessibilityEvent
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

class ScreenReaderFocusModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ScreenReaderFocus")

    View(ScreenReaderFocusView::class) {
      Events("onFocusChange")
    }
  }
}

class ScreenReaderFocusView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onFocusChange by EventDispatcher()

  override fun onRequestSendAccessibilityEvent(child: View, event: AccessibilityEvent): Boolean {
    when (event.eventType) {
      AccessibilityEvent.TYPE_VIEW_ACCESSIBILITY_FOCUSED -> onFocusChange(mapOf("focused" to true))
      AccessibilityEvent.TYPE_VIEW_ACCESSIBILITY_FOCUS_CLEARED -> onFocusChange(mapOf("focused" to false))
    }
    return super.onRequestSendAccessibilityEvent(child, event)
  }
}
