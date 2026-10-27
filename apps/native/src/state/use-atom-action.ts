import { RegistryContext } from "@effect/atom-react/RegistryContext";
import type * as Cause from "effect/Cause";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { use } from "react";

import { runAtomCommand } from "./atom-command";
import type { AtomCommand, AtomCommandOptions } from "./atom-command";

export interface AtomActionHandlers<A, E> {
    readonly onFailure?: (cause: Cause.Cause<E>) => void;
    readonly onSettled?: () => void;
    readonly onSuccess?: (value: A) => void;
}

export function fireAtomCommand<W, A, E>(
    registry: AtomRegistry.AtomRegistry,
    command: AtomCommand<W, A, E>,
    input: W,
    handlers: AtomActionHandlers<A, E>,
    options?: AtomCommandOptions
): void {
    void runAtomCommand(registry, command, input, options).then((result) => {
        try {
            if (AsyncResult.isSuccess(result)) {
                handlers.onSuccess?.(result.value);
            } else {
                handlers.onFailure?.(result.cause);
            }
        } catch (error) {
            console.error("[outlayr] command callback threw", error);
        } finally {
            handlers.onSettled?.();
        }
    });
}

export function useAtomAction<W, A, E>(
    command: AtomCommand<W, A, E>,
    handlers: AtomActionHandlers<A, E> = {},
    options?: AtomCommandOptions
) {
    const registry = use(RegistryContext);
    return (input: W) => fireAtomCommand(registry, command, input, handlers, options);
}
