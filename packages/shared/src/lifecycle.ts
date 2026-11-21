import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export type Cleanup = () => void;
type Start = () => Cleanup | undefined;

export interface Timers {
    after: (delayMs: number, run: () => void) => Cleanup;
    frame: (run: (time: number) => void) => Cleanup;
    clear: () => void;
}

const NO_KEYS: readonly unknown[] = [];

export function useOnMount(start: Start): void {
    const run = useEffectEvent(start);
    useEffect(() => run(), []);
}

export function useOnUnmount(stop: Cleanup): void {
    const run = useEffectEvent(stop);
    useEffect(() => () => run(), []);
}

export function useWhen(condition: boolean, start: Start): void {
    const run = useEffectEvent(start);
    useEffect(() => (condition ? run() : undefined), [condition]);
}

export function useMirror<const Values extends readonly unknown[]>(
    values: Values,
    write: (values: Values) => Cleanup | undefined
): void {
    const run = useEffectEvent(write);
    useEffect(() => run(values), values);
}

export function useLayoutMirror<const Values extends readonly unknown[]>(
    values: Values,
    write: (values: Values) => Cleanup | undefined
): void {
    const run = useEffectEvent(write);
    useLayoutEffect(() => run(values), values);
}

export function useOnChange<const Values extends readonly unknown[]>(
    values: Values,
    react: (next: Values, previous: Values) => Cleanup | undefined
): void {
    const seen = useRef<Values | undefined>(undefined);
    const run = useEffectEvent(react);
    useEffect(() => {
        const previous = seen.current;
        seen.current = values;
        // Nothing seen yet is a mount; the same values again is StrictMode replaying it.
        if (previous === undefined || previous.every((value, index) => Object.is(value, values[index]))) {
            return undefined;
        }
        return run(values, previous);
    }, values);
}

export function useEventListener<Args extends unknown[], Result>(
    subscribe: (listener: (...args: Args) => Result, keys: readonly unknown[]) => Cleanup,
    listener: (...args: Args) => Result,
    keys: readonly unknown[] = NO_KEYS
): void {
    const latest = useLatest(listener);
    const start = useEffectEvent(() => subscribe((...args) => latest.current(...args), keys));
    useEffect(() => start(), keys);
}

function createTimers(): Timers {
    const pending = new Set<Cleanup>();
    const track = (cancel: Cleanup): Cleanup => {
        const stop = () => {
            pending.delete(stop);
            cancel();
        };
        pending.add(stop);
        return stop;
    };
    return {
        after: (delayMs, run) => {
            const stop = track(() => clearTimeout(timer));
            const timer = setTimeout(() => {
                pending.delete(stop);
                run();
            }, delayMs);
            return stop;
        },
        clear: () => {
            for (const stop of pending) {
                stop();
            }
        },
        frame: (run) => {
            const stop = track(() => cancelAnimationFrame(handle));
            const handle = requestAnimationFrame((time) => {
                pending.delete(stop);
                run(time);
            });
            return stop;
        },
    };
}

export function useTimers(): Timers {
    const [timers] = useState(createTimers);
    useEffect(() => () => timers.clear(), [timers]);
    return timers;
}

// Published before paint, so a handler that fires between commit and passive effects reads this render.
export function useLatest<Value>(value: Value): RefObject<Value> {
    const latest = useRef(value);
    useLayoutEffect(() => {
        latest.current = value;
    });
    return latest;
}
