import { createRemoteJWKSet } from "jose";

import { convexReadUrl } from "./convex";
import { handlePhoto, PRIVATE_CACHE } from "./photos";
import type { PhotoDeps, PhotoStore } from "./photos";

interface Env {
    APP_HOST: string;
    BUCKET: R2Bucket;
    CONVEX_SITE_URL: string;
    CONVEX_URL: string;
}

// The bytes are user uploads served next to the app, so nothing outside this list may render as a page.
const SERVED_TYPES = new Set(["application/pdf", "image/heic", "image/jpeg", "image/png", "image/webp"]);

function bucketStore(bucket: R2Bucket): PhotoStore {
    return {
        read: async (key, request) => {
            // Only the condition a browser revalidates with, so a body-less answer always means 304.
            const etag = request.headers.get("if-none-match");
            const object = await bucket.get(key, etag === null ? {} : { onlyIf: { etagDoesNotMatch: etag } });
            if (object === null) {
                return null;
            }
            const type = object.httpMetadata?.contentType;
            const served = type !== undefined && SERVED_TYPES.has(type);
            const headers = new Headers({
                "cache-control": PRIVATE_CACHE,
                "content-type": served ? type : "application/octet-stream",
                etag: object.httpEtag,
                "x-content-type-options": "nosniff",
            });
            if (!served) {
                headers.set("content-disposition", "attachment");
            }
            if (!("body" in object)) {
                return new Response(null, { headers, status: 304 });
            }
            return new Response(request.method === "HEAD" ? null : object.body, { headers });
        },
    };
}

let deps: PhotoDeps | undefined;

export default {
    fetch: (request, env) => {
        deps ??= {
            appHost: env.APP_HOST,
            issuer: env.CONVEX_SITE_URL,
            keys: createRemoteJWKSet(new URL("/api/auth/convex/jwks", env.CONVEX_SITE_URL)),
            origin: (forwarded) => fetch(forwarded),
            readUrl: convexReadUrl(env.CONVEX_URL),
            store: bucketStore(env.BUCKET),
        };
        return handlePhoto(request, deps);
    },
} satisfies ExportedHandler<Env>;
