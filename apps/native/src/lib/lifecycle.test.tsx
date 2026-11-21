// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { useEventListener, useMirror, useOnChange, useTimers, useWhen } from "./lifecycle";

const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

afterEach(() => {
    vi.useRealTimers();
});

describe("useOnChange", () => {
    it("skips the mount, even replayed, and reports each real change with the previous values", () => {
        const seen: [number, number][] = [];
        const { rerender } = renderHook(
            ({ value }) => {
                useOnChange([value], ([next], [previous]) => {
                    seen.push([previous, next]);
                    return undefined;
                });
            },
            { initialProps: { value: 1 }, wrapper: strict }
        );
        rerender({ value: 1 });
        rerender({ value: 2 });
        rerender({ value: 2 });
        rerender({ value: 3 });
        expect(seen).toStrictEqual([
            [1, 2],
            [2, 3],
        ]);
    });
});

describe("useMirror", () => {
    it("writes on mount and on change only, releasing the previous write first", () => {
        const log: string[] = [];
        const { rerender, unmount } = renderHook(
            ({ value }) => {
                useMirror([value], ([current]) => {
                    log.push(`write ${current}`);
                    return () => log.push(`release ${current}`);
                });
            },
            { initialProps: { value: "a" } }
        );
        rerender({ value: "a" });
        rerender({ value: "b" });
        unmount();
        expect(log).toStrictEqual(["write a", "release a", "write b", "release b"]);
    });

    it("releases every previous write before any new one, so two mirrors can hand one resource over", () => {
        const log: string[] = [];
        const write = (value: string) => {
            log.push(`write ${value}`);
            return () => log.push(`release ${value}`);
        };
        const { rerender } = renderHook(
            ({ first, second }) => {
                useMirror([first], ([value]) => write(value));
                useMirror([second], ([value]) => write(value));
            },
            { initialProps: { first: "a1", second: "b1" } }
        );
        log.length = 0;
        rerender({ first: "a2", second: "b2" });
        expect(log).toStrictEqual(["release a1", "release b1", "write a2", "write b2"]);
    });

    it("re-runs a value that is new every render, as a dependency would, instead of looping", () => {
        let writes = 0;
        const { rerender } = renderHook(() => {
            useMirror([{}], () => {
                writes += 1;
                return undefined;
            });
        });
        rerender();
        expect(writes).toBe(2);
    });
});

describe("useWhen", () => {
    it("starts each time the condition turns true and stops when it turns false", () => {
        const log: string[] = [];
        const { rerender } = renderHook(
            ({ open }) => {
                useWhen(open, () => {
                    log.push("start");
                    return () => log.push("stop");
                });
            },
            { initialProps: { open: false } }
        );
        rerender({ open: true });
        rerender({ open: true });
        rerender({ open: false });
        rerender({ open: true });
        expect(log).toStrictEqual(["start", "stop", "start"]);
    });
});

describe("useEventListener", () => {
    it("keeps one subscription across renders, calls the latest listener and resubscribes on a key change", () => {
        const listeners = new Set<(value: number) => void>();
        let subscribed = 0;
        const received: string[] = [];
        const { rerender, unmount } = renderHook(
            ({ channel, label }) => {
                useEventListener(
                    (listener: (value: number) => void) => {
                        subscribed += 1;
                        listeners.add(listener);
                        return () => listeners.delete(listener);
                    },
                    (value) => received.push(`${label}:${value}`),
                    [channel]
                );
            },
            { initialProps: { channel: "one", label: "first" } }
        );
        rerender({ channel: "one", label: "second" });
        for (const listener of listeners) {
            listener(1);
        }
        rerender({ channel: "two", label: "second" });
        expect(subscribed).toBe(2);
        expect(listeners.size).toBe(1);
        unmount();
        expect(received).toStrictEqual(["second:1"]);
        expect(listeners.size).toBe(0);
    });
});

describe("useTimers", () => {
    it("drops pending timers when the component unmounts", () => {
        vi.useFakeTimers();
        const fired: string[] = [];
        const { result, unmount } = renderHook(() => useTimers());
        result.current.after(100, () => fired.push("kept"));
        const cancel = result.current.after(100, () => fired.push("cancelled"));
        cancel();
        vi.advanceTimersByTime(100);
        result.current.after(100, () => fired.push("after unmount"));
        unmount();
        vi.advanceTimersByTime(100);
        expect(fired).toStrictEqual(["kept"]);
    });
});
