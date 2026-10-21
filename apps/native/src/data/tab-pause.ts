import { createContext, use, useCallback } from "react";

export type StoreSubscribe = (onChange: () => void) => () => void;

/**
 * Holds a background tab's store notifications and replays each listener once on reselect, so the tab catches
 * up in one render instead of rendering on every write.
 */
export function createTabPause() {
    let selected = true;
    const held = new Set<() => void>();

    return {
        setSelected(next: boolean): void {
            selected = next;
            if (!selected) {
                return;
            }
            const replay = [...held];
            held.clear();
            for (const onChange of replay) {
                onChange();
            }
        },
        subscribe(source: StoreSubscribe, onChange: () => void): () => void {
            const off = source(() => {
                if (selected) {
                    onChange();
                } else {
                    held.add(onChange);
                }
            });
            return () => {
                off();
                held.delete(onChange);
            };
        },
    };
}

export type TabPause = ReturnType<typeof createTabPause>;

export const TabPauseContext = createContext<TabPause | null>(null);

export function useTabPaused(subscribe: StoreSubscribe): StoreSubscribe {
    const pause = use(TabPauseContext);
    return useCallback(
        (onChange: () => void) => (pause === null ? subscribe(onChange) : pause.subscribe(subscribe, onChange)),
        [pause, subscribe]
    );
}
