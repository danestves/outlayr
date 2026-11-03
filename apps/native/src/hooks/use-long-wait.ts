import { useAtomValue } from "@effect/atom-react/Hooks";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import { useId, useState } from "react";

export const SHOW_AFTER_MS = 400;
export const SHOW_AT_LEAST_MS = 300;

const idleAtom: Atom.Atom<AsyncResult.AsyncResult<number | null>> = Atom.make(Effect.succeed(null)).pipe(
    Atom.withLabel("long-wait:idle")
);

const showAtom = Atom.family((_instance: string) =>
    Atom.make(Effect.sleep(SHOW_AFTER_MS).pipe(Effect.andThen(Clock.currentTimeMillis))).pipe(
        Atom.withLabel("long-wait:show")
    )
);

const hideAtom = Atom.family((shownAt: number) =>
    Atom.make(
        Clock.currentTimeMillis.pipe(
            Effect.flatMap((now) => Effect.sleep(Math.max(0, shownAt + SHOW_AT_LEAST_MS - now))),
            Effect.as(null)
        )
    ).pipe(Atom.withLabel("long-wait:hide"))
);

export function useLongWait(waiting: boolean): boolean {
    const instance = useId();
    const [shownAt, setShownAt] = useState<number | null>(null);
    let timer: Atom.Atom<AsyncResult.AsyncResult<number | null>> | null = null;
    if (shownAt === null && waiting) {
        timer = showAtom(instance);
    } else if (shownAt !== null && !waiting) {
        timer = hideAtom(shownAt);
    }
    const fired = useAtomValue(timer ?? idleAtom);
    if (timer && AsyncResult.isSuccess(fired) && fired.value !== shownAt) {
        setShownAt(fired.value);
    }
    return shownAt !== null;
}
