import { useEffect, useEffectEvent } from "react";

export function useTimeout<Token>(callback: () => void, delayMs: number | null, restartOn: Token) {
    const fire = useEffectEvent(callback);
    // oxlint-disable-next-line outlayr/react-effect-budget -- a browser timer that must be cleared when the delay changes or the component unmounts
    useEffect(() => {
        if (delayMs === null) {
            return;
        }
        const timer = window.setTimeout(fire, delayMs);
        return () => window.clearTimeout(timer);
        // oxlint-disable-next-line react/exhaustive-effect-dependencies -- restartOn only restarts the delay, the effect never reads it
    }, [delayMs, restartOn]);
}
