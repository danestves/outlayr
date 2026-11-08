import { placed } from "@outlayr/backend/confect/lib/ledgerLog";
import { RiArrowUpDownLine, RiCheckLine, RiSearch2Line } from "@remixicon/react";
import { Menu } from "panelui-web/menu";
import { Tabs } from "panelui-web/tabs";
import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { UNCATEGORIZED_ID } from "@/lib/dashboard-series-ledger";
import type { LedgerRow } from "@/lib/dashboard-series-ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { CardFrame } from "../home/card-frame";
import { useCatalog } from "../home/catalog";
import { titled } from "../home/format";
import type { FoldedRow, TransactionSort } from "../home/rows";
import { QuietTable } from "../home/setup";
import { EntrySheet } from "./entry-sheet";
import { LedgerTable } from "./ledger-table";
import { ENTRY_TYPES, csvOf, exportLines, linesOf, queryRows, rangeOf, tally } from "./model";
import { pageQueryOf } from "./search";
import type { PageSearch, SearchPatch } from "./search";
import { Toolbar } from "./toolbar";

const TABS = ["all", "expenses", "income", "transfers"] as const;
const SORTS = ["newest", "oldest", "largest"] as const satisfies readonly TransactionSort[];
const TYPING = "input, textarea, select, [contenteditable=true]";

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
        const category = (id: string | null) => {
            if (id === null || id === UNCATEGORIZED_ID) {
                return id === null ? "" : uncategorized.value;
            }
            const found = ledger.categories.get(id) ?? ledger.budgetTargets.get(id);
            return found ? titled(found.name, locale) : "";
        };
        const merchant = (row: LedgerRow) => row.note.trim() || category(row.topId);
        return { account, category, merchant };
    }, [ledger, locale, uncategorized.value]);
    const text = useMemo(
        () => (row: FoldedRow) =>
            "fromId" in row
                ? `${names.account(row.fromId)} ${names.account(row.toId)}`
                : [
                      names.merchant(row),
                      names.category(row.topId),
                      names.category(row.categoryId),
                      names.account(row.accountId),
                      catalog.transaction(row.id)?.details ?? "",
                  ].join(" "),
        [catalog, names]
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
    const stepByKey = useEffectEvent(step);
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
    const exportCsv = () => {
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
        const exported = exportLines(ledger, rows, {
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
                    <button
                        className="dash-ob"
                        onClick={() => setSearch({ from: null, span: "all", to: null })}
                        type="button"
                    >
                        {words.noMatch.searchAll}
                    </button>
                ) : null}
                {filtered || query.q.trim() !== "" ? (
                    <button className="dash-ob" onClick={() => setSearch(CLEARED)} type="button">
                        {words.clearFilters}
                    </button>
                ) : null}
            </div>
        </div>
    );
    const header = (
        <div className="flex items-center justify-end gap-2 max-sm:flex-wrap">
            <label className="border-border focus-within:border-app-tint text-muted-foreground flex h-[30px] w-[min(320px,100%)] items-center gap-2 rounded-[9px] border px-2.5 text-[13px] max-sm:w-full">
                <RiSearch2Line className="shrink-0" size={14} />
                <input
                    aria-label={words.search.value}
                    className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none pointer-coarse:text-base"
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
                <kbd className="text-[11px] leading-4 pointer-coarse:hidden">/</kbd>
            </label>
            <div className="flex items-center gap-2 max-sm:w-full max-sm:justify-between">
                <Tabs
                    onValueChange={(value) => setSearch({ type: ENTRY_TYPES.find((type) => type === value) ?? null })}
                    value={tab}
                >
                    <Tabs.List className="bg-background/40 rounded-[9px] p-0.5">
                        {TABS.map((each) => (
                            <Tabs.Trigger className="h-[26px] rounded-[7px] px-2.5 text-[13px]" key={each} value={each}>
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
                <Menu>
                    <Menu.Trigger
                        aria-label={home.sort.label.value}
                        className="dash-icon-btn text-muted-foreground size-[30px]"
                    >
                        <RiArrowUpDownLine size={16} />
                    </Menu.Trigger>
                    <Menu.Content className="app-shell dash-menu ph-no-capture" sideOffset={8}>
                        {SORTS.map((sort) => (
                            <Menu.Item
                                className="dash-menu-item"
                                key={sort}
                                onClick={() => setSearch({ sort: sort === "newest" ? null : sort })}
                            >
                                {home.sort[sort]}
                                <RiCheckLine
                                    className={`text-app-tint ml-auto ${query.sort === sort ? "" : "invisible"}`}
                                    size={16}
                                />
                            </Menu.Item>
                        ))}
                    </Menu.Content>
                </Menu>
            </div>
        </div>
    );
    const count = (value: number) => value.toLocaleString(locale);
    return (
        <main className="@container min-w-0 px-4 pb-5 sm:px-6">
            <Toolbar onExport={exportCsv} query={query} setSearch={setSearch} setup={fresh} />
            <CardFrame
                action={fresh ? undefined : header}
                footer={
                    fresh || rows.length === 0 ? undefined : (
                        <span className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                            <span>
                                <span className="text-muted-foreground">{home.entries} </span>
                                <span className="dash-figure font-medium">{count(totals.count)}</span>
                            </span>
                            <span className="ml-auto">
                                <span className="text-muted-foreground">{words.footer.in} </span>
                                <span className="dash-figure text-app-income font-medium">
                                    {money(totals.in, ledger.currency)}
                                </span>
                            </span>
                            <span>
                                <span className="text-muted-foreground">{words.footer.out} </span>
                                <span className="dash-figure font-medium">{money(totals.out, ledger.currency)}</span>
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
                panelClassName="@container overflow-clip [overflow-anchor:none]"
                stackAction
                title={home.title}
            >
                {fresh ? (
                    <div className="dash-empty relative isolate min-h-[299px] justify-end pt-0 pb-7">
                        <QuietTable />
                        <b className="text-[15px] font-semibold">{words.empty.title}</b>
                        <p className="text-muted-foreground text-[13px]">{words.empty.line}</p>
                    </div>
                ) : (
                    <LedgerTable
                        empty={noMatch}
                        label={home.title.value}
                        lines={lines}
                        onOpen={(row) => setSearch({ entry: row.id })}
                        selected={selected?.id ?? null}
                    />
                )}
            </CardFrame>
            <EntrySheet onClose={() => setSearch({ entry: null })} onStep={step} row={selected} />
        </main>
    );
}
