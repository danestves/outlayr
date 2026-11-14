import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { transaction } from "@/db/transaction";
import type { CardAccountCandidate } from "@/domain/match-card-account";
import { matchCardAccount } from "@/domain/match-card-account";
import type { NotificationText, RepricedSubscription, WalletCard } from "@/domain/meta-values";

import { accountsRepo, getAccountById } from "./accounts-core";
import { Meta } from "./app-meta-core";
import { transactionsRepo } from "./transactions-core";

class WalletStateError extends Schema.TaggedError<WalletStateError>()("WalletStateError", {
    cause: Schema.Defect(),
    operation: Schema.Literals(["account", "write"]),
}) {
    override get message(): string {
        return `Wallet state ${this.operation} failed`;
    }
}

const listBanks = (db: Database) =>
    accountsRepo.listBanks(db).pipe(Effect.mapError((cause) => new WalletStateError({ cause, operation: "account" })));

export const takeRepriced = Effect.fn("WalletState.takeRepriced")(function* takeRepriced(db: Database) {
    const entries = yield* Meta.get(db, "repricedSubscriptions");
    if (entries.length > 0) {
        yield* Meta.set(db, "repricedSubscriptions", []);
    }
    return entries;
});

export const rememberRepriced = Effect.fn("WalletState.rememberRepriced")(function* rememberRepriced(
    db: Database,
    entry: RepricedSubscription
) {
    const kept = yield* Meta.get(db, "repricedSubscriptions");
    yield* Meta.set(db, "repricedSubscriptions", [...kept, entry]);
});

const NOTIFICATION_TEXTS_LIMIT = 5;

export const rememberNotification = Effect.fn("WalletState.rememberNotification")(function* rememberNotification(
    db: Database,
    entry: NotificationText,
    repeatWindowMs: number
) {
    const kept = yield* Meta.get(db, "notificationTexts");
    const last = kept.at(-1);
    if (last?.text === entry.text && Math.abs(entry.at - last.at) <= repeatWindowMs) {
        return;
    }
    const next = [...kept, entry].slice(-NOTIFICATION_TEXTS_LIMIT);
    yield* Meta.set(db, "notificationTexts", next);
});

export const rememberWalletEntry = Effect.fn("WalletState.rememberWalletEntry")(function* rememberWalletEntry(
    db: Database,
    txId: string,
    at: number,
    push: boolean
) {
    yield* Meta.set(db, "lastWalletEntry", push ? { at, push: true, txId } : { at, txId });
});

function cardAccountId(
    text: string,
    cards: readonly WalletCard[],
    candidates: readonly CardAccountCandidate[]
): string | null {
    const picked = cards.find((card) => card.text === text)?.accountId;
    if (picked === null) {
        return null;
    }
    if (picked !== undefined && candidates.some((candidate) => candidate.id === picked)) {
        return picked;
    }
    return matchCardAccount(text, candidates);
}

const updateWalletCards = Effect.fn("WalletState.updateWalletCards")(function* updateWalletCards(
    db: Database,
    change: (cards: WalletCard[]) => WalletCard[]
) {
    const cards = yield* Meta.get(db, "walletCards");
    yield* Meta.set(db, "walletCards", change(cards));
});

export function cardStatus<Account extends CardAccountCandidate>(
    text: string,
    cards: readonly WalletCard[],
    live: readonly Account[]
) {
    const id = cardAccountId(text, cards, live);
    const account = live.find((row) => row.id === id);
    const asks = live.length > 0 && !account && cards.find((card) => card.text === text)?.accountId !== null;
    return { account, asks };
}

export const cardStillAsks = Effect.fn("WalletState.cardStillAsks")(function* cardStillAsks(
    db: Database,
    text: string
) {
    const live = yield* listBanks(db);
    return cardStatus(text, yield* Meta.get(db, "walletCards"), live).asks;
});

export const cardAccount = Effect.fn("WalletState.cardAccount")(function* cardAccount(db: Database, text: string) {
    const live = yield* listBanks(db);
    return cardStatus(text, yield* Meta.get(db, "walletCards"), live).account ?? null;
});

export const pickCardAccount = Effect.fn("WalletState.pickCardAccount")(function* pickCardAccount(
    db: Database,
    text: string,
    accountId: string | null
) {
    if (accountId !== null) {
        const account = yield* Effect.try({
            catch: (cause) => new WalletStateError({ cause, operation: "account" }),
            try: () => getAccountById(db, accountId),
        });
        if (account === null) {
            return;
        }
    }
    yield* transaction(
        db,
        updateWalletCards(db, (cards) => cards.map((card) => (card.text === text ? { ...card, accountId } : card))),
        (cause) => new WalletStateError({ cause, operation: "write" })
    );
    yield* fileWaitingPurchases(db);
});

export const fileWaitingPurchases = Effect.fn("WalletState.fileWaitingPurchases")(function* fileWaitingPurchases(
    db: Database
) {
    const cards = yield* Meta.get(db, "walletCards");
    const waitingCards = cards.filter((card) => (card.waiting?.length ?? 0) > 0);
    if (waitingCards.length === 0) {
        return;
    }
    const live = yield* listBanks(db);
    const attempts = waitingCards.flatMap((card) => {
        const { account } = cardStatus(card.text, cards, live);
        return account
            ? (card.waiting ?? []).map((txId) =>
                  transactionsRepo.attachAccount(db, txId, account).pipe(
                      Effect.map((attached) => (attached ? txId : null)),
                      Effect.catchCause((cause) =>
                          Cause.hasInterruptsOnly(cause) ? Effect.failCause(cause) : Effect.succeed(null)
                      )
                  )
              )
            : [];
    });
    const settled = yield* Effect.all(attempts, { concurrency: "unbounded" });
    const done = new Set(settled.filter((txId) => txId !== null));
    if (done.size === 0) {
        return;
    }
    yield* transaction(
        db,
        updateWalletCards(db, (next) =>
            next.map((card) => (card.waiting ? { ...card, waiting: card.waiting.filter((id) => !done.has(id)) } : card))
        ),
        (cause) => new WalletStateError({ cause, operation: "write" })
    );
});

export const rememberCard = Effect.fn("WalletState.rememberCard")(function* rememberCard(
    db: Database,
    text: string,
    at: number,
    unattached: string | null
) {
    yield* updateWalletCards(db, (cards) => {
        const known = cards.find((card) => card.text === text);
        const seen: WalletCard = known ? { ...known, lastAt: Math.max(known.lastAt, at) } : { lastAt: at, text };
        if (unattached !== null) {
            seen.waiting = [...(seen.waiting ?? []), unattached];
        }
        return known ? cards.map((card) => (card === known ? seen : card)) : [...cards, seen];
    });
});
