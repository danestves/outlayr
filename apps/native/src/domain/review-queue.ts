import { formatChargeDate, formatTime } from "@/domain/dates";
import type { LinkedBankAccount } from "@/domain/linked-banks";
import type { Language } from "@/i18n/languages";

export const SHELF_ROWS = 3;

export interface ReviewGroup<Row> {
    accountId: string | null;
    rows: Row[];
}

/** Newest group first, since the queue arrives newest first. */
export function groupByAccount<Row extends { accountId: string | null }>(rows: readonly Row[]): ReviewGroup<Row>[] {
    const groups = new Map<string | null, Row[]>();
    for (const row of rows) {
        const held = groups.get(row.accountId);
        if (held) {
            held.push(row);
        } else {
            groups.set(row.accountId, [row]);
        }
    }
    return [...groups].map(([accountId, grouped]) => ({ accountId, rows: grouped }));
}

type SyncedAccount = Pick<LinkedBankAccount, "filesInto" | "institution" | "pulledAt">;

export function lastSyncInto(accounts: readonly SyncedAccount[], accountId: string | null): number | null {
    const pulled = accounts.flatMap((account) =>
        account.filesInto === accountId && account.pulledAt !== null ? [account.pulledAt] : []
    );
    return pulled.length === 0 ? null : Math.max(...pulled);
}

export function latestSync(accounts: readonly SyncedAccount[]): { institution: string; pulledAt: number } | null {
    let latest: { institution: string; pulledAt: number } | null = null;
    for (const { institution, pulledAt } of accounts) {
        if (pulledAt !== null && (latest === null || pulledAt > latest.pulledAt)) {
            latest = { institution, pulledAt };
        }
    }
    return latest;
}

export function syncedWhen(pulledAt: number, nowMs: number, use24Hour: boolean, language: Language): string {
    const pulled = new Date(pulledAt);
    const now = new Date(nowMs);
    return pulled.toDateString() === now.toDateString()
        ? formatTime(pulled, use24Hour, language)
        : formatChargeDate(pulled, now, language);
}
