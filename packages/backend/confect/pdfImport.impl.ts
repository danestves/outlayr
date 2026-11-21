import { FunctionImpl, GroupImpl } from "@confect/server";
import type { TextModel } from "@outlayr/ai/model";
import { route } from "@outlayr/model-router/route";
import { knowledgeKeys } from "@outlayr/money/merchant-key";
import type { UserIdentity } from "convex/server";
import * as Clock from "effect/Clock";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { components } from "../convex/_generated/api";
import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { ActionCtx, MutationCtx, QueryCtx, QueryRunner, Scheduler } from "./_generated/services";
import { classify, MAX_LABELS, scheduleImportGrounded } from "./csvImport";
import type { LabelSuggestion } from "./csvImport.spec";
import { sanitizeRegionCode } from "./enrichment";
import { openAiGate, proOnly, refuse, withinLimit } from "./lib/aiGate";
import { liveIdentity } from "./lib/auth";
import type { CategoryBranch } from "./lib/ledgerPrompt";
import { fixedBurst, perUserBurst } from "./lib/limits";
import { failure, isIsoDay, ownsStatementKey, rateLimiter, readStatement, statementKeyFor } from "./pdfImport";
import spec, { MAX_PDF_BYTES, PDF_CONTENT_TYPE } from "./pdfImport.spec";
import { isPro } from "./revenuecat";

// Convex upload urls live an hour. Extraction deletes a statement at once; this catches the client that never called.
const UPLOAD_URL_LIFETIME = Duration.hours(1);
const SWEEP_GRACE = Duration.minutes(15);
// Convex checks the url before reading the body, so an upload started near expiry can land after the window closes.
const LATE_UPLOAD = Duration.minutes(10);
// PDF extraction has no client deadline and classifies up to 200 labels, which can outrun the CSV budget.
const CLASSIFY_TIMEOUT = Duration.seconds(60);

const gateUpload = Effect.fn("PdfImport.gateUpload")(function* gateUpload(ctx: MutationCtx) {
    const identity = yield* liveIdentity(ctx);
    if (identity === null) {
        return { identity: null, status: "unauthenticated" as const };
    }
    if (!(yield* isPro(ctx, identity.subject))) {
        return { identity: null, status: "notEntitled" as const };
    }
    // An abandoned non-PDF escapes the sweep, so this bounds what a client can store without ever extracting.
    const uploads = yield* Effect.promise(() =>
        rateLimiter.limit(ctx, "pdfUploadPerUser", {
            config: fixedBurst("pdfUpload", true),
            key: identity.tokenIdentifier,
        })
    );
    if (!uploads.ok) {
        return { identity: null, status: "rateLimited" as const };
    }
    const burst = yield* perUserBurst("pdfImport", true);
    // Only a look: the token is spent by the extraction, so a failed upload costs nothing.
    const allowance = yield* Effect.promise(() =>
        rateLimiter.check(ctx, "pdfImportPerUser", { config: burst, key: identity.tokenIdentifier })
    );
    if (!allowance.ok) {
        return { identity: null, status: "rateLimited" as const };
    }
    return { identity, status: "ok" as const };
});

const scheduleSweep = Effect.fn("PdfImport.scheduleSweep")(function* scheduleSweep(key?: string) {
    const from = yield* Clock.currentTimeMillis;
    const scheduler = yield* Scheduler;
    const window = { from, to: from + Duration.toMillis(UPLOAD_URL_LIFETIME) };
    yield* scheduler.runAfter(
        Duration.sum(UPLOAD_URL_LIFETIME, SWEEP_GRACE),
        refs.internal.pdfImport.sweepUploads,
        key === undefined ? window : { ...window, key }
    );
});

const requestUpload = FunctionImpl.make(
    databaseSchema,
    spec,
    "requestUpload",
    Effect.fn("PdfImport.requestUpload")(function* requestUpload() {
        const ctx = yield* MutationCtx;
        const gate = yield* gateUpload(ctx);
        if (gate.identity === null) {
            return { status: gate.status, url: null };
        }
        yield* scheduleSweep();
        const url = yield* Effect.promise(() => ctx.storage.generateUploadUrl());
        return { status: "ok" as const, url };
    }, Effect.orDie)
);

// Statements stay in Convex file storage whatever the deployment's bucket is: the privacy policy keeps them on
// our servers.
const startUpload = FunctionImpl.make(
    databaseSchema,
    spec,
    "startUpload",
    Effect.fn("PdfImport.startUpload")(function* startUpload() {
        const ctx = yield* MutationCtx;
        const gate = yield* gateUpload(ctx);
        if (gate.identity === null) {
            return { key: null, status: gate.status, url: null };
        }
        const key = statementKeyFor(gate.identity.subject, crypto.randomUUID());
        yield* scheduleSweep(key);
        const { url } = yield* Effect.promise(() =>
            ctx.runMutation(components.storage.objects.uploadUrl, { key, provider: { kind: "convex" } })
        );
        return { key, status: "ok" as const, url };
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

// Statements are always PDFs. A PDF still unconfirmed minutes after upload is abandoned, whichever feature sent it.
const sweepUploads = FunctionImpl.make(
    databaseSchema,
    spec,
    "sweepUploads",
    Effect.fn("PdfImport.sweepUploads")(function* sweepUploads({ from, key, to: windowEnd }) {
        const ctx = yield* MutationCtx;
        const to = windowEnd + Duration.toMillis(LATE_UPLOAD);
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
        if (key !== undefined) {
            yield* Effect.promise(() =>
                ctx.runMutation(components.storage.objects.remove, { key, provider: { kind: "convex" } })
            );
        }
        yield* Effect.promise(() =>
            ctx.runMutation(components.storage.objects.sweepUnbound, {
                contentType: PDF_CONTENT_TYPE,
                from,
                to,
            })
        );
        return null;
    }, Effect.orDie)
);

interface SuggestArgs {
    categoryTree: readonly CategoryBranch[];
    distinctId: string | undefined;
    groundedLookup: boolean;
    labels: readonly string[];
    model: TextModel;
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
    const classified = yield* classify(args.model, {
        categoryTree: args.categoryTree,
        labels: remaining,
        timeout: CLASSIFY_TIMEOUT,
    });
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

const readKeyedUpload = Effect.fn("PdfImport.readKeyedUpload")(function* readKeyedUpload(upload: {
    key: string;
    storageId: string;
}) {
    const ctx = yield* ActionCtx;
    const provider = { kind: "convex" as const };
    const confirmed = yield* Effect.promise(() =>
        ctx.runAction(components.storage.objects.confirmUpload, {
            key: upload.key,
            provider,
            storageId: upload.storageId,
        })
    );
    if (confirmed.kind !== "stored") {
        return null;
    }
    const read = yield* Effect.promise(() =>
        ctx.runAction(components.storage.objects.read, { key: upload.key, maxBytes: MAX_PDF_BYTES })
    );
    return read.kind === "stored" ? new Uint8Array(read.bytes) : null;
});

function readStatementBytes(
    upload: { key: string; storageId: string } | undefined,
    storageId: Parameters<ActionCtx["storage"]["get"]>[0] | undefined
) {
    if (upload !== undefined) {
        return readKeyedUpload(upload);
    }
    return storageId === undefined ? Effect.succeed(null) : readUpload(storageId);
}

function cleanupUpload(
    ctx: ActionCtx,
    upload: { key: string } | undefined,
    storageId: Parameters<ActionCtx["storage"]["delete"]>[0] | undefined
) {
    if (upload !== undefined) {
        return Effect.promise(() =>
            ctx.runMutation(components.storage.objects.remove, { key: upload.key, provider: { kind: "convex" } })
        );
    }
    return storageId === undefined ? Effect.void : Effect.promise(() => ctx.storage.delete(storageId));
}

const extract = FunctionImpl.make(
    databaseSchema,
    spec,
    "extract",
    Effect.fn("PdfImport.extract")(
        function* extract(args) {
            const ctx = yield* ActionCtx;
            const { storageId, upload } = args;
            const { caller, distinctId, model } = yield* openAiGate(ctx, {
                admit: Effect.fn("PdfImport.extractRungs")(function* extractRungs(identity: UserIdentity) {
                    if (!isIsoDay(args.today)) {
                        return yield* refuse("invalid");
                    }
                    yield* proOnly(ctx, identity);
                    const quota = {
                        config: yield* perUserBurst("pdfImport", true),
                        key: identity.tokenIdentifier,
                    };
                    yield* withinLimit(() => rateLimiter.check(ctx, "pdfImportPerUser", quota));
                    // Before the per-user token: a month's token must not go on a read the global window refuses.
                    yield* withinLimit(() => rateLimiter.limit(ctx, "pdfImportGlobal"));
                    yield* withinLimit(() => rateLimiter.limit(ctx, "pdfImportPerUser", quota));

                    if ((storageId === undefined) === (upload === undefined)) {
                        return yield* refuse("invalid");
                    }
                    if (upload !== undefined) {
                        if (!ownsStatementKey(identity.subject, upload.key)) {
                            return yield* refuse("invalid");
                        }
                    } else if (storageId !== undefined) {
                        // Legacy app storage only. Checked before anything is deleted: a client also holds the
                        // storage ids of its own photos.
                        const { runQuery } = yield* QueryRunner;
                        const contentType = yield* runQuery(refs.internal.pdfImport.uploadContentType, {
                            storageId,
                        });
                        if (contentType !== PDF_CONTENT_TYPE) {
                            return yield* refuse("invalid");
                        }
                    }
                }),
                args,
                route: route({ feature: "pdf_import" }),
            });

            return yield* Effect.gen(function* readAndClassify() {
                const bytes = yield* readStatementBytes(upload, storageId);
                if (bytes === null) {
                    return failure("invalid");
                }
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
                    tokenIdentifier: caller.tokenIdentifier,
                }).pipe(Effect.catchCause(() => Effect.succeed({ degraded: true, suggestions: [] })));
                const read = { rows: statement.rows, status: "ok" as const, suggestions };
                const flagged = degraded ? { ...read, degraded } : read;
                const { unreadPages } = statement;
                return unreadPages.length > 0 ? { ...flagged, unreadPages } : flagged;
            }).pipe(Effect.ensuring(cleanupUpload(ctx, upload, storageId)));
        },
        Effect.catchTags({ AiRefused: ({ status }) => Effect.succeed(failure(status)) }),
        Effect.orDie
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(requestUpload),
    Layer.provide(startUpload),
    Layer.provide(uploadContentType),
    Layer.provide(sweepUploads),
    Layer.provide(extract),
    GroupImpl.finalize
);
