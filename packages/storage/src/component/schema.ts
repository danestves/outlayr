import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Only objects kept in Convex file storage get a row, because it allocates its own ids. Bucket objects are
// addressed by key alone, so a key resolves through whichever backend stored it.
export default defineSchema({
    objects: defineTable({ key: v.string(), storageId: v.id("_storage") })
        .index("by_key", ["key"])
        .index("by_storageId", ["storageId"]),
});
