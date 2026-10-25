import ExpoModulesCore
import QuickLook

public class FilePreviewModule: Module {
  private var source: PreviewSource?

  public func definition() -> ModuleDefinition {
    Name("FilePreview")

    AsyncFunction("open") { (uris: [String], titles: [String], index: Int) in
      guard let presenter = appContext?.utilities?.currentViewController() else {
        throw MissingViewControllerException()
      }
      let items = zip(uris, titles).compactMap { uri, title in
        URL(string: uri).map { PreviewItem(url: $0, title: title) }
      }
      guard !items.isEmpty else {
        return
      }
      let source = PreviewSource(items: items)
      self.source = source
      let controller = QLPreviewController()
      controller.dataSource = source
      controller.delegate = source
      controller.currentPreviewItemIndex = min(max(index, 0), items.count - 1)
      presenter.present(controller, animated: true)
    }.runOnQueue(.main)
  }
}

private final class MissingViewControllerException: Exception, @unchecked Sendable {
  override var reason: String {
    "No view controller to present the preview from"
  }
}

private final class PreviewItem: NSObject, QLPreviewItem {
  let previewItemURL: URL?
  let previewItemTitle: String?

  init(url: URL, title: String) {
    previewItemURL = url
    previewItemTitle = title.isEmpty ? nil : title
  }
}

private final class PreviewSource: NSObject, QLPreviewControllerDataSource, QLPreviewControllerDelegate {
  let items: [PreviewItem]

  init(items: [PreviewItem]) {
    self.items = items
  }

  func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
    items.count
  }

  func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
    items[index]
  }

  func previewController(
    _ controller: QLPreviewController,
    editingModeFor previewItem: QLPreviewItem
  ) -> QLPreviewItemEditingMode {
    .disabled
  }
}
