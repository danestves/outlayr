import type { EntryRateType } from "@outlayr/money/rates";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Schema from "effect/Schema";

import { getAccountById, rememberLastUsedAccount } from "@/data/accounts-core";
import { attachmentsRepo } from "@/data/attachments-core";
import type { AttachmentDraft } from "@/data/attachments-core";
import { suggestedCardFee } from "@/data/card-fees-core";
import type { CardFeeInput } from "@/data/card-fees-core";
import { ensureCategoryByName } from "@/data/categories-core";
import { queueEnrichment } from "@/data/enrichment-queue-core";
import { backfillRecurring } from "@/data/recurrence-backfill";
import { readRemoteEnrichment } from "@/data/settings-core";
import { splitsRepo } from "@/data/splits-core";
import { tagsRepo } from "@/data/tags-core";
import { transactionsRepo } from "@/data/transactions-core";
import type { Transaction, TransactionInput } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import type { PaidVia } from "@/domain/paid-via";
import type { Allocation } from "@/domain/split";
import type { PendingCategory } from "@/hooks/use-transaction-enrichment";
import { sendEnrichmentQueue } from "@/lib/enrichment-queue";
import { freshEntries } from "@/lib/fresh-entries";
import { posthog } from "@/lib/posthog";
import { syncSubscriptionReminders } from "@/lib/subscription-reminder-sync";

import { logged } from "./entry-save";

export class PendingCategoryError extends Schema.TaggedError<PendingCategoryError>()("PendingCategoryError", {
    cause: Schema.Defect(),
    income: Schema.Boolean,
}) {
    override get message(): string {
        return `The pending ${this.income ? "income" : "expense"} category could not be created`;
    }
}

type Step = Effect.Effect<unknown, unknown>;

export interface EntrySchedule {
    coefficient: number;
    endDate: Date | null;
    leadDays: number | null;
    type: number;
}

export interface EntryDraft {
    accountId: string | null;
    amount: number;
    categoryId: string | null;
    currency: string | null;
    customColor?: string | null;
    date: Date;
    details: string | null;
    emoji?: string | null;
    exchangeRate?: number | null;
    exchangeRateType?: EntryRateType | null;
    fee?: (categoryId: string | null) => CardFeeInput | null | undefined;
    icon?: string | null;
    imageColor?: string | null;
    imageUri?: string | null;
    income: boolean;
    merchant: string;
    paidVia?: PaidVia | null;
    receipt?: string | null;
    schedule: EntrySchedule | null;
}

type ExtrasWrite = ReturnType<typeof writeExtras>;

export interface EntryCommit {
    attachments?: readonly AttachmentDraft[];
    carry?: (id: string) => Step | null;
    db: Database;
    draft: EntryDraft;
    initial?: Transaction;
    installments?: (
        entry: TransactionInput,
        writeExtras: (id: string) => ExtrasWrite
    ) => Effect.Effect<string, unknown> | null;
    pendingCategory?: {
        siblings: readonly { id: string; name: string | null; parentId: string | null }[];
        value: PendingCategory;
    };
    source: "form" | "scan" | "voice";
    splits?: { allocations: readonly Allocation[]; decimals: number };
    tags?: { pendingNames: readonly string[]; tagIds: readonly string[] };
}

function rememberedFee(db: Database, draft: EntryDraft, categoryId: string | null): CardFeeInput | null {
    if (draft.income) {
        return null;
    }
    return suggestedCardFee(db, {
        account: draft.accountId ? getAccountById(db, draft.accountId) : null,
        categoryId,
        currency: draft.currency,
        merchant: draft.merchant,
    });
}

function entryInput(db: Database, draft: EntryDraft, categoryId: string | null): TransactionInput {
    const { schedule } = draft;
    const input: TransactionInput = {
        accountId: draft.accountId,
        amount: draft.amount,
        categoryId,
        currency: draft.currency,
        customColor: draft.customColor,
        date: draft.date,
        details: draft.details,
        emoji: draft.emoji,
        fee: draft.fee === undefined ? rememberedFee(db, draft, categoryId) : draft.fee(categoryId),
        icon: draft.icon,
        imageColor: draft.imageColor,
        imageUri: draft.imageUri,
        income: draft.income,
        note: draft.merchant,
        onceRecurring: schedule !== null,
        paidVia: draft.paidVia,
        receipt: draft.receipt,
        recurringCoefficient: schedule === null ? 1 : Math.max(1, schedule.coefficient),
        recurringEndDate: schedule?.endDate ?? null,
        recurringType: schedule?.type ?? RECURRING_TYPE.none,
        reminderLeadDays: schedule?.leadDays ?? null,
    };
    // Absent, not undefined: an untouched rate keeps what is stored, and `keptCanonical` reads the pair as a unit.
    if (draft.exchangeRate !== undefined) {
        input.exchangeRate = draft.exchangeRate;
    }
    if (draft.exchangeRateType !== undefined) {
        input.exchangeRateType = draft.exchangeRateType;
    }
    return input;
}

const createPendingCategory = Effect.fn("EntryCommit.createPendingCategory")(function* createPendingCategory(
    db: Database,
    income: boolean,
    pending: NonNullable<EntryCommit["pendingCategory"]>
) {
    const { siblings, value } = pending;
    const parentId =
        value.parentName == null
            ? null
            : (siblings.find((candidate) => candidate.parentId == null && candidate.name === value.parentName)?.id ??
              null);
    return yield* ensureCategoryByName(db, value.name, income, value.icon, value.color, {
        emoji: value.emoji,
        parentId,
    }).pipe(Effect.mapError((cause) => new PendingCategoryError({ cause, income })));
});

const materializeTagIds = Effect.fn("EntryCommit.materializeTagIds")(function* materializeTagIds(
    db: Database,
    tagIds: readonly string[],
    pendingTagNames: readonly string[]
) {
    const materialized = [...tagIds];
    // `ensureTag` matches before inserting with no unique constraint behind it, so two pending names that normalize to
    // the same tag would each insert a row if these ran concurrently.
    for (const tagName of pendingTagNames) {
        const tagId = yield* tagsRepo.ensureTag(db, tagName);
        if (tagId != null && !materialized.includes(tagId)) {
            materialized.push(tagId);
        }
    }
    return materialized;
});

const writeExtras = Effect.fn("EntryCommit.writeExtras")(function* writeExtras(commit: EntryCommit, id: string) {
    const { db } = commit;
    if (commit.tags !== undefined) {
        const tagIds = yield* materializeTagIds(db, commit.tags.tagIds, commit.tags.pendingNames);
        yield* tagsRepo.writeTagsFor(db, id, tagIds);
    }
    if (commit.splits !== undefined) {
        yield* splitsRepo.writeSplit(db, id, commit.draft.amount, commit.splits.allocations, commit.splits.decimals);
    }
    if (commit.attachments !== undefined) {
        yield* attachmentsRepo.writeFor(db, id, commit.attachments);
    }
});

const writeEntry = Effect.fn("EntryCommit.write")(function* writeEntry(commit: EntryCommit) {
    const { db, draft, initial } = commit;
    const categoryId =
        commit.pendingCategory === undefined
            ? draft.categoryId
            : yield* createPendingCategory(db, draft.income, commit.pendingCategory);
    const entry = entryInput(db, draft, categoryId);
    const inSameTransaction = (id: string) => writeExtras(commit, id);

    const ordering = commit.installments?.(entry, inSameTransaction) ?? null;
    if (ordering !== null) {
        return yield* ordering;
    }
    if (initial !== undefined) {
        yield* transactionsRepo.update(db, initial.id, entry, { inSameTransaction });
        return initial.id;
    }
    return yield* transactionsRepo.create(db, entry, { inSameTransaction });
});

const queueLookup = Effect.fn("EntryCommit.queueLookup")(function* queueLookup(db: Database, id: string) {
    if (!(yield* readRemoteEnrichment(db))) {
        return;
    }
    yield* queueEnrichment(db, id);
    yield* Effect.ignore(sendEnrichmentQueue(db));
});

const detached = (message: string, step: Step) => Effect.forkDetach(logged(message)(step));

export const commitEntry = Effect.fn("EntryCommit.commit")(function* commitEntry(commit: EntryCommit) {
    const saved = yield* writeEntry(commit).pipe(Effect.exit);
    if (Exit.isFailure(saved)) {
        const failure = Cause.squash(saved.cause);
        const missingCategory = failure instanceof PendingCategoryError;
        yield* Effect.logError(
            missingCategory ? "Failed to create the pending category" : "Failed to save transaction",
            failure
        );
        return { kind: "failed", missingCategory } as const;
    }
    const id = saved.value;
    const { db, draft } = commit;
    const mode = commit.initial === undefined ? "create" : "edit";
    if (mode === "create") {
        freshEntries.mark(id);
    }
    posthog?.capture("transaction_saved", {
        has_split: (commit.splits?.allocations.length ?? 0) > 0,
        is_subscription: draft.schedule !== null,
        mode,
        source: commit.source,
        transaction_type: draft.income ? "income" : "expense",
    });
    // The row is committed: nothing below may reopen a form that would write it twice.
    if (draft.accountId !== null) {
        yield* logged("Failed to remember the account")(rememberLastUsedAccount(db, draft.accountId));
    }
    if (mode === "create" && draft.merchant.trim() !== "") {
        yield* logged("Failed to queue the merchant lookup")(queueLookup(db, id));
    }
    const carry = commit.carry?.(id) ?? null;
    if (carry !== null) {
        yield* detached("Failed to carry the merchant lookup to its other rows", carry);
    }
    let scheduleFailed = false;
    if (draft.schedule !== null) {
        scheduleFailed = yield* backfillRecurring(db, id).pipe(
            Effect.as(false),
            Effect.catchCause((cause) =>
                Effect.logError("Failed to back-fill the subscription", cause).pipe(Effect.as(true))
            )
        );
    }
    // Scheduled now: the next resume may come after the due date.
    yield* detached("Subscription reminder sync failed", syncSubscriptionReminders(db));
    return { id, kind: "saved", scheduleFailed } as const;
});
