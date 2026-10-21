import { HeaderHeightContext } from "expo-router/react-navigation";
import { use } from "react";
import type { ReactNode } from "react";
import { KeyboardAvoidingView } from "react-native";

/** Edge-to-edge stops the window resizing for the keyboard; the offset is the app bar the avoiding view sits under. */
export function InlineEditorKeyboard({ children }: { children: ReactNode }) {
    const headerHeight = use(HeaderHeightContext) ?? 0;
    return (
        <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerHeight} style={{ flex: 1 }}>
            {children}
        </KeyboardAvoidingView>
    );
}
