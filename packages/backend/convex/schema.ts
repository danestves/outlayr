import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { marketRateType, rateSource } from "./lib/currencies";
import {
    accountFields,
    appMetaFields,
    budgetFields,
    categoryFields,
    installmentFields,
    installmentPlanFields,
    outsideMoveFields,
    outsidePaymentFields,
    mainBudgetFields,
    replicated,
    savingsGoalFields,
    tagFields,
    transactionColumns,
    transactionPhotoFields,
    transactionSplitFields,
    transactionTagFields,
    transferFields,
} from "./lib/syncTables";

export const enrichmentResult = v.object({
    categoryName: v.union(v.string(), v.null()),
    domain: v.union(v.string(), v.null()),
    emoji: v.union(v.string(), v.null()),
    isNewCategory: v.boolean(),
    merchantName: v.union(v.string(), v.null()),
    parentCategoryName: v.union(v.string(), v.null()),
    tags: v.array(v.string()),
});

// Replicated tables follow docs/internals/convex-sync.md: foreign keys hold `localId`s, never Convex Ids.
// `by_user_and_imageKey` exists so photos.releaseUnreferenced can ask whether any row still names an object.
export default defineSchema({
    accountDeletionJobs: defineTable({
        errorCode: v.union(v.string(), v.null()),
        expiresAt: v.number(),
        googleReceiptChallengeHash: v.union(v.string(), v.null()),
        googleReceiptDigest: v.union(v.string(), v.null()),
        phase: v.union(
            v.literal("prepared"),
            v.literal("providersRevoked"),
            v.literal("purged"),
            v.literal("billingErased"),
            v.literal("authDeleting"),
            v.literal("complete")
        ),
        provider: v.union(
            v.literal("appleServerRevoked"),
            v.literal("credentialOnly"),
            v.literal("googleLocalReceipt"),
            v.null()
        ),
        secretHash: v.string(),
        tokenIdentifier: v.optional(v.string()),
        userId: v.union(v.string(), v.null()),
    })
        .index("by_secretHash", ["secretHash"])
        .index("by_phase_and_expiresAt", ["phase", "expiresAt"])
        .index("by_userId", ["userId"]),

    accounts: defineTable({ ...replicated, ...accountFields })
        .index("by_user_and_seq", ["userId", "seq"])
        .index("by_user_and_localId", ["userId", "localId"])
        .index("by_user_and_imageKey", ["userId", "imageKey"]),

    // `key` is the row identity in place of `localId`, and keys are never deleted, hence no tombstone.
    // Only account-scoped keys sync; the "This device" settings and `firstLaunch` stay local by design.
    appMeta: defineTable({
        deviceId: v.string(),
        key: v.string(),
        seq: v.number(),
        updatedAt: v.number(),
        userId: v.string(),
        ...appMetaFields,
    })
        .index("by_user_and_seq", ["userId", "seq"])
        .index("by_user_and_key", ["userId", "key"]),

    // SQLite keeps `categoryId` unique but Convex cannot: two offline devices can each create one; the client merges.
    budgets: defineTable({ ...replicated, ...budgetFields })
        .index("by_user_and_seq", ["userId", "seq"])
        .index("by_user_and_localId", ["userId", "localId"]),

    categories: defineTable({ ...replicated, ...categoryFields })
        .index("by_user_and_seq", ["userId", "seq"])
        .index("by_user_and_localId", ["userId", "localId"]),

    enrichmentJobs: defineTable({
        categoryTree: v.array(v.object({ children: v.array(v.string()), name: v.string() })),
        currency: v.optional(v.string()),
        grounded: v.boolean(),
        income: v.boolean(),
        localId: v.string(),
        locale: v.optional(v.string()),
        name: v.string(),
        regionCode: v.optional(v.string()),
        result: v.optional(enrichmentResult),
        status: v.union(v.literal("queued"), v.literal("done"), v.literal("failed")),
        userId: v.string(),
    })
        .index("by_user_and_localId", ["userId", "localId"])
        .index("by_user_and_status", ["userId", "status"]),

    // Quoted per USD. `date` is UTC `YYYY-MM-DD` so a descending index seek finds the newest rate on or before a
    // day, which covers the provider's weekend and holiday gaps.
    exchangeRates: defineTable({
        date: v.string(),
        fetchedAt: v.number(),
        quote: v.string(),
        rate: v.number(),
        rateType: marketRateType,
        source: rateSource,
    })
        .index("by_quote_and_rateType_and_date", ["quote", "rateType", "date"])
        .index("by_date", ["date"]),

    // No key, user or merchant name: only what was spent, so the table can never become a per-merchant spend trail.
    groundedSpend: defineTable({
        actualMicros: v.number(),
        at: v.number(),
        chargedMicros: v.number(),
        inputTokens: v.number(),
        outputTokens: v.number(),
        published: v.boolean(),
        searchCalls: v.number(),
    }).index("by_at", ["at"]),

    // Singleton by convention only, for the same reason `budgets` is.
    mainBudget: defineTable({ ...replicated, ...mainBudgetFields })
        .index("by_user_and_seq", ["userId", "seq"])
        .index("by_user_and_localId", ["userId", "localId"]),

    // Shared across users, so exact-key reads only: a prefix or range index would be an enumeration surface.
    merchantKnowledge: defineTable({
        categoryName: v.string(),
        domain: v.string(),
        emoji: v.union(v.string(), v.null()),
        expiresAt: v.optional(v.number()),
        key: v.string(),
        merchantName: v.optional(v.string()),
        modelId: v.string(),
        parentCategoryName: v.union(v.string(), v.null()),
        resolvedAt: v.number(),
        source: v.optional(v.union(v.literal("model"), v.literal("web"))),
        tags: v.array(v.string()),
    }).index("by_key", ["key"]),

    // Only written without R2 credentials, because Convex storage allocates its own id. Reads route per key, so
    // pre-R2 photos keep resolving. No `userId`: `ownsPhotoKey` checks the owner the key carries.
    photoObjects: defineTable({
        key: v.string(),
        storageId: v.id("_storage"),
    })
        .index("by_key", ["key"])
        .index("by_storageId", ["storageId"]),

    // `r2.listMetadata` takes no prefix, so an account's total cannot come from the bucket. One row per object,
    // not a counter, because re-uploading a name replaces the object.
    photoSizes: defineTable({
        bytes: v.number(),
        key: v.string(),
        userId: v.string(),
    })
        .index("by_user", ["userId"])
        .index("by_user_and_bytes", ["userId", "bytes"])
        .index("by_key", ["key"]),

    installmentPlans: defineTable({ ...replicated, ...installmentPlanFields })
        .index("by_user_and_seq", ["userId", "seq"])
        .index("by_user_and_localId", ["userId", "localId"]),

    // Paid status is derived on the device, never stored.
    installments: defineTable({ ...replicated, ...installmentFields })
        .index("by_user_and_seq", ["userId", "seq"])
        .index("by_user_and_localId", ["userId", "localId"]),

    outsidePayments: defineTable({ ...replicated, ...outsidePaymentFields })
        .index("by_user_and_seq", ["userId", "seq"])
        .index("by_user_and_localId", ["userId", "localId"]),

    outsideMoves: defineTable({ ...replicated, ...outsideMoveFields })
        .index("by_user_and_seq", ["userId", "seq"])
        .index("by_user_and_localId", ["userId", "localId"]),

    savingsGoals: defineTable({ ...replicated, ...savingsGoalFields })
        .index("by_user_and_seq", ["userId", "seq"])
        .index("by_user_and_localId", ["userId", "localId"]),

    syncState: defineTable({
        nextSeq: v.number(),
        userId: v.string(),
    }).index("by_user", ["userId"]),

    tags: defineTable({ ...replicated, ...tagFields })
        .index("by_user_and_seq", ["userId", "seq"])
        .index("by_user_and_localId", ["userId", "localId"]),

    transactionPhotos: defineTable({ ...replicated, ...transactionPhotoFields })
        .index("by_user_and_seq", ["userId", "seq"])
        .index("by_user_and_localId", ["userId", "localId"])
        .index("by_user_and_imageKey", ["userId", "imageKey"]),

    // No rows means the entry is attributed wholly to its own `categoryId`.
    transactionSplits: defineTable({ ...replicated, ...transactionSplitFields })
        .index("by_user_and_seq", ["userId", "seq"])
        .index("by_user_and_localId", ["userId", "localId"]),

    transactionTags: defineTable({ ...replicated, ...transactionTagFields })
        .index("by_user_and_seq", ["userId", "seq"])
        .index("by_user_and_localId", ["userId", "localId"]),

    // `amount` is float64 on both sides (SQLite REAL), so it round-trips bit for bit. `amountUsd` and the rate
    // fields are frozen at write and move only with `amount`, `currency` and `date`; nothing here recomputes them.
    transactions: defineTable({ ...replicated, ...transactionColumns })
        .index("by_user_and_seq", ["userId", "seq"])
        .index("by_user_and_localId", ["userId", "localId"])
        .index("by_user_and_imageKey", ["userId", "imageKey"])
        .index("by_user_and_deletedAt_and_date", ["userId", "deletedAt", "date"])
        .index("by_user_and_deletedAt_and_recurringType", ["userId", "deletedAt", "recurringType"]),

    transfers: defineTable({ ...replicated, ...transferFields })
        .index("by_user_and_seq", ["userId", "seq"])
        .index("by_user_and_localId", ["userId", "localId"])
        .index("by_user_and_deletedAt_and_date", ["userId", "deletedAt", "date"]),
});
