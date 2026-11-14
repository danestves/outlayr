import UndoIcon from "@hugeicons/core-free-icons/UndoIcon";
import { countBucket } from "@outlayr/money/count-bucket";
import { capture } from "@outlayr/shared/analytics";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Input } from "panelui-web/input";
import { Kpi } from "panelui-web/kpi";
import { Table } from "panelui-web/table";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { accountFacts } from "@/components/dashboard/accounts/model";
import { KpiBand } from "@/components/dashboard/accounts/parts";
import { useCategoryLook } from "@/components/dashboard/rules/parts";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { groupKey, repairRow } from "@/lib/import-file";
import type { FaultyRow, FileRow, StatementCheck } from "@/lib/import-file";
import { planOf } from "@/lib/import-plan";
import type { AccountChoice, PlanRow } from "@/lib/import-plan";
import { importRows } from "@/lib/import-writes";
import { useDisplayFormat } from "@/lib/ledger-settings";

import type { Draft } from "./draft";
import { CategoryShown, useEntryDay } from "./file-parts";
import {
    BalanceCheck,
    fileLabel,
    FileSummary,
    importable,
    ReviewRail,
    useAccountCurrency,
    useChoiceName,
} from "./file-review";
import { HEAD, useRecordDay, useSeeEntries } from "./history";
import type { FileModel } from "./model";
import { Banner, Card, Columns, ImportBar, ImportPage, NOTE } from "./parts";
import { useImportHistory } from "./store";
import type { ImportRecord } from "./store";
import { UndoDialog, useImportStore } from "./undo";

const ROW = "h-[49px] px-3 py-0 align-middle first:ps-4 last:pe-4";
const MATCHED = 0.005;

export interface Finished {
    /** Where a retried row goes, by the file's account text, as the first write sent its siblings. */
    accountOf: ReadonlyMap<string, string | null>;
    /** What review chose per account-column value, so a retried row on a skipped account stays out. */
    accountChoices: ReadonlyMap<string, AccountChoice>;
    /** And which category, by the merchant or category group the row belongs to. */
    categoryOf: ReadonlyMap<string, string | null>;
    draft: Draft;
    faulty: readonly FaultyRow[];
    recordId: string;
    statement: StatementCheck | null;
}

const ACCOUNT_COLUMN_NONE = "";

const nowMs = () => Date.now();
const signed = (row: FaultyRow) => {
    if (row.amount === null) {
        return 0;
    }
    return row.income ? row.amount : -row.amount;
};

const totals = (rows: readonly { amount: number; income: boolean }[]) => ({
    in: rows.filter((row) => row.income).reduce((sum, row) => sum + row.amount, 0),
    inCount: rows.filter((row) => row.income).length,
    out: rows.filter((row) => !row.income).reduce((sum, row) => sum + row.amount, 0),
    outCount: rows.filter((row) => !row.income).length,
});

/** Writes the ticked rows in one commit; the ledger shows them at once and the record lands once they're saved. */
export function useRunImport() {
    const { ledger } = useDashboard();
    const committer = useLedgerCommitter();
    const records = useImportStore();
    const currencyOf = useAccountCurrency();
    return (
        draft: Draft,
        model: FileModel,
        on: { failed: (retry: () => void) => void; saved: (finished: Finished) => void }
    ) => {
        const rows = importable(model);
        const accountChoices = new Map(model.accounts.map((account) => [account.value, account.choice]));
        const { entryOf, plan } = planOf({
            accounts: accountChoices,
            intoAccountId: draft.intoAccountId,
            newId: () => crypto.randomUUID(),
            rows,
        });
        const entryById = new Map(plan.entries.map((entry) => [entry.id, entry]));
        const accountOf = new Map<string, string | null>();
        const categoryOf = new Map<string, string | null>();
        for (const row of rows) {
            const entry = entryById.get(entryOf.get(row.index) ?? "");
            if (entry) {
                accountOf.set(row.fileAccount ?? ACCOUNT_COLUMN_NONE, entry.accountId);
                categoryOf.set(row.key, entry.categoryId);
            }
        }
        const now = Date.now();
        const record: ImportRecord = {
            accountIds: [...new Set(plan.entries.flatMap((entry) => (entry.accountId ? [entry.accountId] : [])))],
            at: now,
            createdAccountIds: plan.accounts.map((account) => account.id),
            createdCategoryIds: plan.categories.map((category) => category.id),
            currency: currencyOf(draft.targets.includes("account") ? null : draft.intoAccountId),
            duplicates: model.rows.filter((row) => row.duplicate && !row.ticked).length,
            entryIds: plan.entries.map((entry) => entry.id),
            id: draft.id,
            name: fileLabel(draft),
            source: draft.source,
            statement: model.statement,
            undoneAt: null,
            ...totals(plan.entries),
        };
        const written = importRows(ledger, plan, now);
        const land = async () => {
            if (await committer.commit(written)) {
                records?.add(record);
                capture("import_finished", {
                    rows: countBucket(plan.entries.length),
                    source: draft.source === "pdf" ? "pdf" : "csv",
                });
                on.saved({
                    accountChoices,
                    accountOf,
                    categoryOf,
                    draft,
                    faulty: model.faulty,
                    recordId: record.id,
                    statement: model.statement,
                });
                return;
            }
            // Pushes go in batches, so earlier ones may have landed; resending the same rows can't double them.
            on.failed(() => {
                void land();
            });
        };
        void land();
    };
}

export function ImportingStep({ draft, model }: { draft: Draft; model: FileModel }) {
    const { columns, importing } = useIntlayer("dashboard-import");
    const { money } = useDisplayFormat();
    const day = useEntryDay();
    const look = useCategoryLook();
    const choiceName = useChoiceName();
    const rows = importable(model);
    return (
        <ImportPage>
            <ImportBar step="review">
                <Button disabled>{importing.button}</Button>
            </ImportBar>
            <Columns rail={<ReviewRail draft={draft} model={model} store={null} />}>
                <Frame className="min-w-0">
                    <Frame.Header className="min-h-16">
                        <Frame.Title as="h2" className="flex flex-wrap items-baseline gap-x-2">
                            <b className="font-semibold">{importing.title({ count: rows.length.toLocaleString() })}</b>
                            <span className="text-muted-foreground text-[13px] font-normal">{importing.keepOpen}</span>
                        </Frame.Title>
                    </Frame.Header>
                    <Frame.Panel className="flex flex-1 flex-col">
                        <Table containerClassName="overflow-x-auto">
                            <Table.Header>
                                <Table.Row className="border-b-0">
                                    <Table.Head className={HEAD}>{columns.date}</Table.Head>
                                    <Table.Head className={HEAD}>{columns.merchant}</Table.Head>
                                    <Table.Head className={HEAD}>{columns.category}</Table.Head>
                                    <Table.Head className={HEAD}>{columns.written}</Table.Head>
                                    <Table.Head align="end" className={HEAD}>
                                        {columns.amount}
                                    </Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {rows.map((row) => {
                                    const found = row.category.kind === "existing" ? look(row.category.id) : null;
                                    return (
                                        <Table.Row key={row.index}>
                                            <Table.Cell className={`${ROW} dash-figure text-muted-foreground text-sm`}>
                                                {day(row.at)}
                                            </Table.Cell>
                                            <Table.Cell className={`${ROW} max-w-0 truncate text-sm font-medium`}>
                                                {row.name}
                                            </Table.Cell>
                                            <Table.Cell className={ROW}>
                                                {row.category.kind === "none" ? (
                                                    <CategoryShown id={null} />
                                                ) : (
                                                    <span className="inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-xs font-medium">
                                                        <i
                                                            className="border-muted-foreground size-1.5 rounded-full border-dashed"
                                                            style={
                                                                found
                                                                    ? { backgroundColor: found.color }
                                                                    : { borderWidth: 1 }
                                                            }
                                                        />
                                                        {choiceName(row.category)}
                                                    </span>
                                                )}
                                            </Table.Cell>
                                            <Table.Cell className={ROW}>
                                                <i className="dash-gl inline-block w-10" />
                                            </Table.Cell>
                                            <Table.Cell
                                                align="end"
                                                className={`${ROW} dash-figure text-sm whitespace-nowrap`}
                                            >
                                                {money(row.income ? row.amount : -row.amount, row.currency, "always")}
                                            </Table.Cell>
                                        </Table.Row>
                                    );
                                })}
                            </Table.Body>
                        </Table>
                    </Frame.Panel>
                </Frame>
            </Columns>
        </ImportPage>
    );
}

function DoneKpi({
    children,
    label,
    tone = "",
    value,
}: {
    children: ReactNode;
    label: ReactNode;
    tone?: string;
    value: ReactNode;
}) {
    return (
        <Kpi className="gap-0">
            <Kpi.Header>
                <Kpi.Title>{label}</Kpi.Title>
            </Kpi.Header>
            <Kpi.Value className={`dash-figure mt-2 truncate leading-7 font-semibold tracking-[-0.04em] ${tone}`}>
                {value}
            </Kpi.Value>
            <Kpi.Footer className="text-muted-foreground mt-1 -mb-0.5 h-5 text-xs">{children}</Kpi.Footer>
        </Kpi>
    );
}

function WhereItWent({ record }: { record: ImportRecord }) {
    const { columns, done } = useIntlayer("dashboard-import");
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const look = useCategoryLook();
    const see = useSeeEntries();
    const ids = new Set(record.entryIds);
    const entries = ledger.books.transactions.filter((row) => row.deletedAt === null && ids.has(row.localId));
    const groups = new Map<string, { amount: number; count: number; id: string | null }>();
    for (const entry of entries.filter((row) => !row.income)) {
        const key = entry.categoryId ?? "";
        const group = groups.get(key) ?? { amount: 0, count: 0, id: entry.categoryId };
        groups.set(key, { ...group, amount: group.amount + entry.amount, count: group.count + 1 });
    }
    const out = [...groups.values()].reduce((sum, group) => sum + group.amount, 0);
    const sorted = [...groups.values()].toSorted(
        (a, b) => Number(a.id === null) - Number(b.id === null) || b.amount - a.amount
    );
    const uncategorized = entries.filter((row) => row.categoryId === null).length;
    return (
        <Card
            action={
                <span className="dash-figure text-muted-foreground text-[13px]">
                    {money(-out, record.currency, "always")}
                </span>
            }
            footer={
                uncategorized > 0 ? (
                    <>
                        <span className="text-muted-foreground">{done.needCategory({ count: uncategorized })}</span>
                        <Button onClick={() => see(record, true)} size="sm" variant="outline">
                            {done.reviewN({ count: uncategorized })}
                        </Button>
                    </>
                ) : null
            }
            title={done.whereItWent}
        >
            <Table containerClassName="overflow-x-auto">
                <Table.Header>
                    <Table.Row className="border-b-0">
                        <Table.Head className={HEAD}>{columns.category}</Table.Head>
                        <Table.Head align="end" className={`${HEAD} w-20`}>
                            {columns.entries}
                        </Table.Head>
                        <Table.Head className={`${HEAD} w-[300px] max-md:hidden`}>{columns.share}</Table.Head>
                        <Table.Head align="end" className={HEAD}>
                            {columns.amount}
                        </Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {sorted.map((group) => {
                        const color = (group.id ? look(group.id)?.color : null) ?? "var(--color-muted-foreground)";
                        const share = out > 0 ? group.amount / out : 0;
                        return (
                            <Table.Row key={group.id ?? "none"}>
                                <Table.Cell className={ROW}>
                                    <CategoryShown id={group.id} />
                                </Table.Cell>
                                <Table.Cell align="end" className={`${ROW} text-muted-foreground text-sm`}>
                                    {group.count}
                                </Table.Cell>
                                <Table.Cell className={`${ROW} w-[300px] max-md:hidden`}>
                                    <span className="bg-app-fill block h-1.5 w-full max-w-65 overflow-hidden rounded-full">
                                        <i
                                            className="block h-full rounded-full"
                                            style={{
                                                backgroundColor: color,
                                                opacity: group.id ? 1 : 0.4,
                                                width: `${Math.max(1, share * 100)}%`,
                                            }}
                                        />
                                    </span>
                                </Table.Cell>
                                <Table.Cell align="end" className={`${ROW} dash-figure text-sm whitespace-nowrap`}>
                                    {money(-group.amount, record.currency, "always")}
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </Table.Body>
            </Table>
        </Card>
    );
}

interface Fix {
    amount: string;
    date: string;
}
const NO_FIX: Fix = { amount: "", date: "" };

function FaultyRows({
    faulty,
    fixes,
    onFix,
    onLeave,
    record,
}: {
    faulty: readonly FaultyRow[];
    fixes: Readonly<Record<number, Fix>>;
    onFix: (index: number, fix: Fix) => void;
    onLeave: () => void;
    record: ImportRecord;
}) {
    const { columns, done } = useIntlayer("dashboard-import");
    const { money } = useDisplayFormat();
    return (
        <Card title={faulty.length === 1 ? done.oneDidntMake : done.didntMake({ count: faulty.length })}>
            <Table containerClassName="overflow-x-auto">
                <Table.Header>
                    <Table.Row className="border-b-0">
                        <Table.Head className={HEAD}>{columns.dateInFile}</Table.Head>
                        <Table.Head className={HEAD}>{columns.merchant}</Table.Head>
                        <Table.Head className={HEAD}>{columns.why}</Table.Head>
                        <Table.Head className={HEAD}>{columns.fix}</Table.Head>
                        <Table.Head align="end" className={HEAD}>
                            {columns.amount}
                        </Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {faulty.map((row) => {
                        const fix = fixes[row.index] ?? NO_FIX;
                        return (
                            <Table.Row key={row.index}>
                                <Table.Cell className={`${ROW} dash-figure text-muted-foreground h-[60px] text-sm`}>
                                    {row.dateText || "–"}
                                </Table.Cell>
                                <Table.Cell className={`${ROW} max-w-0`}>
                                    <b className="block truncate text-sm leading-4 font-medium">{row.label}</b>
                                </Table.Cell>
                                <Table.Cell className={ROW}>
                                    <Badge
                                        className="h-6 gap-1.5 rounded-md px-2 text-xs font-medium"
                                        variant="destructive"
                                    >
                                        <i className="size-1.5 rounded-full bg-current" />
                                        {row.fault === "date" ? done.unreadableDate : done.unreadableAmount}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell className={`${ROW} w-36`}>
                                    {row.fault === "date" ? (
                                        <Input
                                            aria-label={done.unreadableDate.value}
                                            className="dash-figure h-8 w-32"
                                            onChange={(event) => onFix(row.index, { ...fix, date: event.target.value })}
                                            type="date"
                                            value={fix.date}
                                        />
                                    ) : (
                                        <Input
                                            aria-label={done.unreadableAmount.value}
                                            className="dash-figure h-8 w-32"
                                            inputMode="decimal"
                                            onChange={(event) =>
                                                onFix(row.index, { ...fix, amount: event.target.value })
                                            }
                                            placeholder={done.amountPlaceholder.value}
                                            value={fix.amount}
                                        />
                                    )}
                                </Table.Cell>
                                <Table.Cell align="end" className={`${ROW} dash-figure text-sm whitespace-nowrap`}>
                                    {row.amount === null
                                        ? "–"
                                        : money(row.income ? row.amount : -row.amount, record.currency, "always")}
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </Table.Body>
            </Table>
            <div className="border-t">
                <b className="flex h-11 items-center px-4 text-[13px] font-medium">
                    {done.otherAreIn({ count: record.entryIds.length.toLocaleString() })}
                </b>
                <p className={`${NOTE} border-t pt-3 pb-3`}>{done.retryNote}</p>
                <div className="px-4 pb-4">
                    <Button onClick={onLeave} size="sm" variant="outline">
                        {done.leaveThemOut}
                    </Button>
                </div>
            </div>
        </Card>
    );
}

export function DoneStep({ finished, onAnother }: { finished: Finished; onAnother: () => void }) {
    const { done, home } = useIntlayer("dashboard-import");
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const recordDay = useRecordDay();
    const see = useSeeEntries();
    const committer = useLedgerCommitter();
    const store = useImportStore();
    const records = useImportHistory(store);
    const [remaining, setRemaining] = useState(finished.faulty);
    const [left, setLeft] = useState(false);
    const [fixes, setFixes] = useState<Record<number, Fix>>({});
    const [retrying, setRetrying] = useState(false);
    const [madeAccounts, setMadeAccounts] = useState<ReadonlyMap<string, string>>(new Map());
    const record = records.find((row) => row.id === finished.recordId);
    const { draft, statement } = finished;
    const accountId = draft.targets.includes("account") ? null : draft.intoAccountId;
    const balance = accountId === null ? null : accountFacts(ledger, accountId).balance;
    const accountName = ledger.books.accounts.find((row) => row.localId === accountId)?.name ?? "";

    if (!record) {
        return null;
    }
    const standing = record.undoneAt === null;
    const { offsetAt } = ledger;
    const dateFormat = draft.dateFormat ?? "";
    const repaired = remaining.flatMap((row) => {
        const fixed = repairRow(row, fixes[row.index] ?? NO_FIX, { dateFormat, offsetAt });
        return fixed ? [{ fixed, row }] : [];
    });
    const partial = standing && remaining.length > 0 && !left;

    const retry = () => {
        const rows = repaired.map(({ fixed }: { fixed: FileRow }): PlanRow => {
            const categoryId = finished.categoryOf.get(groupKey(fixed)) ?? null;
            return {
                ...fixed,
                category: categoryId === null ? { kind: "none" } : { id: categoryId, kind: "existing" },
                currency: fixed.currency ?? record.currency,
                fileAccount: fixed.account,
                name: fixed.label,
            };
        });
        const accounts = new Map<string, AccountChoice>();
        for (const [value, choice] of finished.accountChoices) {
            const id = finished.accountOf.get(value) ?? madeAccounts.get(value);
            accounts.set(value, id ? { id, kind: "existing" } : choice);
        }
        const { plan } = planOf({
            accounts,
            intoAccountId: finished.accountOf.get(ACCOUNT_COLUMN_NONE) ?? finished.draft.intoAccountId,
            newId: () => crypto.randomUUID(),
            rows,
        });
        setRetrying(true);
        void committer.commit(importRows(ledger, plan, nowMs())).then((saved) => {
            setRetrying(false);
            if (!saved) {
                return;
            }
            const added = totals(plan.entries);
            store?.change(record.id, {
                accountIds: [
                    ...new Set([
                        ...record.accountIds,
                        ...plan.entries.flatMap((entry) => (entry.accountId ? [entry.accountId] : [])),
                    ]),
                ],
                createdAccountIds: [...record.createdAccountIds, ...plan.accounts.map((account) => account.id)],
                entryIds: [...record.entryIds, ...plan.entries.map((entry) => entry.id)],
                in: record.in + added.in,
                inCount: record.inCount + added.inCount,
                out: record.out + added.out,
                outCount: record.outCount + added.outCount,
            });
            setMadeAccounts(
                new Map([...madeAccounts, ...plan.accounts.map((account) => [account.name, account.id] as const)])
            );
            const fixedIndexes = new Set(repaired.map(({ row }) => row.index));
            setRemaining(remaining.filter((row) => !fixedIndexes.has(row.index)));
        });
    };

    const off = balance === null || statement === null ? null : balance - statement.end;
    let balanceNote: ReactNode = null;
    let balanceTone = "";
    if (off !== null) {
        if (Math.abs(off) < MATCHED) {
            balanceNote = done.matchesStatement;
        } else {
            balanceTone = "text-app-tint";
            balanceNote =
                off > 0
                    ? done.aboveStatement({ amount: money(off, record.currency) })
                    : done.belowStatement({ amount: money(-off, record.currency) });
        }
    }
    const lost = remaining.reduce((sum, row) => sum + signed(row), 0);
    const duplicatesNote =
        record.duplicates > 0 ? done.duplicatesSkipped({ count: record.duplicates }) : done.noDuplicates;
    const fourth =
        balance === null ? (
            <DoneKpi label={done.inAndOut} value={money(record.in - record.out, record.currency, "always")}>
                {done.inOutCount({ in: record.inCount, out: record.outCount })}
            </DoneKpi>
        ) : (
            <DoneKpi label={done.balance({ account: accountName })} value={money(balance, record.currency)}>
                <span className={balanceTone}>{balanceNote}</span>
            </DoneKpi>
        );

    return (
        <ImportPage>
            <ImportBar step="done">
                {partial ? (
                    <>
                        <Button onClick={() => see(record)} variant="outline">
                            {done.openTransactions}
                        </Button>
                        <Button disabled={repaired.length === 0 || retrying} onClick={retry}>
                            {repaired.length === 1 ? done.retryOne : done.retryRows({ count: repaired.length })}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button onClick={onAnother} variant="outline">
                            {done.importAnother}
                        </Button>
                        <Button disabled={!standing} onClick={() => see(record)}>
                            {done.openTransactions}
                        </Button>
                    </>
                )}
            </ImportBar>
            <div className="flex flex-1 flex-col gap-4">
                {standing ? null : (
                    <div className="[&>div]:m-0">
                        <Banner title={done.undoneTitle} tone="warn" />
                    </div>
                )}
                <KpiBand>
                    <DoneKpi label={done.added} value={record.entryIds.length.toLocaleString()}>
                        {duplicatesNote}
                    </DoneKpi>
                    {partial ? (
                        <>
                            <DoneKpi
                                label={done.failed}
                                tone="text-destructive"
                                value={remaining.length.toLocaleString()}
                            >
                                {done.notWritten({ amount: money(lost, record.currency, "always") })}
                            </DoneKpi>
                            <DoneKpi
                                label={done.inAndOut}
                                value={
                                    <span className="flex items-baseline gap-2">
                                        {money(record.in, record.currency, "always")}
                                        <span className="text-muted-foreground text-lg">
                                            {money(-record.out, record.currency, "always")}
                                        </span>
                                    </span>
                                }
                            >
                                {done.inOutCount({ in: record.inCount, out: record.outCount })}
                            </DoneKpi>
                        </>
                    ) : (
                        <>
                            <DoneKpi
                                label={done.in}
                                tone="text-app-income"
                                value={money(record.in, record.currency, "always")}
                            >
                                {done.entriesCount({ count: record.inCount })}
                            </DoneKpi>
                            <DoneKpi label={done.out} value={money(-record.out, record.currency, "always")}>
                                {done.entriesCount({ count: record.outCount })}
                            </DoneKpi>
                        </>
                    )}
                    {fourth}
                </KpiBand>
                <Columns
                    rail={
                        <>
                            <FileSummary
                                draft={draft}
                                note={done.imported({ date: recordDay.long(record.at) })}
                                store={null}
                            />
                            {standing ? (
                                <Card title={done.changeMind}>
                                    <p className={`${NOTE} py-4`}>{done.changeMindText}</p>
                                    <div className="px-4 pb-4">
                                        <UndoDialog
                                            record={record}
                                            trigger={
                                                <Button className="w-full gap-1.5" size="sm" variant="outline">
                                                    <Glyph icon={UndoIcon} size={14} />
                                                    {home.undoImport}
                                                </Button>
                                            }
                                        />
                                    </div>
                                </Card>
                            ) : null}
                            {partial && statement && accountId ? (
                                <BalanceCheck
                                    accountId={accountId}
                                    added={{ net: record.in - record.out, written: true }}
                                    count={record.entryIds.length}
                                    missing={remaining.length}
                                    statement={statement}
                                />
                            ) : null}
                        </>
                    }
                >
                    {partial ? (
                        <FaultyRows
                            faulty={remaining}
                            fixes={fixes}
                            onFix={(index, fix) => setFixes({ ...fixes, [index]: fix })}
                            onLeave={() => setLeft(true)}
                            record={record}
                        />
                    ) : (
                        <WhereItWent record={record} />
                    )}
                </Columns>
            </div>
        </ImportPage>
    );
}
