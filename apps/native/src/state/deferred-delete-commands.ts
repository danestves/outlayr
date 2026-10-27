import type * as Effect from "effect/Effect";

import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand } from "./atom-command";

export const launchDeferredDeleteCommand = createRuntimeCommand(appRuntime, {
    execute: (write: Effect.Effect<void>) => write,
    label: "deferred-delete:write",
});
