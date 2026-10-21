import { RECURRING_TYPE } from "@outlayr/money/recurrence";

export interface TransactionRowActionContext {
    /** The row's stored date, which for a carrier is its last charge, not its next. */
    date: Date;
    future: boolean;
    now: Date;
    recurringType: number;
}

export interface TransactionRowActions {
    canDelete: boolean;
    canLogAgain: boolean;
    canStopRecurring: boolean;
}

export function transactionRowActions({
    recurringType,
    date,
    future,
    now,
}: TransactionRowActionContext): TransactionRowActions {
    const live = recurringType > RECURRING_TYPE.none;
    return {
        // A live carrier past its date stands in Upcoming for an unwritten charge: deleting it there would end the
        // subscription, so Stop Recurring takes over.
        canDelete: !(future && live && date.getTime() < now.getTime()),
        canLogAgain: !future,
        canStopRecurring: live,
    };
}

// No cadence or reminder lead: repeating one charge must not mint a second schedule. No date: it happens now. No
// photo: `imageKey` owns the stored bytes, so two rows sharing it would let either delete release the other's picture.
export interface LogAgainDraft {
    amount: number;
    categoryId: string | null;
    currency: string | null;
    customColor: string | null;
    details: string | null;
    emoji: string | null;
    icon: string | null;
    income: boolean;
    note: string;
}

export function logAgainDraft(source: LogAgainDraft): LogAgainDraft {
    return {
        amount: source.amount,
        categoryId: source.categoryId,
        currency: source.currency,
        customColor: source.customColor,
        details: source.details,
        emoji: source.emoji,
        icon: source.icon,
        income: source.income,
        note: source.note,
    };
}
