import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

// The `Will` events, so the stage moves with the keyboard rather than after it. iOS only: Android never sends them.
export function useKeyboardShown(): boolean {
    const [shown, setShown] = useState(false);
    useEffect(() => {
        const show = Keyboard.addListener("keyboardWillShow", () => setShown(true));
        const hide = Keyboard.addListener("keyboardWillHide", () => setShown(false));
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);
    return shown;
}
