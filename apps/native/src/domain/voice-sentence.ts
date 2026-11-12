import { localIsoDate } from "./voice-entry";
import type { ResolvedRecurrence, ResolvedVoiceDraft } from "./voice-entry";
import type { LiveDraft } from "./voice-live";

export type SentenceKind = "expense" | "income" | "recurringIncome" | "subscription" | "transfer";

/** `guessed` is what the live parser heard; `confirmed` is what Claude's draft resolved. */
export interface SlotFill<T> {
    mark: "confirmed" | "guessed";
    /** The value a correction replaced, shown struck. */
    was: T | null;
    value: T;
}

type Slot<T> = SlotFill<T> | null;

export interface VoiceSentence {
    account: Slot<string>;
    amount: Slot<number>;
    category: Slot<string>;
    currency: string | null;
    date: Slot<Date>;
    from: Slot<string>;
    merchant: Slot<string>;
    recurrence: Slot<ResolvedRecurrence>;
    /** Null until a word says which kind of entry this is. */
    kind: SentenceKind | null;
    to: Slot<string>;
    wasCurrency: string | null;
}

const slot = <T>(mark: SlotFill<T>["mark"], value: T | null | undefined): Slot<T> =>
    value === null || value === undefined ? null : { mark, value, was: null };

const guess = <T>(found: { value: T } | null) => slot("guessed", found?.value);

const confirm = <T>(value: T | null | undefined) => slot("confirmed", value);

export function sentenceFromLive(live: LiveDraft): VoiceSentence {
    let kind: SentenceKind | null = null;
    if (live.kind?.value === "transfer") {
        kind = "transfer";
    } else if (live.recurrence !== null) {
        kind = live.income?.value === true ? "recurringIncome" : "subscription";
    } else if (live.income?.value === true) {
        kind = "income";
    }
    return {
        account: guess(live.accountId),
        amount: guess(live.amount),
        category: guess(live.categoryId),
        currency: live.currency?.value ?? null,
        date: guess(live.date),
        from: guess(live.fromAccountId),
        merchant: null,
        recurrence: guess(live.recurrence),
        kind,
        to: guess(live.toAccountId),
        wasCurrency: null,
    };
}

export function sentenceFromResolved(draft: ResolvedVoiceDraft): VoiceSentence {
    if (draft.kind === "transfer") {
        return {
            account: null,
            amount: confirm(draft.amount),
            category: null,
            currency: draft.currency,
            date: confirm(draft.date),
            from: confirm(draft.fromAccount?.id),
            merchant: null,
            recurrence: null,
            kind: "transfer",
            to: confirm(draft.toAccount?.id),
            wasCurrency: null,
        };
    }
    let kind: SentenceKind = "expense";
    if (draft.recurrence !== null) {
        kind = draft.income ? "recurringIncome" : "subscription";
    } else if (draft.income) {
        kind = "income";
    }
    return {
        account: confirm(draft.accountId),
        amount: confirm(draft.amount),
        category: confirm(draft.categoryId),
        currency: draft.currency,
        date: confirm(draft.date),
        from: null,
        merchant: confirm(draft.merchant.trim() === "" ? null : draft.merchant),
        recurrence: confirm(draft.recurrence),
        kind,
        to: null,
        wasCurrency: null,
    };
}

function withWas<T>(next: Slot<T>, previous: Slot<T>, same: (a: T, b: T) => boolean = Object.is): Slot<T> {
    if (next === null || previous === null || same(next.value, previous.value)) {
        return next;
    }
    return { ...next, was: previous.value };
}

const sameDay = (a: Date, b: Date) => localIsoDate(a) === localIsoDate(b);
const sameRecurrence = (a: ResolvedRecurrence, b: ResolvedRecurrence) =>
    a.type === b.type && a.coefficient === b.coefficient;

/** Marks each slot that moved from `previous` to `next` with the old value, so a correction shows what it replaced. */
export function withCorrection(next: VoiceSentence, previous: VoiceSentence | null): VoiceSentence {
    if (previous === null) {
        return next;
    }
    return {
        ...next,
        account: withWas(next.account, previous.account),
        amount: withWas(next.amount, previous.amount, (a, b) => a === b && next.currency === previous.currency),
        category: withWas(next.category, previous.category),
        date: withWas(next.date, previous.date, sameDay),
        from: withWas(next.from, previous.from),
        merchant: withWas(next.merchant, previous.merchant),
        recurrence: withWas(next.recurrence, previous.recurrence, sameRecurrence),
        to: withWas(next.to, previous.to),
        wasCurrency: previous.currency,
    };
}

/** What the live parser heard laid over an earlier draft: spoken words win, the rest stays as it was. */
export function overlayLive(base: VoiceSentence, live: VoiceSentence): VoiceSentence {
    return withCorrection(
        {
            account: live.account ?? base.account,
            amount: live.amount ?? base.amount,
            category: live.category ?? base.category,
            currency: live.currency ?? base.currency,
            date: live.date ?? base.date,
            from: live.from ?? base.from,
            merchant: live.merchant ?? base.merchant,
            recurrence: live.recurrence ?? base.recurrence,
            kind: live.kind ?? base.kind,
            to: live.to ?? base.to,
            wasCurrency: null,
        },
        base
    );
}
