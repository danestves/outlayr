import { api } from "@outlayr/backend/convex/_generated/api";
import { useRouteContext } from "@tanstack/react-router";

const EXTENSIONS = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" } as const;

export type UploadType = keyof typeof EXTENSIONS;

/** Puts the bytes in the visitor's photo store and answers the key a ledger row names them by. */
export function useUploadPhoto() {
    const convex = useRouteContext({ from: "/_account/_app", select: (context) => context.convexQueryClient });
    return async (body: Blob, type: UploadType) => {
        if (!convex) {
            throw new Error("Photos need a connection");
        }
        const client = convex.convexClient;
        const { key, url } = await client.mutation(api.photos.requestUpload, {
            name: `web-${crypto.randomUUID()}.${EXTENSIONS[type]}`,
        });
        const response = await fetch(url, { body, headers: { "Content-Type": type }, method: "PUT" });
        if (!response.ok) {
            throw new Error(`Photo upload failed: ${response.status}`);
        }
        // SAFETY: Convex storage answers with `{ storageId }`, and R2 with an empty body that lands in the catch.
        const { storageId } = (await response.json().catch(() => ({}))) as {
            storageId?: Parameters<typeof client.action<typeof api.photos.confirmUpload>>[1]["storageId"];
        };
        await client.action(api.photos.confirmUpload, storageId ? { key, storageId } : { key });
        return key;
    };
}
