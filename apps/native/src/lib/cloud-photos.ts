import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpIncomingMessage from "effect/http/HttpIncomingMessage";
import * as Schema from "effect/Schema";

import type { PhotoTransport } from "@/data/photo-sync-core";

import { CloudError } from "./cloud-error";
import { cloudAction, cloudMutation } from "./convex";

const UploadReceipt = Schema.Struct({ storageId: Schema.optional(Schema.String) });

/** Convex file storage answers the PUT with the id it allocated; R2 sends nothing. */
const decodeUploadReceipt = HttpIncomingMessage.schemaBodyJson(UploadReceipt);

const isOk = (status: number) => status >= 200 && status < 300;

const failed = (kind: "download" | "upload", cause: Error) => new CloudError({ cause, kind, path: "photos" });

export const photoTransport = Effect.fn("Cloud.photoTransport")(function* photoTransport() {
    const client = yield* HttpClient.HttpClient;

    const get = Effect.fn("Cloud.photoGet")(function* get(url: string) {
        const response = yield* client
            .execute(HttpClientRequest.get(url))
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

    const put = Effect.fn("Cloud.photoPut")(function* put(url: string, bytes: Uint8Array) {
        const response = yield* client
            .execute(HttpClientRequest.put(url).pipe(HttpClientRequest.bodyUint8Array(bytes, "image/jpeg")))
            .pipe(Effect.catchTags({ HttpClientError: (cause) => Effect.fail(failed("upload", cause)) }));
        if (!isOk(response.status)) {
            return yield* failed("upload", new Error(`Photo upload failed: ${response.status}`));
        }
        return yield* decodeUploadReceipt(response).pipe(
            Effect.map((receipt) => receipt.storageId ?? null),
            Effect.catchTags({
                HttpClientError: () => Effect.succeed(null),
                SchemaError: () => Effect.succeed(null),
            })
        );
    });

    return {
        confirmUpload: (key, storageId) =>
            cloudAction<unknown, unknown>("photos:confirmUpload", storageId ? { key, storageId } : { key }).pipe(
                Effect.asVoid
            ),
        get,
        put,
        readUrls: (keys) => cloudMutation("photos:readUrls", { keys: [...keys] }),
        release: (key) => cloudMutation<unknown, unknown>("photos:releaseUnreferenced", { key }).pipe(Effect.asVoid),
        requestUpload: (name) => cloudMutation("photos:requestUpload", { name }),
    } satisfies PhotoTransport;
});
