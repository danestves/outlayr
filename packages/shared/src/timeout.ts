import { useLatest, useMirror, useTimers } from "./lifecycle";

export function useTimeout<Token>(callback: () => void, delayMs: number | null, restartOn: Token) {
    const latest = useLatest(callback);
    const timers = useTimers();
    useMirror([delayMs, restartOn], ([delay]) => {
        if (delay === null) {
            return undefined;
        }
        timers.after(delay, () => latest.current());
        return () => timers.clear();
    });
}
