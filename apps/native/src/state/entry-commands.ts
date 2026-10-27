import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import type * as Atom from "effect/reactivity/Atom";
import * as Schema from "effect/Schema";
import { Linking } from "react-native";

import { appLogger } from "@/lib/app-logger";
import { fetchMerchantImage } from "@/lib/logo-fetch";
import { appRuntime } from "@/lib/runtime";

import { createCommand, createRuntimeCommand, runAtomCommand, SILENT } from "./atom-command";
import type { AtomCommand } from "./atom-command";
import { appAtomRegistry } from "./atom-registry";

export type AppServices = typeof appRuntime extends Atom.AtomRuntime<infer R, infer _E> ? R : never;

const appFlowCommand = <A, E>() =>
    createRuntimeCommand(appRuntime, {
        execute: (flow: Effect.Effect<A, E, AppServices>) => flow,
        label: "entry:app-flow",
    });

const flowCommand = <A, E>() =>
    createCommand({
        execute: (flow: Effect.Effect<A, E>) => flow.pipe(Effect.provide(appLogger)),
        label: "entry:flow",
    });

export const voidFlowCommand = flowCommand<unknown, never>();

export const voidAppFlowCommand = appFlowCommand<unknown, never>();

export const fromCommand = <W, A, E>(command: AtomCommand<W, A, E>, input: W): Effect.Effect<A, E> =>
    Effect.promise(() => runAtomCommand(appAtomRegistry, command, input, SILENT)).pipe(
        Effect.flatMap((result) =>
            AsyncResult.isSuccess(result) ? Effect.succeed(result.value) : Effect.failCause(result.cause)
        )
    );
const photoStorage = () =>
    // SAFETY: untyped `require`, asserted to that module's own type.
    require("@/lib/photo-storage") as typeof import("@/lib/photo-storage");
const receiptImage = () =>
    // SAFETY: as above.
    require("@/lib/receipt-image") as typeof import("@/lib/receipt-image");
const glow = () =>
    // SAFETY: as above.
    require("@/theme/glow") as typeof import("@/theme/glow");

export const entryMedia = {
    glowFromImage: (uri: string) => Effect.suspend(() => glow().glowFromImage(uri)),
    persistAttachmentPhoto: (uri: string) => Effect.suspend(() => photoStorage().persistAttachmentPhoto(uri)),
    persistAttachmentPdf: (uri: string, name: string | null) =>
        Effect.sync(() => photoStorage().persistAttachmentPdf(uri, name)),
    persistLogoBytes: (bytes: Uint8Array) => Effect.suspend(() => photoStorage().persistLogoBytes(bytes)),
    prepareReceiptImage: (uri: string) => Effect.suspend(() => receiptImage().prepareReceiptImage(uri)),
};

export const openAppSettings = Effect.ignore(Effect.tryPromise(() => Linking.openSettings()));

export function discardStoredPhoto(uri: string): void {
    try {
        photoStorage().photoFiles.remove(uri.slice(uri.lastIndexOf("/") + 1));
    } catch {
        // A file already gone is the outcome wanted.
    }
}

class NoLogoToCarryError extends Schema.TaggedError<NoLogoToCarryError>()("NoLogoToCarryError", {}) {
    // oxlint-disable-next-line class-methods-use-this -- one fixed message, nothing on the instance to read
    override get message(): string {
        return "No logo to carry";
    }
}

export const carriedLogo = Effect.fn("Entry.carriedLogo")(function* carriedLogo(domain: string, merchant: string) {
    const outcome = yield* fetchMerchantImage({ domain, name: merchant });
    if (outcome.kind !== "logo") {
        return yield* new NoLogoToCarryError();
    }
    return yield* entryMedia.persistLogoBytes(outcome.bytes);
});
