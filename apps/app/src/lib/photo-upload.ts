import { api } from "@outlayr/backend/convex/_generated/api";
import { useMatch, useRouteContext } from "@tanstack/react-router";
import { ConvexError } from "convex/values";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { profileArgs } from "./profile";

const EXTENSIONS = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" } as const;

export type UploadType = keyof typeof EXTENSIONS;

export type PhotoTrouble = "failed" | "full" | "offline" | "pro" | "unreadable";

export class UnreadablePhotoError extends Schema.TaggedError<UnreadablePhotoError>()("UnreadablePhotoError", {
    cause: Schema.Unknown,
}) {}

const decodeRefusal = Schema.decodeUnknownOption(Schema.Struct({ code: Schema.String }));

export function photoTrouble(error: Error): PhotoTrouble {
    if (error instanceof UnreadablePhotoError) {
        return "unreadable";
    }
    if (!navigator.onLine) {
        return "offline";
    }
    if (!(error instanceof ConvexError)) {
        return "failed";
    }
    if (String(error.data).includes("Pro is required")) {
        return "pro";
    }
    return Option.exists(decodeRefusal(error.data), ({ code }) => code === "PHOTO_QUOTA_EXCEEDED") ? "full" : "failed";
}

/** Puts the bytes in the visitor's photo store and answers the key a ledger row names them by. */
export function useUploadPhoto() {
    const convex = useRouteContext({ from: "/_account/_app", select: (context) => context.convexQueryClient });
    const profileId = useMatch({
        from: "/_account/_app",
        select: (match) => match.loaderData?.profileId ?? null,
        shouldThrow: false,
    });
    return async (body: Blob, type: UploadType) => {
        if (!convex) {
            throw new Error("Photos need a connection");
        }
        const client = convex.convexClient;
        const { key, method, url } = await client.mutation(api.photos.requestUpload, {
            name: `web-${crypto.randomUUID()}.${EXTENSIONS[type]}`,
            ...profileArgs(profileId ?? null),
        });
        // Convex file storage takes only POST, a bucket url only PUT; an older bucket server sends no method.
        const response = await fetch(url, { body, headers: { "Content-Type": type }, method: method ?? "PUT" });
        if (!response.ok) {
            throw new Error(`Photo upload failed: ${response.status}`);
        }
        // SAFETY: only Convex file storage answers with an id; a bucket sends an empty body that lands in the catch.
        const { storageId } = (await response.json().catch(() => ({}))) as {
            storageId?: Parameters<typeof client.action<typeof api.photos.confirmUpload>>[1]["storageId"];
        };
        // Convex file storage binds bytes to a key only through this id, so confirming without it loses the photo.
        if (method === "POST" && !storageId) {
            throw new Error("Photo upload returned no storage id");
        }
        await client.action(api.photos.confirmUpload, storageId ? { key, storageId } : { key });
        return key;
    };
}
