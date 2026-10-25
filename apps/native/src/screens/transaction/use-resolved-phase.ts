import { useState } from "react";

export function useResolvedPhase<Phase, Resolved>(phase: Phase, resolve: (next: Phase) => Resolved): Resolved {
    const [held, setHeld] = useState(() => ({ phase, resolved: resolve(phase) }));
    const current = held.phase === phase ? held : { phase, resolved: resolve(phase) };
    if (current !== held) {
        setHeld(current);
    }
    return current.resolved;
}
