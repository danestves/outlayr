import { background, listRowBackground, listStyle, scrollContentBackground } from "@expo/ui/swift-ui/modifiers";

import type { ThemeColors } from "@/theme/use-colors";

// Hiding the scroll background alone leaves whatever is behind the `Host`, so the ground is named here.
export const groupedList = (colors: ThemeColors) => [
    listStyle("insetGrouped"),
    scrollContentBackground("hidden"),
    background(colors.groupedBackground),
];

/** Goes on a `Section`, not a row. */
export const groupedRows = (colors: ThemeColors) => listRowBackground(colors.surface);
