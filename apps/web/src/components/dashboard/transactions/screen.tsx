import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowUpDownIcon from "@hugeicons/core-free-icons/ArrowUpDownIcon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import Download01Icon from "@hugeicons/core-free-icons/Download01Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { placed } from "@outlayr/backend/confect/lib/ledgerLog";
import { Button } from "panelui-web/button";
import { Input } from "panelui-web/input";
import { Menu } from "panelui-web/menu";
import { Tabs } from "panelui-web/tabs";
import { Toolbar } from "panelui-web/toolbar";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { UNCATEGORIZED_ID } from "@/lib/dashboard-series-ledger";
import type { LedgerRow } from "@/lib/dashboard-series-ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { CardFrame } from "../home/card-frame";
import { useCatalog } from "../home/catalog";
import { titled } from "../home/format";
import type { FoldedRow, TransactionSort } from "../home/rows";
import { QuietTable } from "../home/setup";
import { BulkActions } from "./bulk-actions";
import { EntrySheet } from "./entry-sheet";
import { LedgerTable } from "./ledger-table";
import { ENTRY_TYPES, csvOf, exportLines, linesOf, queryRows, rangeOf, tally } from "./model";
import { pageQueryOf } from "./search";
import type { PageSearch, SearchPatch } from "./search";
import { FilterBar } from "./toolbar";
import { useDeleteEntries } from "./use-delete";

// Toolbar sizes its buttons for an icon; these carry their label too.
const BULK_ACTION = "text-foreground gap-1.5 px-2.5 text-[13px] font-medium whitespace-nowrap";
const TABS = ["all", "expenses", "income", "transfers"] as const;
const SORTS = ["newest", "oldest", "largest"] as const satisfies readonly TransactionSort[];
const TYPING = "input, textarea, select, [contenteditable=true], [role=listbox], [role=menu], .dash-po";

const CLEARED: SearchPatch = {
    accounts: null,
    category: null,
    from: null,
    max: null,
    min: null,
    q: null,
    span: null,
    to: null,
    type: null,
};

function download(name: string, body: string) {
    const url = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
}

interface TransactionsScreenProps {
    search: PageSearch;
    setSearch: (patch: SearchPatch, options?: { replace?: boolean }) => void;
}

export function TransactionsScreen({ search, setSearch }: TransactionsScreenProps) {
    const { filters, ledger } = useDashboard();
    const { transactions: home, uncategorized } = useIntlayer("dashboard-home");
    const words = useIntlayer("dashboard-transactions");
    const { add } = useIntlayer("dashboard");
    const { open } = useAccountFlows();
    const { locale } = useLocale();
    const { money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const searchField = useRef<HTMLInputElement>(null);
    const query = useMemo(() => pageQueryOf(search), [search]);
    const range = useMemo(
        () => rangeOf({ custom: query.custom, key: filters.period.key, span: query.span }, ledger.firstDayOfMonth),
        [filters.period.key, ledger.firstDayOfMonth, query.custom, query.span]
    );
    const names = useMemo(() => {
        const account = (id: string | null) => (id === null ? "" : (ledger.accounts.get(id)?.name ?? ""));
        const books = new Map(ledger.books.categories.map((row) => [row.localId, row]));
        const category = (id: string | null) => {
            if (id === null || id === UNCATEGORIZED_ID) {
                return id === null ? "" : uncategorized.value;
            }
            const found = ledger.categories.get(id) ?? books.get(id);
            return found?.name ? titled(found.name, locale) : "";
        };
        const merchant = (row: LedgerRow) => row.note.trim() || category(row.topId);
        return { account, category, merchant };
    }, [ledger, locale, uncategorized.value]);
    const transferNotes = useMemo(
        () => new Map(ledger.books.transfers.map((move) => [move.localId, move.note])),
        [ledger.books.transfers]
    );
    const text = useMemo(
        () => (row: FoldedRow) =>
            "fromId" in row
                ? `${names.account(row.fromId)} ${names.account(row.toId)} ${transferNotes.get(row.id) ?? ""}`
                : [
                      names.merchant(row),
                      names.category(row.topId),
                      names.category(row.categoryId),
                      names.account(row.accountId),
                      catalog.transaction(row.id)?.details ?? "",
                  ].join(" "),
        [catalog, names, transferNotes]
    );
    const rows = useMemo(
        () => queryRows(ledger, { ...query, accounts: filters.accounts, categories: filters.categories, range }, text),
        [filters.accounts, filters.categories, ledger, query, range, text]
    );
    const lines = useMemo(() => linesOf(ledger, rows, query.sort !== "largest"), [ledger, query.sort, rows]);
    const totals = useMemo(() => tally(ledger, rows), [ledger, rows]);
    const selectedIndex = search.entry === undefined ? -1 : rows.findIndex((row) => row.id === search.entry);
    const selected = useMemo(() => {
        if (search.entry === undefined) {
            return null;
        }
        // A link from home can name an entry outside these filters; it still opens.
        const listed = rows[selectedIndex];
        return (
            listed ??
            queryRows(
                ledger,
                { ...query, accounts: [], categories: [], max: null, min: null, q: "", range: null, type: undefined },
                text
            ).find((row) => row.id === search.entry) ??
            null
        );
    }, [ledger, query, rows, search.entry, selectedIndex, text]);
    const step = (by: 1 | -1) => {
        const next = rows[selectedIndex === -1 ? 0 : selectedIndex + by];
        if (next) {
            setSearch({ entry: next.id }, { replace: true });
        }
    };
    const [pickedIds, setPickedIds] = useState<ReadonlySet<string>>(new Set());
    const picked = useMemo(() => rows.filter((row) => pickedIds.has(row.id)), [pickedIds, rows]);
    const pickedTotals = useMemo(() => tally(ledger, picked), [ledger, picked]);
    const deleteEntries = useDeleteEntries();
    const clearPicked = () => setPickedIds(new Set());
    const deletePicked = () => {
        deleteEntries(picked.map((row) => row.id));
        clearPicked();
    };
    const onEscape = useEffectEvent(() => {
        if (selected === null) {
            clearPicked();
        }
    });
    const stepByKey = useEffectEvent((by: 1 | -1) => {
        if (selected === null) {
            step(by);
        }
    });
    // oxlint-disable-next-line outlayr/react-effect-budget -- the keyboard is an external system.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (
                event.metaKey ||
                event.ctrlKey ||
                event.altKey ||
                (event.target instanceof Element && event.target.closest(TYPING))
            ) {
                return;
            }
            if (event.key === "/") {
                event.preventDefault();
                searchField.current?.focus();
            } else if (event.key === "j" || event.key === "k") {
                stepByKey(event.key === "j" ? 1 : -1);
            } else if (event.key === "Escape") {
                onEscape();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);
    const fresh = ledger.rows.length === 0 && ledger.transfers.length === 0;
    const filtered =
        filters.accounts.length > 0 ||
        filters.categories.length > 0 ||
        query.min !== null ||
        query.max !== null ||
        query.type !== undefined;
    const tab = query.type ?? "all";
    const exportCsv = (listed: readonly FoldedRow[]) => {
        const header = [
            words.csv.date.value,
            words.csv.merchant.value,
            words.csv.category.value,
            words.csv.account.value,
            words.csv.type.value,
            words.csv.amount.value,
            words.csv.currency.value,
            words.csv.inMain({ currency: ledger.currency }).value,
        ];
        const exported = exportLines(ledger, listed, {
            account: names.account,
            category: (row) => (row.feeFor === null ? names.category(row.topId) : ""),
            currency: (row) => {
                const raw = catalog.transaction(row.id);
                return raw ? placed(raw, ledger.currency, null) : { amount: row.original, currency: ledger.currency };
            },
            kind: {
                expense: words.kind.expense.value,
                fee: words.kind.fee.value,
                income: words.kind.income.value,
                transfer: words.kind.transfer.value,
            },
            merchant: names.merchant,
        });
        const span = range === null ? "all" : `${range.from}_${range.to}`;
        download(`${words.exportFile.value}-${span}.csv`, csvOf([header, ...exported]));
    };
    const noMatch = (
        <div className="flex flex-col items-center gap-1 px-4 py-14 text-center">
            <b className="text-[15px] font-semibold">
                {query.q.trim() === "" ? words.noMatch.filters : words.noMatch.query({ query: query.q.trim() })}
            </b>
            <div className="mt-2.5 flex gap-2">
                {range !== null && query.q.trim() !== "" ? (
                    <Button
                        onClick={() => setSearch({ from: null, span: "all", to: null })}
                        size="sm"
                        variant="outline"
                    >
                        {words.noMatch.searchAll}
                    </Button>
                ) : null}
                {filtered || query.q.trim() !== "" ? (
                    <Button onClick={() => setSearch(CLEARED)} size="sm" variant="outline">
                        {words.clearFilters}
                    </Button>
                ) : null}
            </div>
        </div>
    );
    const sortMenu = (
        <Menu>
            <Menu.Trigger
                aria-label={home.sort.label.value}
                render={<Button className="text-muted-foreground size-5" size="icon-sm" variant="ghost" />}
            >
                <HugeiconsIcon icon={ArrowUpDownIcon} size={13} />
            </Menu.Trigger>
            <Menu.Content className="app-shell ph-no-capture" sideOffset={8}>
                <Menu.RadioGroup value={query.sort}>
                    {SORTS.map((sort) => (
                        <Menu.RadioItem
                            closeOnClick
                            key={sort}
                            onClick={() => setSearch({ sort: sort === "newest" ? null : sort })}
                            value={sort}
                        >
                            {home.sort[sort]}
                        </Menu.RadioItem>
                    ))}
                </Menu.RadioGroup>
            </Menu.Content>
        </Menu>
    );
    const header = (
        <div className="flex items-center justify-end gap-2 max-sm:flex-wrap">
            <Input.Group className="w-[300px] max-w-full shrink max-sm:w-[calc(100vw-72px)]" size="sm">
                <Input.Addon>
                    <HugeiconsIcon icon={Search01Icon} size={14} />
                </Input.Addon>
                <Input
                    aria-label={words.search.value}
                    onChange={(event) => setSearch({ q: event.target.value }, { replace: true })}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            event.currentTarget.blur();
                        }
                    }}
                    placeholder={words.search.value}
                    ref={searchField}
                    type="search"
                    value={query.q}
                />
                <Input.Addon align="end" className="pointer-coarse:hidden">
                    <kbd className="text-[11px] leading-4">/</kbd>
                </Input.Addon>
            </Input.Group>
            <div className="flex items-center gap-2 max-sm:hidden">
                <Tabs
                    onValueChange={(value) => setSearch({ type: ENTRY_TYPES.find((type) => type === value) ?? null })}
                    value={tab}
                >
                    <Tabs.List>
                        {TABS.map((each) => (
                            <Tabs.Trigger key={each} value={each}>
                                {
                                    {
                                        all: home.all,
                                        expenses: home.expenses,
                                        income: home.incomeTab,
                                        transfers: words.transfers,
                                    }[each]
                                }
                            </Tabs.Trigger>
                        ))}
                    </Tabs.List>
                </Tabs>
            </div>
        </div>
    );
    const count = (value: number) => value.toLocaleString(locale);
    return (
        <main className="@container flex h-[calc(100dvh-52px-env(safe-area-inset-top))] min-w-0 flex-col px-4 pb-5 sm:px-6 lg:h-dvh">
            <FilterBar onExport={() => exportCsv(rows)} query={query} setSearch={setSearch} setup={fresh} />
            <CardFrame
                action={fresh ? undefined : header}
                className="min-h-0 flex-1 max-sm:[&_[data-slot=frame-title]]:hidden"
                footer={
                    fresh || rows.length === 0 ? undefined : (
                        <span className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                            <span className="max-sm:order-last max-sm:ml-auto">
                                <span className="text-muted-foreground max-sm:hidden">{home.entries} </span>
                                <span className="dash-figure max-sm:text-muted-foreground font-medium max-sm:font-normal">
                                    {count(totals.count)}
                                </span>
                            </span>
                            <span className="ml-auto max-sm:hidden">
                                <span className="text-muted-foreground">{words.footer.in} </span>
                                <span className="dash-figure text-app-income font-medium">
                                    {money(totals.in, ledger.currency, "always")}
                                </span>
                            </span>
                            <span className="max-sm:hidden">
                                <span className="text-muted-foreground">{words.footer.out} </span>
                                <span className="dash-figure font-medium">
                                    {money(-totals.out, ledger.currency, "always")}
                                </span>
                            </span>
                            <span>
                                <span className="text-muted-foreground">{words.footer.net} </span>
                                <span className="dash-figure font-medium">
                                    {money(totals.in - totals.out, ledger.currency, "always")}
                                </span>
                            </span>
                        </span>
                    )
                }
                panelClassName="@container min-h-0 overflow-x-clip overflow-y-auto [overflow-anchor:none]"
                stackAction
                title={home.title}
            >
                {fresh ? (
                    <div className="dash-empty relative isolate min-h-[299px] justify-end pt-0 pb-7">
                        <QuietTable />
                        <b className="text-[15px] font-semibold">{words.empty.title}</b>
                        <p className="text-muted-foreground text-[13px]">{words.empty.line}</p>
                        <Button className="mt-3" onClick={() => open({ kind: "entry" })}>
                            <HugeiconsIcon icon={Add01Icon} size={17} />
                            {add.entry}
                        </Button>
                    </div>
                ) : (
                    <LedgerTable
                        empty={noMatch}
                        label={home.title.value}
                        lines={lines}
                        onOpen={(row) => setSearch({ entry: row.id })}
                        picking={{
                            all: rows.length > 0 && picked.length === rows.length,
                            ids: pickedIds,
                            onPick: (id) =>
                                setPickedIds((current) => {
                                    const next = new Set(current);
                                    if (!next.delete(id)) {
                                        next.add(id);
                                    }
                                    return next;
                                }),
                            onPickAll: () =>
                                setPickedIds(new Set(picked.length === rows.length ? [] : rows.map((row) => row.id))),
                            some: picked.length > 0,
                        }}
                        selected={selected?.id ?? null}
                        sort={sortMenu}
                    />
                )}
                {picked.length > 0 ? (
                    <div className="sticky bottom-3 z-[2] hidden h-0 items-end justify-center @2xl:flex">
                        <Toolbar aria-label={words.bulk.selected({ count: String(picked.length) }).value}>
                            <span className="ps-2.5 pe-1 text-[13px] font-medium whitespace-nowrap">
                                {words.bulk.selected({ count: String(picked.length) })}
                            </span>
                            <span className="dash-figure text-muted-foreground pe-1 text-[13px] whitespace-nowrap">
                                {money(pickedTotals.in - pickedTotals.out, ledger.currency, "always")}
                            </span>
                            <Toolbar.Separator />
                            <BulkActions
                                className={BULK_ACTION}
                                ids={picked.map((row) => row.id)}
                                kinds={picked.flatMap((row) => ("income" in row ? [row.income] : []))}
                            />
                            <Toolbar.Button className={BULK_ACTION} onClick={() => exportCsv(picked)}>
                                <HugeiconsIcon icon={Download01Icon} size={14} />
                                {words.export}
                            </Toolbar.Button>
                            <Toolbar.Button className={BULK_ACTION} onClick={deletePicked}>
                                <HugeiconsIcon icon={Delete02Icon} size={14} />
                                {words.bulk.delete}
                            </Toolbar.Button>
                            <Toolbar.Separator />
                            <Toolbar.Button label={words.bulk.clear.value} onClick={clearPicked}>
                                <HugeiconsIcon icon={Cancel01Icon} size={16} />
                            </Toolbar.Button>
                        </Toolbar>
                    </div>
                ) : null}
            </CardFrame>
            <EntrySheet
                onClose={() => setSearch({ entry: null })}
                onDelete={(row) => {
                    setSearch({ entry: null });
                    deleteEntries([row.id]);
                }}
                onStep={step}
                row={selected}
            />
        </main>
    );
}
