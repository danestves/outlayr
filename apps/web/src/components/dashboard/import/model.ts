import { useMemo } from "react";

import { useIncomingRules } from "@/components/dashboard/rules/incoming";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { liveCategories } from "@/lib/category-writes";
import { openAccounts } from "@/lib/dashboard-series-ledger";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import {
    groupKey,
    labelGroups,
    matchDuplicates,
    readRows,
    resolveOnDevice,
    statementOf,
    tidyLabel,
    withSuggestions,
} from "@/lib/import-file";
import type {
    CsvFile,
    ExistingEntry,
    FaultyRow,
    FileRow,
    FoundBy,
    KnownCategory,
    LabelGroup,
    Suggestion,
} from "@/lib/import-file";
import type { AccountChoice, CategoryChoice, PlanRow } from "@/lib/import-plan";

import type { Draft } from "./draft";

export type Found = FoundBy | "you";

export interface GroupView extends LabelGroup {
    choice: CategoryChoice;
    found: Found;
    name: string;
}

export interface FileAccount {
    choice: AccountChoice;
    count: number;
    /** The user hasn't picked one: an unknown name comes in as a new account unless they say otherwise. */
    picked: boolean;
    value: string;
}

export interface ModelRow extends Omit<FileRow, "category" | "currency">, PlanRow {
    accountId: string | null;
    duplicate: ExistingEntry | null;
    fileCategory: string | null;
    found: Found;
    key: string;
    ticked: boolean;
}

export interface FileModel {
    accounts: readonly FileAccount[];
    faulty: readonly FaultyRow[];
    file: CsvFile;
    groups: readonly GroupView[];
    rows: readonly ModelRow[];
    statement: ReturnType<typeof statementOf>;
}

const fold = (text: string) =>
    text
        .normalize("NFKD")
        .replaceAll(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, " ")
        .trim();

function autoCategory(group: LabelGroup, categoryId: string | null): CategoryChoice {
    if (categoryId !== null) {
        return { id: categoryId, kind: "existing" };
    }
    return group.fromCategory ? { kind: "new", name: tidyLabel(group.label) } : { kind: "none" };
}

const existingId = (choice: AccountChoice) => (choice.kind === "existing" ? choice.id : null);

export function knownCategories(books: Ledger["books"]): KnownCategory[] {
    return liveCategories(books.categories).flatMap((row) =>
        [row.name, row.preset].flatMap((name) => (name ? [{ id: row.localId, income: row.income, name }] : []))
    );
}

/** An account-column value finds the open account whose name it contains or that contains it. */
export function accountFor(value: string, accounts: readonly { localId: string; name: string }[]) {
    const wanted = fold(value);
    if (wanted === "") {
        return null;
    }
    const exact = accounts.find((row) => fold(row.name) === wanted);
    const loose = accounts.find((row) => {
        const name = fold(row.name);
        return name !== "" && (wanted.includes(name) || name.includes(wanted));
    });
    return (exact ?? loose)?.localId ?? null;
}

export function useFileModel(draft: Draft, asked: readonly Suggestion[]): FileModel {
    const { ledger } = useDashboard();
    const rule = useIncomingRules();
    return useMemo(() => {
        const file: CsvFile = { header: draft.header, rows: draft.rows, width: draft.header.length };
        const read =
            draft.dateFormat === null
                ? { faulty: [], rows: [] }
                : readRows(file, draft.targets, { dateFormat: draft.dateFormat, offsetAt: ledger.offsetAt });
        const known = knownCategories(ledger.books);
        const live = ledger.books.transactions.filter((row) => row.deletedAt === null);
        const groups = labelGroups(read.rows);
        const device = resolveOnDevice(
            groups,
            known,
            live.map((row) => ({ categoryId: row.categoryId, note: row.note })),
            (label, income) => rule({ amount: 0, details: label, income, note: label }).categoryId
        );
        const suggestions = [...(draft.suggestions ?? []), ...asked];
        const resolved = suggestions.length === 0 ? device : withSuggestions(groups, device, suggestions, known);
        const views = new Map<string, GroupView>();
        for (const group of groups) {
            const resolution = resolved.get(group.key);
            const picked = draft.categories[group.key];
            const auto = autoCategory(group, resolution?.categoryId ?? null);
            views.set(group.key, {
                ...group,
                choice: picked ?? auto,
                found: picked ? "you" : (resolution?.foundBy ?? "none"),
                name: resolution?.name ?? tidyLabel(group.label),
            });
        }

        const open = openAccounts(ledger.books);
        const counts = new Map<string, number>();
        for (const row of read.rows) {
            if (row.account !== null) {
                counts.set(row.account, (counts.get(row.account) ?? 0) + 1);
            }
        }
        const accounts = [...counts].map(([value, count]): FileAccount => {
            const picked = draft.accounts[value];
            const found = accountFor(value, open);
            const auto: AccountChoice =
                found === null ? { kind: "new", type: "account" } : { id: found, kind: "existing" };
            return { choice: picked ?? auto, count, picked: picked !== undefined || found !== null, value };
        });
        const choiceOf = new Map(accounts.map((account) => [account.value, account.choice]));
        const currencyOf = new Map(open.map((row) => [row.localId, row.currency]));

        const planned = read.rows.map((row) => {
            const key = groupKey(row);
            const view = views.get(key);
            const choice = row.account === null ? null : (choiceOf.get(row.account) ?? null);
            const accountId = choice === null ? draft.intoAccountId : existingId(choice);
            const rowPick = draft.rowCategories[String(row.index)];
            return {
                ...row,
                accountId,
                category: rowPick ?? view?.choice ?? { kind: "none" as const },
                currency: row.currency ?? (accountId === null ? null : currencyOf.get(accountId)) ?? ledger.currency,
                fileAccount: row.account,
                fileCategory: row.category,
                found: rowPick ? ("you" as const) : (view?.found ?? "none"),
                key,
                name: view && !view.fromCategory ? view.name : tidyLabel(row.label),
            };
        });
        const existing = live
            .filter((row) => row.transferId == null && row.feeForId == null)
            .map((row): ExistingEntry => ({
                accountId: row.accountId ?? null,
                amount: row.amount,
                at: row.date,
                currency: row.currency ?? ledger.currency,
                id: row.localId,
                income: row.income,
            }));
        const duplicates = matchDuplicates(planned, existing, ledger.offsetAt);
        const forced = new Set(draft.forced);
        const unticked = new Set(draft.unticked);
        const rows = planned.map((row): ModelRow => {
            const duplicate = duplicates.get(row.index) ?? null;
            return {
                ...row,
                duplicate,
                ticked: duplicate === null ? !unticked.has(row.index) : forced.has(row.index),
            };
        });
        return {
            accounts,
            faulty: read.faulty,
            file,
            groups: [...views.values()],
            rows,
            statement: statementOf(read.rows),
        };
    }, [asked, draft, ledger, rule]);
}
