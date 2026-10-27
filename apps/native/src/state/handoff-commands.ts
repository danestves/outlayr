import * as Effect from "effect/Effect";
import type { PermissionResponse } from "expo";
import type { DocumentPickerResult } from "expo-document-picker";
import type { ImagePickerResult } from "expo-image-picker";

import { duringHandoff } from "@/lib/app-handoff";
import { launchPick, pendingPick } from "@/lib/pending-pick";
import type { PickOwner } from "@/lib/pending-pick";

import { createCommand, runAtomCommand, SILENT, unwrapAtomCommand } from "./atom-command";
import type { AtomCommand } from "./atom-command";
import { appAtomRegistry } from "./atom-registry";

export async function runHandoffCommand<W, A, E>(command: AtomCommand<W, A, E>, input: W): Promise<A> {
    return unwrapAtomCommand(await runAtomCommand(appAtomRegistry, command, input, SILENT));
}

const handoffOf = <A>(label: string) =>
    createCommand({
        execute: (trip: () => Promise<A>) => duringHandoff(Effect.tryPromise(trip)),
        label: `handoff:${label}`,
    });

export const handoffPermissionCommand = handoffOf<PermissionResponse>("permission");
export const handoffImageCommand = handoffOf<ImagePickerResult>("image");
export const handoffDocumentCommand = handoffOf<DocumentPickerResult>("document");

export const launchPickCommand = createCommand({
    execute: (input: { launch: () => Promise<ImagePickerResult>; owner: PickOwner }) =>
        launchPick(input.owner, Effect.tryPromise(input.launch)),
    label: "handoff:launch-pick",
});

export const pendingPickCommand = createCommand({
    execute: (owner: PickOwner) => pendingPick(owner),
    label: "handoff:pending-pick",
});
