import { useAtomValue } from "@effect/atom-react/Hooks";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import { useState } from "react";

const settledTextAtom = Atom.family((key: { readonly delayMs: number; readonly text: string }) =>
    Atom.make(Effect.sleep(Duration.millis(key.delayMs)).pipe(Effect.as(key.text))).pipe(
        Atom.withLabel("debounced-text:settle")
    )
);

export function useDebouncedText(text: string, delayMs: number): string {
    const settled = useAtomValue(settledTextAtom({ delayMs, text }));
    const [debounced, setDebounced] = useState(text);
    if (AsyncResult.isSuccess(settled) && settled.value !== debounced) {
        setDebounced(settled.value);
    }
    return debounced;
}
