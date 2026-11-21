import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

// Photo bytes travel outside sync.ts through the storage component, to a bucket when the deployment configured one
// and Convex file storage otherwise. The key is the same either way, so a row resolves through whichever backend
// stored it and turning a bucket on later is safe.

// Above the 900s default so a backlog download outlives no url; far below 7 days, as the url guards a leaked link.
export const PHOTO_URL_TTL_SECONDS = 3600;

export const PHOTO_URL_BATCH_LIMIT = 100;

// Only ever raise this: lowering it strands accounts already above the line.
export const PHOTO_QUOTA_BYTES = 2 * 1024 * 1024 * 1024;

// A retry reuses its key, so a device crashing repeatedly on one photo occupies one slot.
export const UNCONFIRMED_UPLOAD_LIMIT = 50;

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
