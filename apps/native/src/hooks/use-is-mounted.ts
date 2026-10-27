import { useEffect, useRef } from "react";

// For work that outlives a modal screen: navigating from an unmounted screen pops the one underneath instead.
export function useIsMounted(): () => boolean {
    const mounted = useRef(true);
    useEffect(
        () => () => {
            mounted.current = false;
        },
        []
    );
    return () => mounted.current;
}
