import type { IconSvgElement } from "@hugeicons/react-native";
import type { ReactNode } from "react";

export interface SheetHeaderProps {
    title?: string;
    /** Defaults to `router.back()`, which a discard guard still sees. */
    onClose?: () => void;
    children?: ReactNode;
}

export interface SheetHeaderTextButtonProps {
    label: string;
    onPress: () => void;
    disabled?: boolean;
}

export interface SheetHeaderIconButtonProps {
    icon: IconSvgElement;
    accessibilityLabel: string;
    onPress: () => void;
    disabled?: boolean;
    destructive?: boolean;
}

// Android only: react-native-screens builds no app bar for a form sheet there, so its title, close and
// `Stack.Toolbar` items vanish. iOS keeps its native bar, so this renders nothing.
export function SheetHeader(_props: SheetHeaderProps) {
    return null;
}

export function SheetHeaderTextButton(_props: SheetHeaderTextButtonProps) {
    return null;
}

export function SheetHeaderIconButton(_props: SheetHeaderIconButtonProps) {
    return null;
}
