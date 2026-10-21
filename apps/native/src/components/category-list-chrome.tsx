import { Text as SwiftText } from "@expo/ui/swift-ui";
import { font, foregroundStyle, kerning, textCase } from "@expo/ui/swift-ui/modifiers";

import type { ThemeColors } from "@/theme/use-colors";

// Exports the same names as the Android sibling; the SwiftUI row-name type lives in `category-list-swift.ts`.

export const PARENT_TILE = 34;
export const CHILD_TILE = 28;

// `family` is the PostScript name `Font.custom` resolves through CoreText: the expo-font alias only works on RN's own
// lookup path. `textStyle` opts the custom font into Dynamic Type.
const EYEBROW_FONT = font({
    family: "GeistMono-Regular",
    size: 11,
    textStyle: "caption2",
});

// `textCase` lives here because one header is a user-entered category name. This is the SwiftUI twin of `MonoLabel`
// (11pt, 1.2 tracking, muted): restyle both or neither.
export function Eyebrow({ colors, children }: { colors: ThemeColors; children: string }) {
    return (
        <SwiftText modifiers={[EYEBROW_FONT, kerning(1.2), textCase("uppercase"), foregroundStyle(colors.muted)]}>
            {children}
        </SwiftText>
    );
}
