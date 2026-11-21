import type { Infer } from "convex/values";
import { v } from "convex/values";

// Components cannot read the app's environment, so the app resolves its provider and passes it on every call.
export const provider = v.union(
    v.object({ kind: v.literal("convex") }),
    v.object({
        accessKeyId: v.string(),
        bucket: v.string(),
        endpoint: v.optional(v.string()),
        forcePathStyle: v.boolean(),
        kind: v.literal("s3"),
        region: v.string(),
        secretAccessKey: v.string(),
    })
);

export type Provider = Infer<typeof provider>;
