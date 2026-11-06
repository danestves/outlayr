import { createAnthropic } from "@ai-sdk/anthropic";
import { FunctionImpl, GroupImpl } from "@confect/server";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import { knowledgeKeys } from "@outlayr/money/merchant-key";
import type { LanguageModel } from "ai";
import * as Clock from "effect/Clock";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { ActionCtx, MutationCtx, QueryCtx, QueryRunner, Scheduler } from "./_generated/services";
import { classify, MAX_LABELS, scheduleImportGrounded } from "./csvImport";
import type { LabelSuggestion } from "./csvImport.spec";
import { sanitizeRegionCode } from "./enrichment";
import { traced } from "./lib/aiTracing";
import { liveIdentity } from "./lib/auth";
import { anthropicApiKey, claudeFastModelId } from "./lib/config";
import type { CategoryBranch } from "./lib/ledgerPrompt";
import { fixedBurst, perUserBurst } from "./lib/limits";
import { failure, isIsoDay, rateLimiter, readStatement } from "./pdfImport";
import spec, { MAX_PDF_BYTES, PDF_CONTENT_TYPE } from "./pdfImport.spec";
import { isPro } from "./revenuecat";

// Convex upload urls live an hour. Extraction deletes a statement at once; this catches the client that never called.
const UPLOAD_URL_LIFETIME = Duration.hours(1);
const SWEEP_GRACE = Duration.minutes(15);

const requestUpload = FunctionImpl.make(
    databaseSchema,
    spec,
    "requestUpload",
    Effect.fn("PdfImport.requestUpload")(function* requestUpload() {
        const identity = yield* liveIdentity(yield* MutationCtx);
        if (identity === null) {
            return { status: "unauthenticated" as const, url: null };
        }
        const ctx = yield* MutationCtx;
        if (!(yield* isPro(ctx, identity.subject))) {
            return { status: "notEntitled" as const, url: null };
        }
        // An abandoned non-PDF escapes the sweep, so this bounds what a client can store without ever extracting.
        const uploads = yield* Effect.promise(() =>
            rateLimiter.limit(ctx, "pdfUploadPerUser", {
                config: fixedBurst("pdfUpload", true),
                key: identity.tokenIdentifier,
            })
        );
        if (!uploads.ok) {
            return { status: "rateLimited" as const, url: null };
        }
        const burst = yield* perUserBurst("pdfImport", true);
        // Only a look: the token is spent by the extraction, so a failed upload costs nothing.
        const allowance = yield* Effect.promise(() =>
            rateLimiter.check(ctx, "pdfImportPerUser", { config: burst, key: identity.tokenIdentifier })
        );
        if (!allowance.ok) {
            return { status: "rateLimited" as const, url: null };
        }
        const from = yield* Clock.currentTimeMillis;
        const scheduler = yield* Scheduler;
        yield* scheduler.runAfter(
            Duration.sum(UPLOAD_URL_LIFETIME, SWEEP_GRACE),
            refs.internal.pdfImport.sweepUploads,
            { from, to: from + Duration.toMillis(UPLOAD_URL_LIFETIME) }
        );
        const url = yield* Effect.promise(() => ctx.storage.generateUploadUrl());
        return { status: "ok" as const, url };
    }, Effect.orDie)
);

const uploadContentType = FunctionImpl.make(
    databaseSchema,
    spec,
    "uploadContentType",
    Effect.fn("PdfImport.uploadContentType")(function* uploadContentType({ storageId }) {
        const ctx = yield* QueryCtx;
        const file = yield* Effect.promise(() => ctx.db.system.get(storageId));
        return file?.contentType ?? null;
    }, Effect.orDie)
);

// A statement is only ever stored under this content type, and photos never are, so the type is what picks them out.
const sweepUploads = FunctionImpl.make(
    databaseSchema,
    spec,
    "sweepUploads",
    Effect.fn("PdfImport.sweepUploads")(function* sweepUploads({ from, to }) {
        const ctx = yield* MutationCtx;
        const files = yield* Effect.promise(() =>
            ctx.db.system
                .query("_storage")
                .withIndex("by_creation_time", (q) => q.gte("_creationTime", from).lte("_creationTime", to))
                .collect()
        );
        for (const file of files) {
            if (file.contentType === PDF_CONTENT_TYPE) {
                yield* Effect.promise(() => ctx.storage.delete(file._id));
            }
        }
        return null;
    }, Effect.orDie)
);

interface SuggestArgs {
    categoryTree: readonly CategoryBranch[];
    distinctId: string | undefined;
    groundedLookup: boolean;
    labels: readonly string[];
    model: LanguageModel;
    regionCode: string | undefined;
    tokenIdentifier: string;
}

const suggestCategories = Effect.fn("PdfImport.suggestCategories")(function* suggestCategories(args: SuggestArgs) {
    const asked = args.labels.slice(0, MAX_LABELS);
    const overCap = args.labels.length > asked.length;
    const ctx = yield* ActionCtx;
    const { runQuery } = yield* QueryRunner;
    const looked = yield* runQuery(refs.internal.merchantKnowledge.lookupMany, {
        keyLists: asked.map((label) => knowledgeKeys(label, undefined)),
        now: yield* Clock.currentTimeMillis,
    });
    const known: LabelSuggestion[] = [];
    const remaining: string[] = [];
    for (const [index, label] of asked.entries()) {
        const row = looked[index] ?? null;
        if (row === null) {
            remaining.push(label);
        } else {
            known.push({ categoryName: row.categoryName, domain: row.domain, label });
        }
    }
    yield* scheduleImportGrounded(ctx, args.tokenIdentifier, {
        distinctId: args.distinctId,
        groundedLookup: args.groundedLookup,
        labels: remaining,
        regionCode: args.regionCode,
    });
    if (remaining.length === 0) {
        return { degraded: overCap, suggestions: known };
    }
    const classified = yield* classify(args.model, { categoryTree: args.categoryTree, labels: remaining });
    if (classified.status !== "ok" || classified.suggestions === null) {
        return { degraded: true, suggestions: known };
    }
    return { degraded: overCap, suggestions: [...known, ...classified.suggestions] };
});

const readUpload = Effect.fn("PdfImport.readUpload")(function* readUpload(
    storageId: Parameters<ActionCtx["storage"]["get"]>[0]
) {
    const ctx = yield* ActionCtx;
    const blob = yield* Effect.promise(() => ctx.storage.get(storageId));
    if (blob === null || blob.size > MAX_PDF_BYTES) {
        return null;
    }
    const bytes = yield* Effect.promise(() => blob.arrayBuffer());
    return new Uint8Array(bytes);
});

const extract = FunctionImpl.make(
    databaseSchema,
    spec,
    "extract",
    Effect.fn("PdfImport.extract")(function* extract(args) {
        const identity = yield* liveIdentity(yield* ActionCtx);
        if (identity === null) {
            return failure("unauthenticated");
        }

        const apiKey = yield* anthropicApiKey;
        if (Option.isNone(apiKey) || args.aiConsent !== AI_CONSENT_VERSION) {
            return failure("notConfigured");
        }
        if (!isIsoDay(args.today)) {
            return failure("invalid");
        }

        const ctx = yield* ActionCtx;
        if (!(yield* isPro(ctx, identity.subject))) {
            return failure("notEntitled");
        }

        const burst = yield* perUserBurst("pdfImport", true);
        const quota = { config: burst, key: identity.tokenIdentifier };
        const allowance = yield* Effect.promise(() => rateLimiter.check(ctx, "pdfImportPerUser", quota));
        if (!allowance.ok) {
            return failure("rateLimited");
        }
        // Before the per-user token: a month's token must not go on a read the global window refuses.
        const global = yield* Effect.promise(() => rateLimiter.limit(ctx, "pdfImportGlobal"));
        if (!global.ok) {
            return failure("rateLimited");
        }
        const perUser = yield* Effect.promise(() => rateLimiter.limit(ctx, "pdfImportPerUser", quota));
        if (!perUser.ok) {
            return failure("rateLimited");
        }

        // Checked before anything is deleted: a client also holds the storage ids of its own photos.
        const { runQuery } = yield* QueryRunner;
        const contentType = yield* runQuery(refs.internal.pdfImport.uploadContentType, { storageId: args.storageId });
        if (contentType !== PDF_CONTENT_TYPE) {
            return failure("invalid");
        }

        return yield* Effect.gen(function* readAndClassify() {
            const bytes = yield* readUpload(args.storageId);
            if (bytes === null) {
                return failure("invalid");
            }
            const distinctId = args.shareAnalytics === true ? identity.subject : undefined;
            const modelId = yield* claudeFastModelId;
            const model = traced(createAnthropic({ apiKey: Redacted.value(apiKey.value) })(modelId), "pdf_import", {
                distinctId,
            });
            const regionCode = sanitizeRegionCode(args.regionCode);
            const statement = yield* readStatement(model, bytes, { regionCode, today: args.today });
            if (statement.status !== "ok") {
                return failure(statement.status);
            }
            // The file is about to go, so losing the rows to a failed lookup would cost a re-upload and a token.
            const { degraded, suggestions } = yield* suggestCategories({
                categoryTree: args.categoryTree,
                distinctId,
                groundedLookup: args.groundedLookup === true,
                labels: [...new Set(statement.rows.map((row) => row.label))],
                model,
                regionCode,
                tokenIdentifier: identity.tokenIdentifier,
            }).pipe(Effect.catchCause(() => Effect.succeed({ degraded: true, suggestions: [] })));
            const read = { rows: statement.rows, status: "ok" as const, suggestions };
            return degraded ? { ...read, degraded } : read;
        }).pipe(Effect.ensuring(Effect.promise(() => ctx.storage.delete(args.storageId))));
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(requestUpload),
    Layer.provide(uploadContentType),
    Layer.provide(sweepUploads),
    Layer.provide(extract),
    GroupImpl.finalize
);
