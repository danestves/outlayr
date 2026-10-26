import * as Effect from "effect/Effect";

import { setSyncEnabled } from "@/data/sync-outbox-core";
import type { Database } from "@/db/client";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand } from "./atom-command";

const syncCommand = <W, A>(label: string, execute: (input: W) => Effect.Effect<A, { readonly cause: unknown }>) =>
    createRuntimeCommand(appRuntime, {
        execute: (input: W) => execute(input).pipe(Effect.mapError((error) => error.cause)),
        label: `sync:${label}`,
    });

export const setSyncEnabledCommand = syncCommand("set-enabled", (input: { db: Database; enabled: boolean }) =>
    setSyncEnabled(input.db, input.enabled)
);
