import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

import type { useKeyboardShown as useKeyboardShownBase } from "./use-keyboard-shown";

// Android sends only the `Did` events, so the stage and CTA follow the keyboard once it has settled.
export const useKeyboardShown: typeof useKeyboardShownBase = () => {
    const [shown, setShown] = useState(() => Keyboard.isVisible());
    useEffect(() => {
        const show = Keyboard.addListener("keyboardDidShow", () => setShown(true));
        const hide = Keyboard.addListener("keyboardDidHide", () => setShown(false));
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);
    return shown;
};
