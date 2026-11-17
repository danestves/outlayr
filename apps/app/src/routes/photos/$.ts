import { api } from "@outlayr/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { ConvexHttpClient } from "convex/browser";

import { authServer } from "@/lib/auth-server";
import { serverConvexUrl } from "@/lib/convex";

// Shorter than the signed URL's hour, so a redirect the browser kept never points at an expired one.
const KEPT_REDIRECT = "private, max-age=3000";

const refused = (status: number) => new Response(null, { headers: { "cache-control": "no-store" }, status });

async function redirectToPhoto(key: string) {
    const token = await authServer().getToken();
    if (!token) {
        return refused(401);
    }
    // readUrls answers only the keys the visitor owns.
    const client = new ConvexHttpClient(serverConvexUrl(), { auth: token });
    const [photo] = await client.mutation(api.photos.readUrls, { keys: [key] });
    if (!photo) {
        return refused(404);
    }
    return new Response(null, { headers: { "cache-control": KEPT_REDIRECT, location: photo.url }, status: 302 });
}

export const Route = createFileRoute("/photos/$")({
    server: {
        handlers: {
            GET: ({ params }) => redirectToPhoto(params._splat ?? "").catch(() => refused(502)),
        },
    },
});
