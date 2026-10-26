import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { attachmentsRepo } from "@/data/attachments-core";
import type { AttachmentDraft } from "@/data/attachments-core";
import { ensureCategoryByName } from "@/data/categories-core";
import { splitsRepo } from "@/data/splits-core";
import { tagsRepo } from "@/data/tags-core";
import { transactionsRepo } from "@/data/transactions-core";
import type { Transaction, TransactionInput } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import type { Allocation } from "@/domain/split";
import type { PendingCategory } from "@/hooks/use-transaction-enrichment";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand } from "./atom-command";

export class PendingCategoryError extends Schema.TaggedError<PendingCategoryError>()("PendingCategoryError", {
    cause: Schema.Defect(),
    income: Schema.Boolean,
}) {
    override get message(): string {
        return `The pending ${this.income ? "income" : "expense"} category could not be created`;
    }
}

type ExtrasWrite = ReturnType<typeof writeExtras>;

export interface TransactionSaveInput {
    attachments: readonly AttachmentDraft[];
    buildEntry: (categoryId: string | null) => TransactionInput;
    categoryId: string | null;
    db: Database;
    decimals: number;
    initial: Transaction | undefined;
    installments:
        | ((entry: TransactionInput, writeExtras: (id: string) => ExtrasWrite) => Effect.Effect<string, unknown> | null)
        | null;
    mode: "create" | "edit";
    pendingCategory: {
        income: boolean;
        siblings: readonly { id: string; name: string | null; parentId: string | null }[];
        value: PendingCategory;
    } | null;
    splits: readonly Allocation[];
    tags: { pendingNames: readonly string[]; tagIds: readonly string[] } | null;
    total: number;
}

const createPendingCategory = Effect.fn("TransactionSave.createPendingCategory")(function* createPendingCategory(
    db: Database,
    pending: NonNullable<TransactionSaveInput["pendingCategory"]>
) {
    const { income, siblings, value } = pending;
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

const materializeTagIds = Effect.fn("TransactionSave.materializeTagIds")(function* materializeTagIds(
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

const writeExtras = Effect.fn("TransactionSave.writeExtras")(function* writeExtras(
    input: TransactionSaveInput,
    id: string
) {
    const { db } = input;
    if (input.tags !== null) {
        const tagIds = yield* materializeTagIds(db, input.tags.tagIds, input.tags.pendingNames);
        yield* tagsRepo.writeTagsFor(db, id, tagIds);
    }
    yield* splitsRepo.writeSplit(db, id, input.total, input.splits, input.decimals);
    yield* attachmentsRepo.writeFor(db, id, input.attachments);
});

const saveTransaction = Effect.fn("TransactionSave.save")(function* saveTransaction(input: TransactionSaveInput) {
    const { db, initial } = input;
    const categoryId =
        input.pendingCategory === null ? input.categoryId : yield* createPendingCategory(db, input.pendingCategory);
    const entry = input.buildEntry(categoryId);
    const inSameTransaction = (id: string) => writeExtras(input, id);

    const ordering = input.installments?.(entry, inSameTransaction) ?? null;
    if (ordering !== null) {
        return yield* ordering;
    }
    if (input.mode === "edit" && initial) {
        yield* transactionsRepo.update(db, initial.id, entry, { inSameTransaction });
        return initial.id;
    }
    return yield* transactionsRepo.create(db, entry, { inSameTransaction });
});

export const saveTransactionCommand = createRuntimeCommand(appRuntime, {
    execute: saveTransaction,
    label: "ledger:save-transaction",
});
