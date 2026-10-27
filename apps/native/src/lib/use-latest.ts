import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export function useLatest<Value>(value: Value): RefObject<Value> {
    const latest = useRef(value);
    // oxlint-disable-next-line outlayr/react-effect-budget -- publishes the latest committed value to timers and async continuations that read it after their render ended
    useEffect(() => {
        latest.current = value;
    });
    return latest;
}
