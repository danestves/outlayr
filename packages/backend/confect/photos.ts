import { R2 } from "@convex-dev/r2";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { components } from "../convex/_generated/api";

// Photo bytes travel outside sync.ts, to R2 when all four R2_* vars are set and Convex storage otherwise. The key
// is the same either way, so a row resolves through whichever backend stored it and turning R2 on later is safe.
export const r2 = new R2(components.r2);

// Read per call, so a deployment that gains its R2 variables uses them on the next call, not the next cold start.
export { r2Configured as usingR2 } from "./lib/config";

// Above the 900s default so a backlog download outlives no url; far below 7 days, as the url guards a leaked link.
export const PHOTO_URL_TTL_SECONDS = 3600;

export const PHOTO_URL_BATCH_LIMIT = 100;

// Only ever raise this: lowering it strands accounts already above the line.
export const PHOTO_QUOTA_BYTES = 2 * 1024 * 1024 * 1024;

// A retry reuses its key, so a device crashing repeatedly on one photo occupies one slot.
export const UNCONFIRMED_UPLOAD_LIMIT = 50;

// Must match apps/native/src/data/photo-store-core.ts: a table left out reads as unreferenced and its bytes are
// freed while a row still points at them.
export const IMAGE_KEY_TABLES = ["transactions", "accounts", "transactionPhotos", "transactionAttachments"] as const;

export class NotAPhotoName extends Schema.TaggedError<NotAPhotoName>()("NotAPhotoName", { name: Schema.String }) {
    override get message(): string {
        return `Not a photo file name: ${this.name}`;
    }
}

export class PhotoQuotaExceeded extends Schema.TaggedError<PhotoQuotaExceeded>()("PhotoQuotaExceeded", {
    limit: Schema.Number,
    used: Schema.Number,
}) {}

export class PhotoUploadsUnconfirmed extends Schema.TaggedError<PhotoUploadsUnconfirmed>()("PhotoUploadsUnconfirmed", {
    limit: Schema.Number,
}) {}

export class PhotoNotOwned extends Schema.TaggedError<PhotoNotOwned>()("PhotoNotOwned", {
    message: Schema.String.pipe(
        Schema.withConstructorDefault(Effect.succeed("That photo does not belong to this account"))
    ),
}) {}

export class UploadBoundElsewhere extends Schema.TaggedError<UploadBoundElsewhere>()("UploadBoundElsewhere", {
    message: Schema.String.pipe(
        Schema.withConstructorDefault(Effect.succeed("That upload does not belong to this photo"))
    ),
}) {}

export class PhotoReadTooLarge extends Schema.TaggedError<PhotoReadTooLarge>()("PhotoReadTooLarge", {
    keys: Schema.Number,
    limit: Schema.Number,
}) {
    override get message(): string {
        return `A read asks for at most ${this.limit} urls; got ${this.keys}`;
    }
}
