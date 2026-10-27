import * as Effect from "effect/Effect";

import type { ImportEntry } from "@/data/transfer-core";
import { attachImportLogos } from "@/lib/import-logo-attach";
import { persistLogo } from "@/lib/persist-logo";

import { createCommand, runAtomCommand, SILENT, unwrapAtomCommand } from "./atom-command";
import type { AtomCommand } from "./atom-command";
import { appAtomRegistry } from "./atom-registry";

export async function runMediaCommand<W, A, E>(command: AtomCommand<W, A, E>, input: W): Promise<A> {
    return unwrapAtomCommand(await runAtomCommand(appAtomRegistry, command, input, SILENT));
}

const photoStorage = () =>
    // SAFETY: untyped `require`, asserted to that module's own type.
    require("@/lib/photo-storage") as typeof import("@/lib/photo-storage");
const receiptImage = () =>
    // SAFETY: as above.
    require("@/lib/receipt-image") as typeof import("@/lib/receipt-image");
const glow = () =>
    // SAFETY: as above.
    require("@/theme/glow") as typeof import("@/theme/glow");

export const persistPickedPhotoCommand = createCommand({
    execute: (uri: string) => Effect.suspend(() => photoStorage().persistPickedPhoto(uri)),
    label: "media:persist-picked-photo",
});

export const persistLogoBytesCommand = createCommand({
    execute: (bytes: Uint8Array) => Effect.suspend(() => photoStorage().persistLogoBytes(bytes)),
    label: "media:persist-logo-bytes",
});

export const persistLogoCommand = createCommand({
    execute: (bytes: Uint8Array) => persistLogo(bytes),
    label: "media:persist-logo",
});

export const persistAttachmentPhotoCommand = createCommand({
    execute: (uri: string) => Effect.suspend(() => photoStorage().persistAttachmentPhoto(uri)),
    label: "media:persist-attachment-photo",
});

export const prepareReceiptImageCommand = createCommand({
    execute: (uri: string) => Effect.suspend(() => receiptImage().prepareReceiptImage(uri)),
    label: "media:prepare-receipt-image",
});

export const glowFromImageCommand = createCommand({
    execute: (uri: string) => Effect.suspend(() => glow().glowFromImage(uri)),
    label: "media:glow-from-image",
});

export const attachImportLogosCommand = createCommand({
    execute: (entries: readonly ImportEntry[]) => attachImportLogos(entries),
    label: "media:attach-import-logos",
});
