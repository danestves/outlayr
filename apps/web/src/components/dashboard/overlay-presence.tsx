import { createContext, use, useEffect, useState } from "react";
import type { ReactNode } from "react";

// panelui-web's Dialog does not expose Base UI's onOpenChangeComplete, so this outlasts its 200ms transition.
const EXIT_MS = 240;

const OverlayOpenContext = createContext(true);

export const useOverlayOpen = () => use(OverlayOpenContext);

/**
 * Mounts a dialog from a value, for dialogs whose state should not outlive one opening.
 * Base UI only animates a change of `open`, so the dialog mounts closed, opens, and stays mounted through its exit.
 */
export function OverlayPresence<T>({ children, value }: { children: (value: T) => ReactNode; value: T | null }) {
    const [held, setHeld] = useState(value);
    const [entered, setEntered] = useState(false);
    const present = value !== null;
    if (value !== null && value !== held) {
        setHeld(value);
        setEntered(false);
    }
    // oxlint-disable-next-line outlayr/react-effect-budget -- frames and timers are external systems.
    useEffect(() => {
        if (present) {
            if (entered) {
                return;
            }
            const frame = requestAnimationFrame(() => setEntered(true));
            return () => cancelAnimationFrame(frame);
        }
        const timer = setTimeout(() => {
            setEntered(false);
            setHeld(null);
        }, EXIT_MS);
        return () => clearTimeout(timer);
    }, [entered, present]);
    if (held === null) {
        return null;
    }
    return <OverlayOpenContext value={present && entered}>{children(held)}</OverlayOpenContext>;
}
