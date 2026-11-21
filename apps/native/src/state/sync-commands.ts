import type * as Effect from "effect/Effect";

import { setSyncEnabled } from "@/data/sync-outbox-core";
import type { Database } from "@/db/client";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand } from "./atom-command";

const syncCommand = <W, A, E>(label: string, execute: (input: W) => Effect.Effect<A, E>) =>
    createRuntimeCommand(appRuntime, {
        execute,
        label: `sync:${label}`,
    });

export const setSyncEnabledCommand = syncCommand("set-enabled", (input: { db: Database; enabled: boolean }) =>
    setSyncEnabled(input.db, input.enabled)
);
