import { ownsPhotoKey, photoOwnerFromKey } from "@outlayr/backend/confect/lib/photoKeys";
import type { JWTVerifyGetKey } from "jose";

import { sessionToken, verifySession } from "./session";
import type { Session } from "./session";

// Shorter than a signed url's hour, so a redirect the browser kept never points at an expired one.
export const PRIVATE_CACHE = "private, max-age=3000";
const APP_PHOTO_PATH = "/photos/";

export type ReadUrl = (session: Session, key: string) => Promise<string | null>;

export interface PhotoStore {
    read: (key: string, request: Request) => Promise<Response | null>;
}

export interface PhotoDeps {
    appHost: string;
    issuer: string;
    keys: JWTVerifyGetKey;
    origin: (request: Request) => Promise<Response>;
    readUrl: ReadUrl;
    store: PhotoStore;
}

const refused = (status: number) => new Response(null, { headers: { "cache-control": "no-store" }, status });

async function servePhoto(request: Request, deps: PhotoDeps, session: Session, key: string): Promise<Response> {
    // Another person's photo needs the backend's membership rule (`sharedPhotoKeys`), so only Convex can grant it.
    const granted = ownsPhotoKey(session.userId, key) ? undefined : await deps.readUrl(session, key);
    if (granted === null) {
        return refused(404);
    }
    const stored = await deps.store.read(key, request);
    if (stored !== null) {
        return stored;
    }
    // Photos uploaded before the bucket live in Convex file storage, which only the backend can sign.
    const url = granted ?? (await deps.readUrl(session, key));
    return url === null
        ? refused(404)
        : new Response(null, { headers: { "cache-control": PRIVATE_CACHE, location: url }, status: 302 });
}

export async function handlePhoto(request: Request, deps: PhotoDeps): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
        return refused(405);
    }
    const url = new URL(request.url);
    const onApp = url.hostname === deps.appHost;
    if (onApp && !url.pathname.startsWith(APP_PHOTO_PATH)) {
        return deps.origin(request);
    }
    const token = sessionToken(request);
    const session = token === null ? null : await verifySession(token, deps.keys, deps.issuer);
    if (session === null) {
        // The app's own /photos route still answers through Convex, so a stale cookie costs speed, never the photo.
        return onApp ? deps.origin(request) : refused(401);
    }
    const key = url.pathname.slice(onApp ? APP_PHOTO_PATH.length : 1);
    if (photoOwnerFromKey(key) === null) {
        return refused(404);
    }
    try {
        return await servePhoto(request, deps, session, key);
    } catch {
        // Not the app route: it would wait on the same Convex call that just failed.
        return refused(503);
    }
}
