import { merchantLogoUrl } from "@outlayr/backend/confect/lib/photoKeys";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpIncomingMessage from "effect/http/HttpIncomingMessage";
import * as Schema from "effect/Schema";

import type { PhotoTransport, PhotoUploadMethod } from "@/data/photo-sync-core";
import { profileArgs } from "@/domain/profiles";
import { ENV } from "@/env";

import { activeProfileId } from "./active-profile";
import { CloudError } from "./cloud-error";
import { cloudRuntime } from "./cloud-runtime";
import { cloudAction, cloudMutation } from "./convex";

const UploadReceipt = Schema.Struct({ storageId: Schema.optional(Schema.String) });

/** Only Convex file storage answers with the id it allocated; a bucket sends nothing. */
const decodeUploadReceipt = HttpIncomingMessage.schemaBodyJson(UploadReceipt);

const isOk = (status: number) => status >= 200 && status < 300;

const failed = (kind: "download" | "upload", cause: Error) => new CloudError({ cause, kind, path: "photos" });

const FILES_URL = ENV.EXPO_PUBLIC_FILES_URL;
const TOKEN_TIMEOUT_MS = 20_000;

const sessionToken = Effect.tryPromise({
    catch: (cause) => failed("download", cause instanceof Error ? cause : new Error(String(cause))),
    try: async () => {
        const reply = await cloudRuntime?.authClient.convex.token({
            // The token fetch retries until aborted, and a sync pass holds its lock while it waits.
            fetchOptions: { signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS), throw: false },
        });
        return reply?.data?.token ?? null;
    },
}).pipe(
    Effect.flatMap((token) =>
        token === null
            ? Effect.fail(failed("download", new Error("No session token for photo files")))
            : Effect.succeed(token)
    )
);

export const photoTransport = Effect.fn("Cloud.photoTransport")(function* photoTransport() {
    const client = yield* HttpClient.HttpClient;
    // One token per sync pass; a signed bucket url must never carry it.
    const filesToken = yield* Effect.cached(sessionToken);

    const get = Effect.fn("Cloud.photoGet")(function* get(url: string) {
        const request = HttpClientRequest.get(url);
        const authorized =
            FILES_URL !== undefined && url.startsWith(`${FILES_URL}/`)
                ? HttpClientRequest.bearerToken(request, yield* filesToken)
                : request;
        const response = yield* client
            .execute(authorized)
            .pipe(Effect.catchTags({ HttpClientError: (cause) => Effect.fail(failed("download", cause)) }));
        if (response.status === 404 || response.status === 403) {
            return null;
        }
        if (!isOk(response.status)) {
            return yield* failed("download", new Error(`Photo download failed: ${response.status}`));
        }
        const bytes = yield* response.arrayBuffer.pipe(
            Effect.catchTags({ HttpClientError: (cause) => Effect.fail(failed("download", cause)) })
        );
        return new Uint8Array(bytes);
    });

    const put = Effect.fn("Cloud.photoPut")(function* put(url: string, bytes: Uint8Array, method: PhotoUploadMethod) {
        const request = (method === "POST" ? HttpClientRequest.post : HttpClientRequest.put)(url).pipe(
            HttpClientRequest.bodyUint8Array(bytes, "image/jpeg")
        );
        const response = yield* client
            .execute(request)
            .pipe(Effect.catchTags({ HttpClientError: (cause) => Effect.fail(failed("upload", cause)) }));
        if (!isOk(response.status)) {
            return yield* failed("upload", new Error(`Photo upload failed: ${response.status}`));
        }
        const storageId = yield* decodeUploadReceipt(response).pipe(
            Effect.map((receipt) => receipt.storageId ?? null),
            Effect.catchTags({
                HttpClientError: () => Effect.succeed(null),
                SchemaError: () => Effect.succeed(null),
            })
        );
        // Convex file storage binds bytes to a key only through this id, so confirming without it loses the photo.
        if (method === "POST" && !storageId) {
            return yield* failed("upload", new Error("Photo upload returned no storage id"));
        }
        return storageId;
    });

    return {
        confirmUpload: (key, storageId) =>
            cloudAction<unknown, unknown>("photos:confirmUpload", storageId ? { key, storageId } : { key }).pipe(
                Effect.asVoid
            ),
        get,
        put,
        readUrls: (keys) =>
            FILES_URL === undefined
                ? cloudMutation("photos:readUrls", { keys: [...keys] })
                : Effect.succeed(keys.map((key) => ({ key, url: merchantLogoUrl(key) ?? `${FILES_URL}/${key}` }))),
        release: (key) =>
            cloudMutation<unknown, unknown>("photos:releaseUnreferenced", {
                key,
                ...profileArgs(activeProfileId()),
            }).pipe(Effect.asVoid),
        requestUpload: (name) => cloudMutation("photos:requestUpload", { name, ...profileArgs(activeProfileId()) }),
    } satisfies PhotoTransport;
});
