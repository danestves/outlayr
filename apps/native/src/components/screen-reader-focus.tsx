import { requireNativeView, requireOptionalNativeModule } from "expo";
import type { ReactNode } from "react";
import type { NativeSyntheticEvent } from "react-native";

interface NativeProps {
    children: ReactNode;
    onFocusChange: (event: NativeSyntheticEvent<{ focused: boolean }>) => void;
}

const Native = requireOptionalNativeModule("ScreenReaderFocus")
    ? requireNativeView<NativeProps>("ScreenReaderFocus")
    : null;

interface ScreenReaderFocusProps {
    children: ReactNode;
    onFocusChange: (focused: boolean) => void;
}

export function ScreenReaderFocus({ children, onFocusChange }: ScreenReaderFocusProps) {
    if (!Native) {
        return children;
    }
    return <Native onFocusChange={(event) => onFocusChange(event.nativeEvent.focused)}>{children}</Native>;
}
