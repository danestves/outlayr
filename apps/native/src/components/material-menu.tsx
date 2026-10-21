import type { MenuAction } from "@expo/ui/community/menu";
import type { ReactNode } from "react";
import type { AccessibilityValue } from "react-native";

interface MaterialMenuBaseProps {
    accessibilityLabel?: string;
    accessibilityValue?: AccessibilityValue;
    actions: readonly MenuAction[];
    onPressAction: (id: string) => void;
}

// A trigger under 48dp should use `renderTrigger`: its touch area grows past what it draws, and the ripple
// `children` get would fill all of it.
export type MaterialMenuProps = MaterialMenuBaseProps &
    (
        | { children: ReactNode; renderTrigger?: never }
        | { children?: never; renderTrigger: (state: { pressed: boolean }) => ReactNode }
    );

// Android only; iOS keeps `@expo/ui`'s `MenuView`.
export function MaterialMenu(_props: MaterialMenuProps): never {
    throw new Error("MaterialMenu is Android-only. Render it from a .android.tsx sibling.");
}
