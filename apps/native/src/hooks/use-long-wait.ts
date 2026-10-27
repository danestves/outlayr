import { useAtomValue } from "@effect/atom-react/Hooks";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import { useId } from "react";

export const LONG_WAIT_MS = 2000;

const idleAtom = Atom.make(Effect.succeed(false)).pipe(Atom.withLabel("long-wait:idle"));

const longWaitAtom = Atom.family((_instance: string) =>
    Atom.make(Effect.sleep(LONG_WAIT_MS).pipe(Effect.as(true))).pipe(Atom.withLabel("long-wait:elapsed"))
);

export function useLongWait(waiting: boolean): boolean {
    const instance = useId();
    const elapsed = useAtomValue(waiting ? longWaitAtom(instance) : idleAtom);
    return waiting && AsyncResult.isSuccess(elapsed) && elapsed.value;
}
