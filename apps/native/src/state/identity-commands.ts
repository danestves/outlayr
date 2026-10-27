import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { launchImageLibraryAsync } from "expo-image-picker";

import { pickedPhotoUri, withPhoto } from "@/components/identity-picker-shared";
import type { IdentitySelection } from "@/components/identity-picker-shared";
import type { AccountLogo } from "@/hooks/use-account-identity";
import { fetchMerchantImage } from "@/lib/logo-fetch";
import { launchPick } from "@/lib/pending-pick";
import { persistLogo } from "@/lib/persist-logo";
import { persistPickedPhoto } from "@/lib/photo-storage";
import { appRuntime } from "@/lib/runtime";
import { glowFromImage } from "@/theme/glow";

import { createCommand, createRuntimeCommand } from "./atom-command";

class PhotoPickError extends Schema.TaggedError<PhotoPickError>()("PhotoPickError", {
    cause: Schema.Defect(),
}) {
    // oxlint-disable-next-line class-methods-use-this -- one cause, no attribute: the message has nothing on the instance to read
    override get message(): string {
        return "The photo library could not be opened";
    }
}

const openLibrary = Effect.tryPromise({
    catch: (cause) => new PhotoPickError({ cause }),
    try: () =>
        launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            mediaTypes: ["images"],
            quality: 0.9,
        }),
});

/**
 * A failed copy still shows the picture this session, and the launch reconcile adopts it while the cache
 * entry survives. `glowFromImage` resolves to `[]` rather than rejecting, so an unreadable image keeps the photo.
 */
export const adoptPickedPhoto = Effect.fn("Identity.adoptPickedPhoto")(function* adoptPickedPhoto(
    value: IdentitySelection,
    pickedUri: string
) {
    const uri = yield* persistPickedPhoto(pickedUri).pipe(
        Effect.catchCause((cause) =>
            Effect.sync(() => {
                console.error("Failed to store the picked photo", Cause.squash(cause));
                return pickedUri;
            })
        )
    );
    return withPhoto(value, uri, yield* glowFromImage(uri));
});

export const pickLibraryPhotoCommand = createCommand({
    execute: Effect.fn("Identity.pickLibraryPhoto")(function* pickLibraryPhoto(value: IdentitySelection) {
        const result = yield* openLibrary;
        if (result.canceled || result.assets.length === 0) {
            return null;
        }
        return yield* adoptPickedPhoto(value, result.assets[0].uri);
    }),
    label: "identity:pick-library-photo",
});

export const pickHandoffPhotoCommand = createCommand({
    execute: Effect.fn("Identity.pickHandoffPhoto")(function* pickHandoffPhoto(value: IdentitySelection) {
        const picked = pickedPhotoUri(yield* launchPick("identity-picker", openLibrary));
        return picked == null ? null : yield* adoptPickedPhoto(value, picked);
    }),
    label: "identity:pick-handoff-photo",
});

export type AttachedLogo = { kind: "clear" } | { kind: "logo"; logo: AccountLogo } | { kind: "skip" };

export const attachAccountLogoCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("Identity.attachAccountLogo")(function* attachAccountLogo(input: {
        domain: string;
        name: string;
        stale: () => boolean;
    }) {
        const outcome = yield* fetchMerchantImage({ domain: input.domain, name: input.name });
        if (input.stale()) {
            return { kind: "skip" } satisfies AttachedLogo;
        }
        if (outcome.kind !== "logo") {
            return { kind: "clear" } satisfies AttachedLogo;
        }
        return yield* persistLogo(outcome.bytes).pipe(
            Effect.map((logo): AttachedLogo => ({ kind: "logo", logo })),
            Effect.catchCause((): Effect.Effect<AttachedLogo> => Effect.succeed({ kind: "skip" }))
        );
    }),
    label: "identity:attach-account-logo",
});
