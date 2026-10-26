import * as Effect from "effect/Effect";

import { appRuntime } from "@/lib/runtime";
import { SecureStorage } from "@/lib/secure-storage";

import { runAtomCommand, SILENT, unwrapAtomCommand, createRuntimeCommand } from "./atom-command";
import { appAtomRegistry } from "./atom-registry";

const getSecureItemCommand = createRuntimeCommand(appRuntime, {
    execute: (key: string) => SecureStorage.pipe(Effect.flatMap((storage) => storage.get(key))),
    label: "secure-storage:get",
});

export const setSecureItemCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { key: string; value: string }) =>
        SecureStorage.pipe(Effect.flatMap((storage) => storage.set(input.key, input.value))),
    label: "secure-storage:set",
});

export const removeSecureItemCommand = createRuntimeCommand(appRuntime, {
    execute: (key: string) => SecureStorage.pipe(Effect.flatMap((storage) => storage.remove(key))),
    label: "secure-storage:remove",
});

export async function readSecureItem(key: string): Promise<string | null> {
    return unwrapAtomCommand(await runAtomCommand(appAtomRegistry, getSecureItemCommand, key, SILENT));
}

export async function writeSecureItem(key: string, value: string): Promise<void> {
    unwrapAtomCommand(await runAtomCommand(appAtomRegistry, setSecureItemCommand, { key, value }, SILENT));
}

export async function deleteSecureItem(key: string): Promise<void> {
    unwrapAtomCommand(await runAtomCommand(appAtomRegistry, removeSecureItemCommand, key, SILENT));
}
