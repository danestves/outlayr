import { useCallback } from "react";
import type { Ref, RefObject } from "react";

export function useMergedRef<T>(localRef: RefObject<T | null>, forwardedRef: Ref<T> | undefined) {
    return useCallback(
        (node: T | null) => {
            localRef.current = node;
            if (!forwardedRef) {
                return;
            }
            if ("current" in forwardedRef) {
                forwardedRef.current = node;
            } else {
                forwardedRef(node);
            }
        },
        [localRef, forwardedRef]
    );
}
