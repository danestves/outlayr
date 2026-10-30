import { merchantKey } from "@outlayr/money/merchant-key";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";

import { applyMerchantToSiblings } from "@/data/merchant-siblings-core";
import { setBoolSetting } from "@/data/settings-core";
import { tagIdsForQuery, tagsRepo } from "@/data/tags-core";
import { getTransactionById } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import { enableReminderStep } from "@/domain/reminder";
import { outboundHttp } from "@/lib/http";
import { fetchMerchantImage } from "@/lib/logo-fetch";
import { Reminders } from "@/lib/reminders";
import { askForReview } from "@/lib/review-prompt";
import { carriedLogo, discardStoredPhoto, entryMedia } from "@/state/entry-commands";
import { commitEntry } from "@/state/entry-commit";
import type { EntryCommit } from "@/state/entry-commit";
import { logged } from "@/state/entry-save";

export interface SaveEntryInput {
    commit: EntryCommit;
    onMissingCategory: () => void;
    onSaveFailed: () => void;
    onSaved: () => boolean;
    onScheduleFailed: () => void;
}

export const saveEntry = Effect.fn("TransactionForm.saveEntry")(function* saveEntry(input: SaveEntryInput) {
    const outcome = yield* commitEntry(input.commit);
    if (outcome.kind === "failed") {
        if (outcome.missingCategory) {
            input.onMissingCategory();
        } else {
            input.onSaveFailed();
        }
        return false;
    }
    if (outcome.scheduleFailed) {
        input.onScheduleFailed();
        return true;
    }
    if (input.onSaved()) {
        yield* Effect.forkDetach(logged("Failed to ask for a review")(askForReview(input.commit.db)));
    }
    return true;
});

export interface LogoPorts {
    apply: (photoUri: string, hue: string | null) => void;
    blocked: () => boolean;
    currentMerchant: () => string;
    dropSuggested: () => void;
    forced: () => boolean;
    isLatest: (ticket: number) => boolean;
    nextTicket: () => number;
}

export const attachMerchantLogo = Effect.fn("TransactionForm.attachLogo")(function* attachMerchantLogo(
    ports: LogoPorts,
    domain: string | null
) {
    if (ports.blocked()) {
        return false;
    }
    const ticket = ports.nextTicket();
    const askedFor = merchantKey(ports.currentMerchant());
    const stale = () => !ports.isLatest(ticket) || merchantKey(ports.currentMerchant()) !== askedFor || ports.blocked();
    if (domain == null) {
        ports.dropSuggested();
        return false;
    }
    const outcome = yield* fetchMerchantImage({
        domain,
        name: ports.currentMerchant(),
        refresh: ports.forced(),
    });
    if (stale()) {
        return false;
    }
    if (outcome.kind !== "logo") {
        ports.dropSuggested();
        return false;
    }
    const photoUri = yield* entryMedia
        .persistLogoBytes(outcome.bytes)
        .pipe(Effect.catchCause(() => Effect.succeed(null)));
    if (photoUri === null) {
        return false;
    }
    const hues = yield* entryMedia.glowFromImage(photoUri);
    if (stale()) {
        // Nothing will name this file: the row moved on, or the form unmounted (which bumps the ticket).
        discardStoredPhoto(photoUri);
        return false;
    }
    ports.apply(photoUri, hues[0] ?? null);
    return true;
});

export interface CarryInput {
    db: Database;
    forCurrency: string | null;
    forIncome: boolean;
    globalCurrency: string;
    merchant: string;
    read: () => { carryCategory: boolean; carryTags: boolean; domain: string | null };
    savedId: string;
}

export const carryLookup = Effect.fn("TransactionForm.carryLookup")(function* carryLookup(input: CarryInput) {
    const { db, merchant, savedId } = input;
    const saved = getTransactionById(db, savedId);
    const { carryCategory, carryTags, domain } = input.read();
    const persistLogo =
        domain == null
            ? null
            : carriedLogo(domain, merchant).pipe(
                  Effect.map((imageUri) => ({ imageColor: saved?.imageColor ?? null, imageUri })),
                  Effect.provide(outboundHttp),
                  Effect.catchCause((cause) => Effect.fail(Cause.squash(cause)))
              );
    const carriedTags = carryTags ? yield* Effect.tryPromise(() => tagIdsForQuery(db, savedId)) : [];
    yield* applyMerchantToSiblings(db, {
        categoryId: carryCategory ? (saved?.categoryId ?? null) : null,
        currency: input.forCurrency,
        defaultCurrency: input.globalCurrency,
        discard: discardStoredPhoto,
        excludeId: savedId,
        income: input.forIncome,
        key: merchantKey(merchant),
        persistLogo,
        tagIds: carriedTags.map((row) => row.tagId),
    });
});

export const createTagEntry = Effect.fn("TransactionForm.createTag")(function* createTagEntry(
    db: Database,
    name: string,
    onCreated: (id: string) => void
) {
    const id = yield* tagsRepo.ensureTag(db, name);
    if (id) {
        onCreated(id);
    }
    return id;
});

export interface ReminderChoice {
    onDeclined: () => void;
    onDenied: () => void;
}

// Picking a lead here is the intent behind the master switch: a ledger whose owner never opened the notifications
// screen would otherwise arm nothing.
export const confirmRemindersAllowed = Effect.fn("TransactionForm.confirmReminders")(function* confirmRemindersAllowed(
    db: Database,
    choice: ReminderChoice
) {
    const reminders = yield* Reminders;
    const existing = yield* reminders.permission();
    if (enableReminderStep(existing) === "open-settings") {
        choice.onDenied();
        return;
    }
    const granted = existing === "granted" || (yield* reminders.request()) === "granted";
    if (!granted) {
        choice.onDeclined();
        return;
    }
    yield* setBoolSetting(db, "subscriptionReminders", true);
});
