import ArrowRight02Icon from "@hugeicons/core-free-icons/ArrowRight02Icon";
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Checkbox } from "panelui-web/checkbox";
import { Frame } from "panelui-web/frame";
import { Table } from "panelui-web/table";
import { Tabs } from "panelui-web/tabs";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { accountFacts } from "@/components/dashboard/accounts/model";
import { useCategoryLook } from "@/components/dashboard/rules/parts";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { openAccounts } from "@/lib/dashboard-series-ledger";
import { net } from "@/lib/import-file";
import type { StatementCheck, Target } from "@/lib/import-file";
import type { CategoryChoice } from "@/lib/import-plan";
import { useDisplayFormat } from "@/lib/ledger-settings";

import type { Draft, DraftStore } from "./draft";
import { AccountPick, AccountShown, CategoryChip, NONE, Pager, useEntryDay } from "./file-parts";
import { HEAD, useRecordDay } from "./history";
import type { FileModel, ModelRow } from "./model";
import { Banner, Card, Columns, FileHead, ImportBar, ImportPage, Line, WorksWith } from "./parts";
import { useImportHistory } from "./store";
import { useImportStore } from "./undo";

const PAGE = 16;
const ROW = "h-[45px] px-3 py-0 align-middle first:ps-4 last:pe-4";
const MATCHED = 0.005;

type Filter = "all" | "duplicates" | "new" | "pick";

const EXTENSION = { csv: ".csv", notion: "", pdf: ".pdf" } as const;
export const fileLabel = (draft: Pick<Draft, "name" | "source">) => `${draft.name}${EXTENSION[draft.source]}`;

/** Rows bound for an account the user chose to leave out never get written. */
export function importable(model: FileModel) {
    const skipped = new Set(model.accounts.flatMap((row) => (row.choice.kind === "skip" ? [row.value] : [])));
    return model.rows.filter((row) => row.ticked && (row.fileAccount === null || !skipped.has(row.fileAccount)));
}

const signed = (amount: number, income: boolean) => (income ? amount : -amount);

const filterOf = (row: ModelRow): Exclude<Filter, "all"> => {
    if (row.duplicate) {
        return "duplicates";
    }
    return row.category.kind === "none" ? "pick" : "new";
};

export function useAccountCurrency() {
    const { ledger } = useDashboard();
    return (id: string | null) =>
        openAccounts(ledger.books).find((row) => row.localId === id)?.currency ?? ledger.currency;
}

export function FileSummary({
    draft,
    note,
    store,
}: {
    draft: Draft;
    note?: ReactNode;
    /** Without a store the account reads as the import's, no longer a choice. */
    store: DraftStore | null;
}) {
    const { match, upload } = useIntlayer("dashboard-import");
    const seconds = Math.max(1, Math.round((draft.readMs ?? 0) / 1000));
    const accountColumn = draft.targets.includes("account");
    return (
        <Card title={upload.file}>
            <FileHead
                name={fileLabel(draft)}
                note={note ?? (draft.source === "pdf" ? upload.readByAi({ seconds }) : upload.readOnDevice)}
                source={draft.source}
            />
            {accountColumn ? null : (
                <div className="flex flex-col gap-2 px-4 pt-1 pb-4">
                    <span className="text-muted-foreground text-[13px]">{match.intoAccount}</span>
                    {store ? (
                        <AccountPick
                            extra={[{ label: match.none.value, value: NONE }]}
                            onPick={(value) => store.change({ intoAccountId: value === NONE ? null : value })}
                            value={draft.intoAccountId ?? NONE}
                        />
                    ) : (
                        <AccountShown id={draft.intoAccountId} />
                    )}
                </div>
            )}
        </Card>
    );
}

export function BalanceCheck({
    accountId,
    added,
    count,
    missing,
    statement,
}: {
    accountId: string;
    /** What this import adds; when it is already written the account balance includes it. */
    added: { net: number; written: boolean };
    count: number;
    /** Rows that didn't make it, named in the notice when they explain the gap. */
    missing: number;
    statement: StatementCheck;
}) {
    const { done, review } = useIntlayer("dashboard-import");
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const currency = useAccountCurrency()(accountId);
    const account = openAccounts(ledger.books).find((row) => row.localId === accountId);
    const balance = useMemo(() => accountFacts(ledger, accountId).balance, [accountId, ledger]);
    const after = added.written ? balance : balance + added.net;
    const off = after - statement.end;
    const matches = Math.abs(off) < MATCHED;
    const name = account?.name ?? "";
    let notice: ReactNode = review.matchesBalance({ account: name });
    if (!matches) {
        notice =
            missing > 0
                ? done.offByRows({ amount: money(Math.abs(off), currency) })
                : review.offBalance({ account: name, amount: money(Math.abs(off), currency) });
    }
    return (
        <Card title={review.balanceCheck}>
            <div className="mx-4 border-t [&>div]:px-0">
                <Line label={review.statementStart}>{money(statement.start, currency)}</Line>
                <Line label={review.newEntries({ count })}>{money(added.net, currency, "always")}</Line>
                {added.written && !matches ? <Line label={review.nowIn}>{money(after, currency)}</Line> : null}
                <Line label={review.statementEnd}>{money(statement.end, currency)}</Line>
            </div>
            <div className="[&>output]:mx-4 [&>output]:mt-5">
                <Banner title={notice} tone={matches ? "ok" : "warn"} />
            </div>
        </Card>
    );
}

export function ReviewRail({ draft, model, store }: { draft: Draft; model: FileModel; store: DraftStore | null }) {
    const rows = importable(model);
    const accountId = draft.targets.includes("account") ? null : draft.intoAccountId;
    return (
        <>
            <FileSummary draft={draft} store={store} />
            {model.statement && accountId ? (
                <BalanceCheck
                    accountId={accountId}
                    added={{ net: net(rows), written: false }}
                    count={rows.length}
                    missing={0}
                    statement={model.statement}
                />
            ) : null}
            <WorksWith />
        </>
    );
}

export function useChoiceName() {
    const { resolve } = useIntlayer("dashboard-import");
    const look = useCategoryLook();
    return (choice: CategoryChoice) => {
        if (choice.kind === "existing") {
            return look(choice.id)?.name ?? resolve.noCategory.value;
        }
        return choice.kind === "new" ? choice.name : resolve.noCategory.value;
    };
}

/** The file's own column under each heading, so a mismatch shows before anything is written. */
function Mapped({ draft, fields }: { draft: Draft; fields: readonly Target[] }) {
    const column = fields.map((field) => draft.targets.indexOf(field)).find((at) => at !== -1);
    const name = column === undefined ? null : draft.header[column];
    if (!name) {
        return null;
    }
    return (
        <small className="dash-figure text-muted-foreground flex items-center gap-1 text-[10px] leading-3 font-normal">
            <Glyph icon={ArrowRight02Icon} size={10} />
            {name}
        </small>
    );
}

function Segment({ forced, onForce }: { forced: boolean; onForce: (forced: boolean) => void }) {
    const { review } = useIntlayer("dashboard-import");
    const option = (on: boolean, label: ReactNode) => (
        <button
            aria-pressed={forced === on}
            className={`h-6 rounded-md px-2 text-xs font-medium transition-colors ${forced === on ? "bg-app-fill text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
            onClick={(event) => {
                event.stopPropagation();
                onForce(on);
            }}
            type="button"
        >
            {label}
        </button>
    );
    return (
        <span className="bg-background/60 inline-flex gap-0.5 rounded-lg border p-0.5">
            {option(false, review.skip)}
            {option(true, review.importAnyway)}
        </span>
    );
}

function SideBySide({ row }: { row: ModelRow & { duplicate: NonNullable<ModelRow["duplicate"]> } }) {
    const { columns, review } = useIntlayer("dashboard-import");
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const day = useEntryDay();
    const recordDay = useRecordDay();
    const look = useCategoryLook();
    const choiceName = useChoiceName();
    const records = useImportHistory(useImportStore());
    const existing = ledger.books.transactions.find((entry) => entry.localId === row.duplicate.id);
    const accountName = (id: string | null) => ledger.books.accounts.find((account) => account.localId === id)?.name;
    const from = records.find((record) => record.entryIds.includes(row.duplicate.id));
    const lines: { label: ReactNode; mine: ReactNode; theirs: ReactNode; same: boolean }[] = [
        {
            label: columns.date,
            mine: day(row.at),
            same: day(row.at) === day(row.duplicate.at),
            theirs: day(row.duplicate.at),
        },
        {
            label: columns.amount,
            mine: money(signed(row.amount, row.income), row.currency, "always"),
            same: true,
            theirs: money(signed(row.duplicate.amount, row.duplicate.income), row.duplicate.currency, "always"),
        },
        { label: review.currency, mine: row.currency, same: true, theirs: row.duplicate.currency },
        {
            label: review.account,
            mine: accountName(row.accountId) ?? "–",
            same: row.accountId === row.duplicate.accountId,
            theirs: accountName(row.duplicate.accountId) ?? "–",
        },
        {
            label: columns.merchant,
            mine: row.label,
            same: row.label.toLowerCase() === (existing?.note ?? "").toLowerCase(),
            theirs: existing?.note || "–",
        },
        {
            label: columns.category,
            mine: choiceName(row.category),
            same: row.category.kind === "existing" && row.category.id === existing?.categoryId,
            theirs: (existing?.categoryId ? look(existing.categoryId)?.name : null) ?? "–",
        },
        {
            label: review.added,
            mine: review.thisImport,
            same: false,
            theirs: from ? `${recordDay.short(from.at)}, ${from.name}` : review.byHand,
        },
    ];
    return (
        <div className="border-t">
            <div className="flex h-11 items-center gap-3 px-4 text-[13px]">
                <b className="font-medium">
                    {row.name}, {day(row.at)}
                </b>
                <span className="text-muted-foreground">{review.sideBySide}</span>
            </div>
            <Table className="bg-card" containerClassName="overflow-x-auto">
                <Table.Header>
                    <Table.Row className="border-b-0">
                        <Table.Head className={`${HEAD} w-[143px]`} />
                        <Table.Head className={`${HEAD} w-[239px]`}>{review.inThisFile}</Table.Head>
                        <Table.Head className={HEAD}>{review.inOutlayr}</Table.Head>
                        <Table.Head className={`${HEAD} w-12`} />
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {lines.map((line, index) => (
                        <Table.Row key={index}>
                            <Table.Cell className={`${ROW} text-muted-foreground text-[13px]`}>{line.label}</Table.Cell>
                            <Table.Cell className={`${ROW} dash-figure text-sm`}>{line.mine}</Table.Cell>
                            <Table.Cell className={`${ROW} dash-figure text-sm`}>{line.theirs}</Table.Cell>
                            <Table.Cell align="end" className={ROW}>
                                {line.same ? (
                                    <Glyph className="text-app-income ms-auto" icon={Tick02Icon} size={16} />
                                ) : null}
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
        </div>
    );
}

function Duplicates({ draft, model, store }: { draft: Draft; model: FileModel; store: DraftStore }) {
    const { columns, review } = useIntlayer("dashboard-import");
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const day = useEntryDay();
    const rows = model.rows.flatMap((row) => (row.duplicate ? [{ ...row, duplicate: row.duplicate }] : []));
    const [focus, setFocus] = useState(rows[0]?.index ?? null);
    const focused = rows.find((row) => row.index === focus) ?? rows[0];
    const accountName = (id: string | null) => ledger.books.accounts.find((account) => account.localId === id)?.name;
    const force = (index: number, forced: boolean) =>
        store.change({
            forced: forced ? [...new Set([...draft.forced, index])] : draft.forced.filter((each) => each !== index),
        });
    const skipped = rows.filter((row) => !row.ticked);
    return (
        <>
            <Frame.Panel className="flex flex-1 flex-col">
                <Table containerClassName="overflow-x-auto">
                    <Table.Header>
                        <Table.Row className="border-b-0">
                            <Table.Head className={`${HEAD} w-10`} />
                            <Table.Head className={`${HEAD} md:w-[85px]`}>{columns.date}</Table.Head>
                            <Table.Head className={`${HEAD} md:w-[166px]`}>{columns.merchant}</Table.Head>
                            <Table.Head className={`${HEAD} max-lg:hidden`}>{columns.alreadyIn}</Table.Head>
                            <Table.Head className={HEAD} />
                            <Table.Head align="end" className={HEAD}>
                                {columns.amount}
                            </Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {rows.map((row) => (
                            <Table.Row
                                className={`cursor-pointer ${row.index === focused?.index ? "bg-app-tint/8" : ""}`}
                                key={row.index}
                                onClick={() => setFocus(row.index)}
                            >
                                <Table.Cell className={`${ROW} h-[57px]`}>
                                    <Checkbox
                                        aria-label={row.name}
                                        checked={row.ticked}
                                        onCheckedChange={(checked) => force(row.index, checked)}
                                    />
                                </Table.Cell>
                                <Table.Cell className={`${ROW} dash-figure text-sm whitespace-nowrap`}>
                                    {day(row.at)}
                                </Table.Cell>
                                <Table.Cell className={`${ROW} max-w-0`}>
                                    <b className="block truncate text-sm leading-4 font-medium">{row.name}</b>
                                    <small className="dash-figure text-muted-foreground block truncate text-xs leading-4">
                                        {row.label}
                                    </small>
                                </Table.Cell>
                                <Table.Cell className={`${ROW} text-muted-foreground text-sm max-lg:hidden`}>
                                    {[
                                        ledger.books.transactions.find((entry) => entry.localId === row.duplicate.id)
                                            ?.note || row.name,
                                        day(row.duplicate.at),
                                        accountName(row.duplicate.accountId),
                                    ]
                                        .filter(Boolean)
                                        .join(", ")}
                                </Table.Cell>
                                <Table.Cell className={ROW}>
                                    <Segment forced={row.ticked} onForce={(forced) => force(row.index, forced)} />
                                </Table.Cell>
                                <Table.Cell
                                    align="end"
                                    className={`${ROW} dash-figure text-sm whitespace-nowrap ${row.income ? "text-app-income" : ""}`}
                                >
                                    {money(row.income ? row.amount : -row.amount, row.currency, "always")}
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>
                {focused ? <SideBySide row={focused} /> : null}
            </Frame.Panel>
            <Frame.Footer className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <span className="text-muted-foreground">{review.matchRule}</span>
                <span className="text-muted-foreground">
                    {review.skippedTotal({ amount: money(net(skipped), ledger.currency, "always") })}
                </span>
            </Frame.Footer>
        </>
    );
}

function Rows({
    draft,
    filter,
    model,
    store,
}: {
    draft: Draft;
    filter: Exclude<Filter, "duplicates">;
    model: FileModel;
    store: DraftStore;
}) {
    const { columns, review } = useIntlayer("dashboard-import");
    const { money } = useDisplayFormat();
    const day = useEntryDay();
    const [page, setPage] = useState(0);
    const visible = filter === "all" ? model.rows : model.rows.filter((row) => filterOf(row) === filter);
    const pages = Math.max(1, Math.ceil(visible.length / PAGE));
    const current = Math.min(page, pages - 1);
    const shown = visible.slice(current * PAGE, current * PAGE + PAGE);
    const choosable = visible.filter((row) => !row.duplicate);
    const ticked = choosable.filter((row) => row.ticked).length;

    const tick = (row: ModelRow, on: boolean) => {
        if (row.duplicate) {
            store.change({
                forced: on ? [...draft.forced, row.index] : draft.forced.filter((index) => index !== row.index),
            });
            return;
        }
        store.change({
            unticked: on ? draft.unticked.filter((index) => index !== row.index) : [...draft.unticked, row.index],
        });
    };
    const tickAll = (on: boolean) => {
        const unticked = new Set(draft.unticked);
        for (const row of choosable) {
            if (on) {
                unticked.delete(row.index);
            } else {
                unticked.add(row.index);
            }
        }
        store.change({ unticked: [...unticked] });
    };

    return (
        <>
            <Frame.Panel className="flex flex-1 flex-col">
                <Table containerClassName="overflow-x-auto">
                    <Table.Header>
                        <Table.Row className="border-b-0">
                            <Table.Head className={`${HEAD} w-10`}>
                                <Checkbox
                                    aria-label={review.selectAll.value}
                                    checked={choosable.length > 0 && ticked === choosable.length}
                                    disabled={choosable.length === 0}
                                    indeterminate={ticked > 0 && ticked < choosable.length}
                                    onCheckedChange={(checked) => tickAll(checked)}
                                />
                            </Table.Head>
                            <Table.Head className={`${HEAD} py-1 md:w-[145px]`}>
                                {columns.date}
                                <Mapped draft={draft} fields={["date"]} />
                            </Table.Head>
                            <Table.Head className={`${HEAD} py-1 md:w-[201px]`}>
                                {columns.merchant}
                                <Mapped draft={draft} fields={["merchant"]} />
                            </Table.Head>
                            <Table.Head className={`${HEAD} md:w-[164px]`}>{columns.category}</Table.Head>
                            <Table.Head className={`${HEAD} max-lg:hidden`}>{columns.status}</Table.Head>
                            <Table.Head align="end" className={`${HEAD} py-1`}>
                                {columns.amount}
                                <span className="flex justify-end">
                                    <Mapped draft={draft} fields={["amount", "amountOut", "amountIn"]} />
                                </span>
                            </Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {shown.map((row) => {
                            const duplicate = row.duplicate !== null;
                            const dim = duplicate && !row.ticked;
                            const tone = dim ? "text-muted-foreground/70" : "";
                            return (
                                <Table.Row key={row.index}>
                                    <Table.Cell className={ROW}>
                                        <Checkbox
                                            aria-label={row.name}
                                            checked={row.ticked}
                                            onCheckedChange={(checked) => tick(row, checked)}
                                        />
                                    </Table.Cell>
                                    <Table.Cell className={`${ROW} dash-figure text-sm whitespace-nowrap ${tone}`}>
                                        {day(row.at)}
                                    </Table.Cell>
                                    <Table.Cell className={`${ROW} max-w-0 ${tone}`}>
                                        <b className="block truncate text-sm leading-4 font-medium">{row.name}</b>
                                        <small className="dash-figure text-muted-foreground block truncate text-xs leading-4">
                                            {row.label}
                                        </small>
                                    </Table.Cell>
                                    <Table.Cell className={`${ROW} ${dim ? "opacity-50" : ""}`}>
                                        <CategoryChip
                                            choice={row.category}
                                            disabled={dim}
                                            income={row.income}
                                            newName={null}
                                            onPick={(choice) =>
                                                store.change({
                                                    rowCategories: {
                                                        ...draft.rowCategories,
                                                        [String(row.index)]: choice,
                                                    },
                                                })
                                            }
                                        />
                                    </Table.Cell>
                                    <Table.Cell className={`${ROW} max-lg:hidden ${dim ? "opacity-60" : ""}`}>
                                        <Badge
                                            className="h-6 gap-1.5 rounded-md px-2 text-xs font-medium"
                                            variant={duplicate ? "warning" : "success"}
                                        >
                                            <i className="size-1.5 rounded-full bg-current" />
                                            {duplicate ? review.duplicates : review.new}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell
                                        align="end"
                                        className={`${ROW} dash-figure text-sm whitespace-nowrap ${dim ? "text-muted-foreground/70 line-through" : ""} ${row.income && !dim ? "text-app-income" : ""}`}
                                    >
                                        {money(row.income ? row.amount : -row.amount, row.currency, "always")}
                                    </Table.Cell>
                                </Table.Row>
                            );
                        })}
                    </Table.Body>
                </Table>
            </Frame.Panel>
            <Frame.Footer className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <Pager
                    label={review.showing({ shown: shown.length, total: visible.length })}
                    onNext={() => setPage(current + 1)}
                    onPrevious={() => setPage(current - 1)}
                    page={current}
                    pages={pages}
                />
            </Frame.Footer>
        </>
    );
}

export function ReviewStep({
    draft,
    failed,
    model,
    onCancel,
    onImport,
    onStartOver,
    restored,
    store,
}: {
    draft: Draft;
    /** The last write didn't land: nothing is in the ledger and the picks are still here. */
    failed: boolean;
    model: FileModel;
    onCancel: () => void;
    onImport: () => void;
    onStartOver: () => void;
    restored: boolean;
    store: DraftStore;
}) {
    const copy = useIntlayer("dashboard-import");
    const { review } = copy;
    const [filter, setFilter] = useState<Filter>("all");
    const count = (which: Exclude<Filter, "all">) => model.rows.filter((row) => filterOf(row) === which).length;
    const duplicates = count("duplicates");
    const total = importable(model).length;
    const tabs: { count: number; label: ReactNode; value: Filter }[] = [
        { count: model.rows.length, label: review.all, value: "all" },
        { count: count("new"), label: review.new, value: "new" },
        { count: count("pick"), label: review.pickCategory, value: "pick" },
        ...(duplicates > 0 ? [{ count: duplicates, label: review.duplicates, value: "duplicates" as const }] : []),
    ];
    const label = total === 1 ? review.importOne : review.importCount({ count: total.toLocaleString() });

    return (
        <ImportPage>
            <ImportBar step="review">
                <Button onClick={onCancel} variant="outline">
                    {copy.cancel}
                </Button>
                <Button
                    disabled={total === 0}
                    onClick={onImport}
                    title={total === 0 ? review.nothingSelected.value : undefined}
                >
                    {failed ? copy.tryAgain : label}
                </Button>
            </ImportBar>
            <Columns rail={<ReviewRail draft={draft} model={model} store={store} />}>
                <Frame className="min-w-0">
                    {restored ? (
                        <div className="flex min-h-13 flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-[13px]">
                            <Glyph className="flex-none" icon={RefreshIcon} size={16} />
                            <b className="font-medium">{review.pickingUp}</b>
                            <span className="text-muted-foreground">{review.keptNote}</span>
                            <Button className="ml-auto" onClick={onStartOver} size="sm" variant="outline">
                                {review.startOver}
                            </Button>
                        </div>
                    ) : null}
                    {failed ? (
                        <Banner title={review.nothingImported} tone="bad">
                            {review.nothingImportedHint}
                        </Banner>
                    ) : null}
                    <Frame.Header className="min-h-10 py-0 ps-0">
                        <Tabs
                            className="min-w-0"
                            onValueChange={(value) =>
                                setFilter(tabs.find((tab) => tab.value === value)?.value ?? "all")
                            }
                            value={filter}
                            variant="underline"
                        >
                            <Tabs.List aria-label={review.all.value}>
                                {tabs.map((tab) => (
                                    <Tabs.Trigger key={tab.value} value={tab.value}>
                                        {tab.label}
                                        <Tabs.Badge className="dash-figure text-muted-foreground bg-transparent! px-0">
                                            {tab.count}
                                        </Tabs.Badge>
                                    </Tabs.Trigger>
                                ))}
                            </Tabs.List>
                        </Tabs>
                    </Frame.Header>
                    {filter === "duplicates" ? (
                        <Duplicates draft={draft} model={model} store={store} />
                    ) : (
                        <Rows draft={draft} filter={filter} key={filter} model={model} store={store} />
                    )}
                </Frame>
            </Columns>
        </ImportPage>
    );
}
