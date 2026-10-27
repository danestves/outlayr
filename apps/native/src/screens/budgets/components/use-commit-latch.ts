import { useRef } from "react";

/**
 * Guards a sheet's write in flight: `mainBudget` has no singleton constraint, so a double tap would insert two.
 * Released when the write settles rather than latched, so the inline first-run takeover can retry after a failure.
 */
export function useCommitLatch() {
    const held = useRef(false);
    return {
        hold: () => {
            if (held.current) {
                return false;
            }
            held.current = true;
            return true;
        },
        release: () => {
            held.current = false;
        },
    };
}
