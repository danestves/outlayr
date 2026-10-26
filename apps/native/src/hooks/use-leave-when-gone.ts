import { useEffect, useEffectEvent } from "react";

export function useLeaveWhenGone(gone: boolean, leave: () => void): void {
    const onGone = useEffectEvent(leave);

    // oxlint-disable-next-line outlayr/react-effect-budget -- pops the navigation stack once the record the screen shows is gone
    useEffect(() => {
        if (gone) {
            onGone();
        }
    }, [gone]);
}
