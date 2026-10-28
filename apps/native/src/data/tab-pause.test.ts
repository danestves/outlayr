import { describe, expect, it, vi } from "vite-plus/test";

import { createTabPause } from "./tab-pause";

function createStore() {
    const listeners = new Set<() => void>();
    return {
        emit: () => {
            for (const listener of listeners) {
                listener();
            }
        },
        subscribe: (onChange: () => void) => {
            listeners.add(onChange);
            return () => {
                listeners.delete(onChange);
            };
        },
    };
}

describe("createTabPause", () => {
    it("holds a background tab's notifications and replays them when it is selected again", () => {
        const pause = createTabPause();
        const store = createStore();
        const onChange = vi.fn();
        pause.subscribe(store.subscribe, onChange);

        store.emit();
        expect(onChange).toHaveBeenCalledOnce();

        pause.setSelected(false);
        store.emit();
        store.emit();
        expect(onChange).toHaveBeenCalledOnce();

        pause.setSelected(true);
        expect(onChange).toHaveBeenCalledTimes(2);
    });
});
