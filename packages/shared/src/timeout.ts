import { useLatest, useMirror } from "./lifecycle";

export function useTimeout<Token>(callback: () => void, delayMs: number | null, restartOn: Token) {
    const latest = useLatest(callback);
    useMirror([delayMs, restartOn], ([delay]) => {
        if (delay === null) {
            return undefined;
        }
        const timer = window.setTimeout(() => latest.current(), delay);
        return () => window.clearTimeout(timer);
    });
}
