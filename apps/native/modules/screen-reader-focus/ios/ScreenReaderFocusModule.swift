import ExpoModulesCore
import UIKit

public class ScreenReaderFocusModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ScreenReaderFocus")

    View(ScreenReaderFocusView.self) {
      Events("onFocusChange")
    }
  }
}

public final class ScreenReaderFocusView: ExpoView {
  let onFocusChange = EventDispatcher()
  private var holdsFocus = false

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(elementFocused(_:)),
      name: UIAccessibility.elementFocusedNotification,
      object: nil
    )
  }

  @objc private func elementFocused(_ notification: Notification) {
    let element = notification.userInfo?[UIAccessibility.focusedElementUserInfoKey] as? UIView
    let inside = element?.isDescendant(of: self) ?? false
    guard inside != holdsFocus else { return }
    holdsFocus = inside
    onFocusChange(["focused": inside])
  }
}
