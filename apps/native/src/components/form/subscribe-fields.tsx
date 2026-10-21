import { useSelector } from "@tanstack/react-form";
import type { ReactNode } from "react";

import { shallowEqual } from "./shallow-equal";

interface Subscribable<TState> {
    get: () => TState;
    subscribe: (listener: (value: TState) => void) => { unsubscribe: () => void };
}

interface SubscribeFieldsProps<TState, TSelected> {
    children: (selected: TSelected) => ReactNode;
    selector: (state: TState) => TSelected;
    store: Subscribable<TState>;
}

// `form.Subscribe` compares with `===`, so an object or tuple selector re-renders on every store write.
// Prefer plain `form.Subscribe` when a single primitive will do.
export function SubscribeFields<TState, TSelected>({
    store,
    selector,
    children,
}: SubscribeFieldsProps<TState, TSelected>) {
    const selected = useSelector(store, selector, { compare: shallowEqual });
    return <>{children(selected)}</>;
}
