import { merchantKey } from "@outlayr/money/merchant-key";
import { anchorDayOf, nextDate, RECURRING_TYPE } from "@outlayr/money/recurrence";

import { holdsAutolog } from "@/domain/autolog-cap";
import { detectCurrency } from "@/domain/detect-currency";
import { matchCardAccount } from "@/domain/match-card-account";
import type {
    AutologAccess,
    AutologUsage,
    PendingWriteLedgerEntry as LedgerEntry,
    WalletCard,
} from "@/domain/meta-values";
import { cleanMerchant, mergeNotificationRead, parseNotification } from "@/domain/parse-notification";
import { translateNow } from "@/i18n/runtime";
import type { NotificationReads } from "@/lib/notification-read";
import { autologSourceOf } from "@/lib/queue-file";
import type { AutologSource, PendingWrite } from "@/lib/queue-file";

import { MIN_KEY_LENGTH } from "./enrichment-queue-core";
import { cardStatus } from "./wallet-state-core";

// One purchase can fire twice (authorize, then settle) as two intents; ten minutes covers that and a retry, and
// `PushLedger` in `app-intents/SharedStore.swift` copies it. Not widened to next-day settlement: that would collapse
// a real second purchase, and a missing row is unrecoverable where a duplicate isn't.
export const WALLET_DEDUPE_WINDOW_MS = 10 * 60 * 1000;

const SETTLE_REPEAT_WINDOW_MS = 4 * 24 * 60 * 60 * 1000;
const REPEATS_ON_SETTLE = /payoneer/i;

const SUBSCRIPTION_SETTLE_WINDOW_MS = 4 * 24 * 60 * 60 * 1000;
const SUBSCRIPTION_PRICE_BAND = { max: 2, min: 0.5 } as const;
export const AMOUNT_EPSILON = 0.005;
const MAX_MISSED_LANDINGS = 60;

export interface MatchedAccount {
    currency: string;
    id: string;
}

export interface FiledRow {
    accountId: string | null;
    amount: number;
    currency: string | null;
    date: Date;
    id: string;
    income: boolean;
    note: string;
}

export interface SubscriptionRow {
    accountId: string | null;
    amount: number;
    currency: string | null;
    date: Date;
    id: string;
    note: string;
    recurringAnchorDay: number | null;
    recurringCoefficient: number;
    recurringEndDate: Date | null;
    recurringType: number;
}

export interface SettledOccurrence {
    amount: number;
    currency: string;
    date: Date;
    id: string;
    note: string;
    recurringAnchorDay: number | null;
}

export interface PendingWriteFacts {
    access: AutologAccess;
    banks: readonly { currency: string; id: string; name: string }[];
    cards: readonly WalletCard[];
    category: { fallback: string | null; known: string | null; lookups: boolean };
    filed: readonly FiledRow[];
    ledger: readonly LedgerEntry[];
    ledgerCurrency: string;
    subscriptions: readonly SubscriptionRow[];
    usage: AutologUsage;
}

export interface Filing {
    card: { text: string; waits: boolean } | null;
    key: string | null;
    source: string | undefined;
    wallet: { push: boolean } | null;
}

export type PendingWriteDecision =
    | { kind: "duplicate"; relink: boolean; txId: string }
    | { kind: "drop" }
    | { attach: string | null; filing: Filing; kind: "merge"; txId: string }
    | { filing: Filing; kind: "settle"; occurrence: SettledOccurrence }
    | { currency: string; filing: Filing; kind: "land"; landing: Date; otherwise: Fresh; parentId: string }
    | Fresh;

type Fresh =
    | { kind: "hold" }
    | {
          account: MatchedAccount | null;
          autolog: AutologSource;
          categoryId: string | null;
          currency: string | null;
          filing: Filing;
          kind: "file";
          logoCandidate: boolean;
          lookup: boolean;
          note: string;
      };

// The card is the sure sign; the key prefixes cover automations built before the card parameter existed.
function fromAutomation(write: PendingWrite): boolean {
    return Boolean(write.card?.trim()) || /^(?:wallet|notification):/.test(write.dedupeKey ?? "");
}

function sourceOf(write: PendingWrite): string | null {
    const kind = /^(wallet|notification):/.exec(write.dedupeKey ?? "")?.[1];
    return kind ? `${kind}:${write.card?.trim().toLowerCase() ?? ""}` : null;
}

// A push nothing could name files under the app that posted it, never under its category. A card the text names
// (Google Wallet's "Visa ••1234") is not an app. The name is a placeholder, so no merchant or logo lookup sees it.
function filedName(write: PendingWrite): string {
    if (!write.text || write.note.trim()) {
        return write.note;
    }
    const app = write.card?.trim();
    return app && !write.text.includes(app) ? app : translateNow("settings.integrations.unnamedPush");
}

export function readNotification(queued: PendingWrite, reads: NotificationReads | undefined): PendingWrite | null {
    if (!queued.text) {
        return queued;
    }
    const parsed = mergeNotificationRead(queued.text, parseNotification(queued.text), reads?.get(queued.id) ?? null);
    if (!parsed) {
        return null;
    }
    return {
        ...queued,
        amount: parsed.amount,
        amountText: parsed.amountText,
        income: queued.income || parsed.income,
        note: parsed.merchant ?? "",
    };
}

const dateOf = (entry: LedgerEntry) => entry.date ?? entry.at;

// The enqueue id matches with no window (the same id means a replayed queue file); the purchase key is windowed
// because two runs naming one purchase are separate intents.
export function alreadyApplied(ledger: readonly LedgerEntry[], write: PendingWrite): LedgerEntry | null {
    const replayed = ledger.find((entry) => entry.id === write.id);
    if (replayed) {
        return replayed;
    }
    const key = write.dedupeKey?.trim();
    if (!key) {
        return null;
    }
    return (
        ledger.find((entry) => entry.key === key && Math.abs(write.date - dateOf(entry)) <= WALLET_DEDUPE_WINDOW_MS) ??
        null
    );
}

function settleRepeatOf(ledger: readonly LedgerEntry[], write: PendingWrite): LedgerEntry | null {
    const key = write.dedupeKey?.trim();
    if (!key || !REPEATS_ON_SETTLE.test(write.card ?? "")) {
        return null;
    }
    const repeated = (first: LedgerEntry) =>
        ledger.some(
            (other) =>
                other.txId === first.txId &&
                other.id !== first.id &&
                dateOf(other) - dateOf(first) > WALLET_DEDUPE_WINDOW_MS
        );
    return (
        ledger.find(
            (entry) =>
                entry.key === key && Math.abs(write.date - dateOf(entry)) <= SETTLE_REPEAT_WINDOW_MS && !repeated(entry)
        ) ?? null
    );
}

function filedBefore(write: PendingWrite, facts: PendingWriteFacts): LedgerEntry | null {
    const seen = alreadyApplied(facts.ledger, write);
    if (!seen) {
        return settleRepeatOf(facts.ledger, write);
    }
    return facts.filed.some((row) => row.id === seen.txId) ? seen : null;
}

function cardAccount(write: PendingWrite, facts: PendingWriteFacts) {
    const card = write.card?.trim();
    if (!card) {
        return { account: null, asks: false };
    }
    const status = cardStatus(card, facts.cards, facts.banks);
    const charged = write.currency?.trim().toUpperCase() || detectCurrency(write.amountText);
    const same = charged ? facts.banks.filter((row) => row.currency === charged) : [];
    const account =
        status.account ?? (status.asks ? same.find((row) => row.id === matchCardAccount(card, same)) : undefined);
    return {
        account: account ? { currency: account.currency, id: account.id } : null,
        asks: status.asks && !account,
    };
}

// "$" is on 22 currencies, so an ambiguous symbol defers to the card's account currency before staying null.
function writeCurrency(write: PendingWrite, account: MatchedAccount | null): string | null {
    const pinned = write.currency?.trim().toUpperCase();
    if (pinned) {
        return pinned;
    }
    return detectCurrency(write.amountText) ?? account?.currency ?? null;
}

function merchantOf(note: string): string {
    return cleanMerchant(note)?.toLowerCase() ?? "";
}

function sameCharge(write: PendingWrite, facts: PendingWriteFacts, account: MatchedAccount | null, code: string) {
    const source = sourceOf(write);
    if (!source) {
        return null;
    }
    const { ledger } = facts;
    const fed = new Set(ledger.filter((entry) => entry.source === source).map((entry) => entry.txId));
    const ids = new Set(
        ledger
            .filter(
                (entry) =>
                    entry.source !== undefined &&
                    entry.source !== source &&
                    !fed.has(entry.txId) &&
                    Math.abs(write.date - dateOf(entry)) <= WALLET_DEDUPE_WINDOW_MS
            )
            .map((entry) => entry.txId)
    );
    const merchant = merchantOf(write.note);
    const [match] = facts.filed
        .filter((row) => {
            if (!ids.has(row.id) || row.income !== write.income) {
                return false;
            }
            if (account && row.accountId && row.accountId !== account.id) {
                return false;
            }
            if (row.currency === code) {
                return Math.abs(row.amount - write.amount) <= AMOUNT_EPSILON;
            }
            const filed = merchantOf(row.note);
            return merchant !== "" && filed !== "" && (filed.includes(merchant) || merchant.includes(filed));
        })
        .sort((a, b) => Math.abs(a.date.getTime() - write.date) - Math.abs(b.date.getTime() - write.date));
    return match ?? null;
}

export function settleWindow(at: number) {
    return { hi: at + SUBSCRIPTION_SETTLE_WINDOW_MS, lo: at - SUBSCRIPTION_SETTLE_WINDOW_MS };
}

function openOccurrence(write: PendingWrite, facts: PendingWriteFacts, account: MatchedAccount | null, code: string) {
    const taken = new Set(facts.ledger.map((entry) => entry.txId));
    const { hi, lo } = settleWindow(write.date);
    const rows = facts.subscriptions.filter((row) => row.currency === code);
    const inWindow = (at: Date) => at.getTime() >= lo && at.getTime() <= hi;
    const stored = rows.filter((row) => inWindow(row.date)).map((row) => ({ ...row, landing: null }));
    const landings = rows.flatMap((row) => {
        if (row.recurringType === RECURRING_TYPE.none) {
            return [];
        }
        let landing = nextDate(row.date, row.recurringType, row.recurringCoefficient, anchorDayOf(row));
        for (let missed = 0; landing && landing.getTime() < lo && missed < MAX_MISSED_LANDINGS; missed += 1) {
            landing = nextDate(landing, row.recurringType, row.recurringCoefficient, anchorDayOf(row));
        }
        const ended = row.recurringEndDate != null && landing != null && landing > row.recurringEndDate;
        return landing && inWindow(landing) && !ended ? [{ ...row, date: landing, landing }] : [];
    });
    const merchant = write.note.trim().toLowerCase();
    const named = (note: string) => {
        const filed = note.trim().toLowerCase();
        return merchant !== "" && filed !== "" && (filed.includes(merchant) || merchant.includes(filed));
    };
    const open = [...stored, ...landings].filter(
        (row) => !taken.has(row.id) && (!account || !row.accountId || row.accountId === account.id)
    );
    const byDate = (a: { date: Date }, b: { date: Date }) =>
        Math.abs(a.date.getTime() - write.date) - Math.abs(b.date.getTime() - write.date);
    const samePrice = open
        .filter((row) => Math.abs(row.amount - write.amount) <= AMOUNT_EPSILON)
        .sort((a, b) => Number(named(b.note)) - Number(named(a.note)) || byDate(a, b));
    const repriced = open
        .filter((row) => {
            const ratio = write.amount / row.amount;
            return named(row.note) && ratio >= SUBSCRIPTION_PRICE_BAND.min && ratio <= SUBSCRIPTION_PRICE_BAND.max;
        })
        .sort(byDate);
    return samePrice[0] ?? repriced[0] ?? null;
}

export function decidePendingWrite(write: PendingWrite, facts: PendingWriteFacts): PendingWriteDecision {
    const duplicate = filedBefore(write, facts);
    if (duplicate) {
        return { kind: "duplicate", relink: duplicate.id !== write.id, txId: duplicate.txId };
    }
    const { fallback, known, lookups } = facts.category;
    const lookup = known == null && lookups && merchantKey(write.note).length >= MIN_KEY_LENGTH;
    const categoryId = known ?? (lookup ? null : fallback);
    if (categoryId == null && !lookup) {
        return { kind: "drop" };
    }
    const { account, asks } = cardAccount(write, facts);
    const currency = writeCurrency(write, account);
    const code = currency ?? facts.ledgerCurrency;
    const automated = fromAutomation(write);
    const card = write.card?.trim();
    const filing: Filing = {
        card: card ? { text: card, waits: asks && Boolean(currency) } : null,
        key: write.dedupeKey?.trim() || null,
        source: sourceOf(write) ?? undefined,
        wallet: automated ? { push: Boolean(write.text) } : null,
    };
    const twin = automated ? sameCharge(write, facts, account, code) : null;
    if (twin) {
        return { attach: !twin.accountId && account ? account.id : null, filing, kind: "merge", txId: twin.id };
    }
    const autolog = autologSourceOf(write);
    const note = filedName(write);
    const fresh: Fresh = holdsAutolog(facts.usage, facts.access, autolog, write.date)
        ? { kind: "hold" }
        : {
              account,
              autolog,
              categoryId,
              currency,
              filing,
              kind: "file",
              logoCandidate: note === write.note,
              lookup,
              note,
          };
    const occurrence = automated ? openOccurrence(write, facts, account, code) : null;
    if (!occurrence) {
        return fresh;
    }
    if (occurrence.landing) {
        return {
            currency: code,
            filing,
            kind: "land",
            landing: occurrence.landing,
            otherwise: fresh,
            parentId: occurrence.id,
        };
    }
    return {
        filing,
        kind: "settle",
        occurrence: {
            amount: occurrence.amount,
            currency: code,
            date: occurrence.date,
            id: occurrence.id,
            note: occurrence.note,
            recurringAnchorDay: occurrence.recurringAnchorDay,
        },
    };
}
