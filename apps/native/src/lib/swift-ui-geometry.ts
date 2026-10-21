/* oxlint-disable anti-slop/no-shape-in-symbol-names -- SwiftUI's own names for this API are `contentShape` and `shapes`; they are an imported surface and cannot be renamed at the source, so this module is the one file in the tree that writes them */

/**
 * `hitArea` is the region a control hit-tests, not the one it draws. A `.plain` Button hit-tests only its glyphs,
 * so a row without it has a dead `Spacer` gap mid-row that swallows taps.
 */
export { contentShape as hitArea, shapes as outline } from "@expo/ui/swift-ui/modifiers";
