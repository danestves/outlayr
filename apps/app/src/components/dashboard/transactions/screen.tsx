import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { placed } from "@outlayr/money/ledger-log";
import { Button } from "panelui-web/button";
import { Chip } from "panelui-web/chip";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { IconButton } from "@/components/ui/icon-button";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { photoSrc } from "@/lib/photo-src";

import { useDateFormat } from "../home/format";
import type { FoldedRow } from "../home/rows";
import { QuietTable } from "../home/setup";
import { BulkBar } from "./bulk-bar";
import { useLayout } from "./columns";
import { EntrySheet } from "./entry-sheet";
import { ExportDialog } from "./export-dialog";
import type { ExportOptions } from "./export-dialog";
import { FilterRow, useAmountLabel } from "./filter-row";
import type { PickOption } from "./filter-row";
import { InlineCell, amountDraft, useInlineWrites } from "./inline-edit";
import type { Editing, InlineField } from "./inline-edit";
import { LedgerTable } from "./ledger-table";
import { MerchantDialog } from "./merchant-dialog";
import { NO_TAG, csvOf, exportLines, inTab, pageOf, queryRows, tabCounts, tally } from "./model";
import type { Tab } from "./model";
import { PageBar } from "./page-bar";
import { usePeriodChoice } from "./period-chip";
import { CategoryPicker, RowMenu, useRowWrites } from "./row-actions";
import { appliedPatch, useSavedViews, viewParams } from "./saved-views";
import type { SavedView } from "./saved-views";
import { merchantParam, pageQueryOf, patched } from "./search";
import type { PageQuery, PageSearch, SearchPatch } from "./search";
import { useDeleteEntries } from "./use-delete";
import { useLedgerList } from "./use-ledger-list";
import type { ListParams } from "./use-ledger-list";
import { ViewDialogs } from "./view-dialogs";
import type { ViewDialog } from "./view-dialogs";
import { ViewTabs, useTabNames } from "./view-tabs";

const PAGE_SIZE = 15;
const TYPING = "input, textarea, select, [contenteditable=true], [role=listbox], [role=menu], [role=dialog]";
const DAY_MS = 86_400_000;

const CLEARED: SearchPatch = {
    accounts: null,
    category: null,
    from: null,
    max: null,
    merchant: null,
    min: null,
    period: null,
    q: null,
    span: null,
    tags: null,
    to: null,
    view: null,
};

function download(name: string, body: string) {
    const url = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
}

const daysIn = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;

const listParamsOf = (query: PageQuery, accounts: readonly string[], categories: readonly string[]): ListParams => ({
    accounts,
    categories,
    custom: query.custom,
    max: query.max,
    merchants: query.merchants,
    min: query.min,
    q: query.q,
    sort: query.sort,
    span: query.span,
    tags: query.tags,
});

function Figure({ children, label, tone = "" }: { children: ReactNode; label: ReactNode; tone?: string }) {
    return (
        <span className="whitespace-nowrap">
            <span className="text-muted-foreground">{label} </span>
            <span className={`font-mono font-medium tabular-nums ${tone}`}>{children}</span>
        </span>
    );
}

interface TransactionsScreenProps {
    search: PageSearch;
    setSearch: (patch: SearchPatch, options?: { replace?: boolean }) => void;
}

export function TransactionsScreen({ search, setSearch }: TransactionsScreenProps) {
    const { filters, ledger } = useDashboard();
    const words = useIntlayer("dashboard-ledger");
    const legacy = useIntlayer("dashboard-transactions");
    const { add } = useIntlayer("dashboard");
    const { open } = useAccountFlows();
    const { locale } = useLocale();
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const amountLabel = useAmountLabel();
    const searchField = useRef<HTMLInputElement>(null);
    const query = useMemo(() => pageQueryOf(search), [search]);
    const list = useLedgerList();
    const layout = useLayout();
    const saved = useSavedViews();
    const writes = useRowWrites();
    const inline = useInlineWrites();
    const tabNames = useTabNames();
    const deleteEntries = useDeleteEntries();
    const [merchantFor, setMerchantFor] = useState<string | null>(null);
    const [merchantSaves, setMerchantSaves] = useState(0);
    const view = saved.views.find((each) => each.id === search.view) ?? null;
    const transfers = query.tab === "transfers";

    const all = useMemo(
        () => list.rows(listParamsOf(query, filters.accounts, filters.categories)),
        [filters.accounts, filters.categories, list, query]
    );
    const counts = useMemo(() => tabCounts(all, list.review), [all, list.review]);
    const rows = useMemo(() => all.filter((row) => inTab(query.tab, row, list.review)), [all, list.review, query.tab]);
    const viewCounts = useMemo(
        () =>
            new Map(
                saved.views.map((each) => {
                    const scoped = pageQueryOf(patched({}, appliedPatch(each)));
                    const accounts = each.params.accounts?.split(",") ?? [];
                    const categories = each.params.category?.split(",") ?? [];
                    const matched = list
                        .rows(listParamsOf(scoped, accounts, categories))
                        .filter((row) => inTab(scoped.tab, row, list.review));
                    return [each.id, matched.length];
                })
            ),
        [list, saved.views]
    );

    const filterKey = JSON.stringify([query, filters.accounts, filters.categories]);
    const [paging, setPaging] = useState({ key: filterKey, page: 0 });
    const page = pageOf(rows.length, paging.key === filterKey ? paging.page : 0, PAGE_SIZE);
    // An edit can move a row out of this page under the active sort, so the page keeps its rows until it changes.
    const pinKey = `${filterKey}#${page.page}#${ledger.rows.length + ledger.transfers.length}`;
    const [pinned, setPinned] = useState<{ ids: readonly string[]; key: string } | null>(null);
    const [editingAt, setEditing] = useState<Editing | null>(null);
    const holding = pinned?.key === pinKey;
    const editing = holding ? editingAt : null;
    const shown = useMemo(() => {
        if (!holding) {
            return rows.slice(page.first, page.last);
        }
        const byId = new Map(rows.map((row) => [row.id, row]));
        return pinned.ids.flatMap((id) => byId.get(id) ?? []);
    }, [holding, page.first, page.last, pinned, rows]);
    const goTo = (next: number) => setPaging({ key: filterKey, page: next });
    const startEdit = (field: InlineField, id: string) => {
        setPinned({ ids: shown.map((row) => row.id), key: pinKey });
        setEditing({ field, id });
    };
    const isEditing = (field: InlineField, id: string) => editing?.field === field && editing.id === id;
    const [exporting, setExporting] = useState(false);
    const period = usePeriodChoice(query);

    const [pickedIds, setPickedIds] = useState<ReadonlySet<string>>(new Set());
    const picked = useMemo(() => rows.filter((row) => pickedIds.has(row.id)), [pickedIds, rows]);
    const clearPicked = () => setPickedIds(new Set());
    const [dialog, setDialog] = useState<ViewDialog | null>(null);

    const selectedIndex = search.entry === undefined ? -1 : rows.findIndex((row) => row.id === search.entry);
    const selected = useMemo(() => {
        if (search.entry === undefined) {
            return null;
        }
        // A link from home can name an entry outside these filters; it still opens.
        return (
            rows[selectedIndex] ??
            queryRows(
                ledger,
                {
                    accounts: [],
                    categories: [],
                    max: null,
                    min: null,
                    q: "",
                    range: null,
                    sort: "newest",
                    type: undefined,
                },
                list.text
            ).find((row) => row.id === search.entry) ??
            null
        );
    }, [ledger, list.text, rows, search.entry, selectedIndex]);
    const step = (by: 1 | -1) => {
        const next = rows[selectedIndex === -1 ? 0 : selectedIndex + by];
        if (next) {
            setSearch({ entry: next.id }, { replace: true });
        }
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

    const filtering = (patch: SearchPatch, options?: { replace?: boolean }) =>
        setSearch({ ...patch, view: null }, options);
    const onTab = (tab: Tab) => setSearch({ type: tab === "all" ? null : tab, view: null });
    const onView = (each: SavedView) => {
        if (each.layout) {
            layout.apply(each.layout);
        }
        setSearch(appliedPatch(each));
    };

    const tagOptions = useMemo((): PickOption[] => {
        const uses = new Map<string, number>();
        let untagged = 0;
        for (const row of all) {
            const tags = list.tagsOf(row.id);
            untagged += tags.length === 0 ? 1 : 0;
            for (const tag of tags) {
                uses.set(tag.localId, (uses.get(tag.localId) ?? 0) + 1);
            }
        }
        return [
            ...list.tags.map((tag) => ({ count: uses.get(tag.localId) ?? 0, id: tag.localId, name: tag.name })),
            { count: untagged, id: NO_TAG, name: words.filters.noTag.value },
        ];
    }, [all, list, words.filters.noTag.value]);
    const merchantOptions = useMemo((): PickOption[] => {
        const seen = new Map<string, PickOption>();
        for (const row of all) {
            if (!("fromId" in row) && row.feeFor === null) {
                const name = list.names.merchant(row);
                const known = seen.get(name);
                seen.set(name, {
                    count: (known?.count ?? 0) + 1,
                    id: name,
                    imageUrl: known?.imageUrl ?? photoSrc(list.catalog.transaction(row.id)?.imageKey),
                    name,
                });
            }
        }
        return [...seen.values()].toSorted((left, right) => right.count - left.count);
    }, [all, list]);

    const applied = useMemo(() => {
        const chips: { key: string; label: string; patch: SearchPatch }[] = [];
        for (const id of filters.accounts) {
            const rest = filters.accounts.filter((each) => each !== id);
            chips.push({ key: `a${id}`, label: list.names.account(id), patch: { accounts: rest.join(",") || null } });
        }
        for (const id of filters.categories) {
            const rest = filters.categories.filter((each) => each !== id);
            chips.push({ key: `c${id}`, label: list.names.category(id), patch: { category: rest.join(",") || null } });
        }
        for (const id of query.tags) {
            const name =
                id === NO_TAG
                    ? words.filters.noTag.value
                    : `#${list.tags.find((tag) => tag.localId === id)?.name ?? ""}`;
            chips.push({
                key: `t${id}`,
                label: name,
                patch: { tags: query.tags.filter((each) => each !== id).join(",") || null },
            });
        }
        for (const name of query.merchants) {
            chips.push({
                key: `m${name}`,
                label: name,
                patch: { merchant: merchantParam(query.merchants.filter((each) => each !== name)) },
            });
        }
        if (query.min !== null || query.max !== null) {
            chips.push({ key: "amount", label: amountLabel(query), patch: { max: null, min: null } });
        }
        return chips;
    }, [amountLabel, filters.accounts, filters.categories, list, query, words.filters.noTag.value]);

    const exportCsv = (listed: readonly FoldedRow[], { tagsAndNotes }: ExportOptions) => {
        const header = [
            legacy.csv.date.value,
            legacy.csv.merchant.value,
            legacy.csv.category.value,
            legacy.csv.account.value,
            legacy.csv.type.value,
            legacy.csv.amount.value,
            legacy.csv.currency.value,
            legacy.csv.inMain({ currency: ledger.currency }).value,
            ...(tagsAndNotes ? [legacy.csv.tags.value, legacy.csv.notes.value] : []),
        ];
        const exported = exportLines(ledger, listed, {
            account: list.names.account,
            category: (row) => (row.feeFor === null ? list.names.category(row.topId) : ""),
            currency: (row) => {
                const raw = list.catalog.transaction(row.id);
                return raw ? placed(raw, ledger.currency, null) : { amount: row.original, currency: ledger.currency };
            },
            kind: {
                expense: legacy.kind.expense.value,
                fee: legacy.kind.fee.value,
                income: legacy.kind.income.value,
                transfer: legacy.kind.transfer.value,
            },
            extra: tagsAndNotes
                ? (row) =>
                      "fromId" in row
                          ? ["", list.transferNote(row.id)]
                          : [
                                list
                                    .tagsOf(row.id)
                                    .map((tag) => `#${tag.name}`)
                                    .join(" "),
                                list.catalog.transaction(row.id)?.details ?? "",
                            ]
                : undefined,
            merchant: list.names.merchant,
        });
        download(`${legacy.exportFile.value}-${ledger.today}.csv`, csvOf([header, ...exported]));
    };

    const fresh = ledger.rows.length === 0 && ledger.transfers.length === 0;
    const narrowedByFilter = applied.length > 0 || query.q.trim() !== "";
    const totals = tally(ledger, rows);
    const cash = (value: number, sign: "always" | "auto" = "auto") => money(value, ledger.currency, sign);
    const moves = rows.flatMap((row) => ("fromId" in row ? [row] : []));
    const moved = moves.reduce((sum, move) => sum + move.amount, 0);
    const fees = moves.reduce((sum, move) => sum + move.fees.reduce((each, fee) => each + fee.amount, 0), 0);
    const spanDays = () => {
        const days = rows.map((row) => row.day).toSorted();
        const from = days[0] ?? ledger.today;
        return daysIn(from, ledger.today);
    };
    const footerFigures = (): ReactNode => {
        if (transfers) {
            return (
                <>
                    <Figure label={words.footer.moved}>{cash(moved)}</Figure>
                    <Figure label={words.footer.fees}>{cash(fees)}</Figure>
                </>
            );
        }
        if (view !== null || narrowedByFilter) {
            const net = totals.in - totals.out;
            return (
                <>
                    <Figure label={words.footer.average}>{cash(Math.abs(net) / Math.max(1, totals.count))}</Figure>
                    <Figure label={words.footer.total}>{cash(net, "always")}</Figure>
                </>
            );
        }
        switch (query.tab) {
            case "expenses": {
                return (
                    <>
                        <span className="text-muted-foreground font-mono tabular-nums">
                            {words.footer.perDay({ amount: cash(totals.out / Math.max(1, spanDays())) })}
                        </span>
                        <Figure label={words.footer.spent}>{cash(totals.out)}</Figure>
                    </>
                );
            }
            case "income": {
                return (
                    <Figure label={words.footer.in} tone="text-app-income">
                        {cash(totals.in, "always")}
                    </Figure>
                );
            }
            case "review": {
                const days = rows.map((row) => row.day).toSorted();
                return (
                    <>
                        {days.length > 0 ? (
                            <span className="text-muted-foreground font-mono tabular-nums">
                                {words.transferName({ from: date.day(days[0] ?? ""), to: date.day(days.at(-1) ?? "") })}
                            </span>
                        ) : null}
                        <Figure label={words.footer.total}>{cash(totals.in - totals.out, "always")}</Figure>
                    </>
                );
            }
            case "uncategorized": {
                return <Figure label={words.footer.total}>{cash(totals.in - totals.out, "always")}</Figure>;
            }
            default: {
                return (
                    <>
                        <Figure label={words.footer.in} tone="text-app-income">
                            {cash(totals.in, "always")}
                        </Figure>
                        <Figure label={words.footer.out}>{cash(-totals.out, "always")}</Figure>
                        <Figure label={words.footer.net}>{cash(totals.in - totals.out, "always")}</Figure>
                    </>
                );
            }
        }
    };

    const kpis = () => {
        const routes = new Map<string, { count: number; from: string; to: string }>();
        const net = new Map<string, number>();
        for (const move of moves) {
            const key = `${move.fromId}>${move.toId}`;
            const known = routes.get(key);
            routes.set(key, { count: (known?.count ?? 0) + 1, from: move.fromId, to: move.toId });
            net.set(move.toId, (net.get(move.toId) ?? 0) + move.amount);
            net.set(move.fromId, (net.get(move.fromId) ?? 0) - move.amount);
        }
        const [top] = [...routes.values()].toSorted((left, right) => right.count - left.count);
        const [into] = [...net.entries()].toSorted((left, right) => right[1] - left[1]);
        const cell = "flex min-w-0 flex-col gap-1 px-4 py-3";
        const label = "text-muted-foreground text-app-label";
        const value = "text-app-title truncate font-mono font-semibold tabular-nums";
        return (
            <div className="rounded-app-xl bg-card grid grid-cols-2 divide-x border md:grid-cols-4">
                <div className={cell}>
                    <span className={label}>{words.kpi.moved}</span>
                    <span className={value}>{cash(moved)}</span>
                </div>
                <div className={cell}>
                    <span className={label}>{words.kpi.route}</span>
                    <span className="text-app-title truncate font-semibold">
                        {top
                            ? words.transferName({ from: list.names.account(top.from), to: list.names.account(top.to) })
                            : "-"}
                    </span>
                </div>
                <div className={cell}>
                    <span className={label}>
                        {into ? words.kpi.netInto({ account: list.names.account(into[0]) }) : words.kpi.moved}
                    </span>
                    <span className={value}>{into ? cash(into[1], "always") : "-"}</span>
                </div>
                <div className={cell}>
                    <span className={label}>{words.kpi.fees}</span>
                    <span className={value}>{cash(fees)}</span>
                </div>
            </div>
        );
    };

    const empty = (): ReactNode => {
        if (query.tab === "review" && !narrowedByFilter) {
            return (
                <div className="flex flex-col items-center gap-1 px-4 py-16 text-center">
                    <b className="text-app-title font-semibold">{words.empty.reviewTitle}</b>
                    <p className="text-muted-foreground text-app-label">{words.empty.reviewLine}</p>
                </div>
            );
        }
        return (
            <div className="flex flex-col items-center gap-1 px-4 py-16 text-center">
                <b className="text-app-title font-semibold">{words.empty.noResults}</b>
                <p className="text-muted-foreground text-app-label">{words.empty.noResultsLine}</p>
                {narrowedByFilter ? (
                    <Button className="mt-3" onClick={() => setSearch(CLEARED)} size="sm" variant="outline">
                        {words.empty.clearAll}
                    </Button>
                ) : null}
            </div>
        );
    };

    const pickAll = () => {
        const ids = shown.map((row) => row.id);
        const every = ids.every((id) => pickedIds.has(id));
        setPickedIds((current) => {
            const next = new Set(current);
            for (const id of ids) {
                if (every) {
                    next.delete(id);
                } else {
                    next.add(id);
                }
            }
            return next;
        });
    };
    const pageAll = shown.length > 0 && shown.every((row) => pickedIds.has(row.id));
    const reviewIds = rows.flatMap((row) => (list.review.has(row.id) ? [row.id] : []));
    const count = (value: number) => value.toLocaleString(locale);

    return (
        <main className="flex min-h-dvh min-w-0 flex-col gap-4 px-4 pb-6 sm:px-6">
            <PageBar onExport={() => setExporting(true)} setup={fresh} transfers={transfers} />
            {fresh ? (
                <section className="rounded-app-xl bg-card relative isolate flex min-h-80 flex-col items-center justify-end gap-1 overflow-hidden border px-4 pb-8 text-center">
                    <QuietTable />
                    <b className="text-app-title font-semibold">{legacy.empty.title}</b>
                    <p className="text-muted-foreground text-app-label">{legacy.empty.line}</p>
                    <Button className="mt-3" onClick={() => open({ kind: "entry" })}>
                        {add.entry}
                    </Button>
                </section>
            ) : (
                <>
                    {transfers ? kpis() : null}
                    <section className="rounded-app-xl bg-card flex min-w-0 flex-1 flex-col overflow-hidden border">
                        <ViewTabs
                            counts={counts}
                            onSave={() => setDialog({ filters: applied.map((chip) => chip.label), kind: "save" })}
                            onTab={onTab}
                            onView={onView}
                            onViewAction={(each, action) => {
                                if (action === "duplicate") {
                                    void saved.duplicate(each, words.views.copyName({ name: each.name }).value);
                                } else if (action === "left") {
                                    void saved.move(each.id, -1);
                                } else {
                                    setDialog({ kind: action, view: each });
                                }
                            }}
                            tab={query.tab}
                            view={view}
                            viewCounts={viewCounts}
                            views={saved.views}
                        />
                        <FilterRow
                            layout={layout}
                            merchants={merchantOptions}
                            onMarkAll={
                                query.tab === "review" && reviewIds.length > 0 ? () => writes.reviewed(reviewIds) : null
                            }
                            query={query}
                            searchField={searchField}
                            setSearch={filtering}
                            tags={tagOptions}
                            transfers={transfers}
                        />
                        {applied.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-2 px-3 pb-2.5">
                                {applied.map((chip) => (
                                    <Chip
                                        key={chip.key}
                                        onRemove={() => filtering(chip.patch)}
                                        removeLabel={chip.label}
                                        size="lg"
                                    >
                                        {chip.label}
                                    </Chip>
                                ))}
                                <Button onClick={() => filtering(CLEARED)} size="sm" variant="ghost">
                                    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                                    {words.filters.clearAll}
                                </Button>
                            </div>
                        ) : null}
                        <div className="flex-1 border-t" data-motion="dissolve" key={view?.id ?? query.tab}>
                            {rows.length === 0 ? (
                                empty()
                            ) : (
                                <LedgerTable
                                    renderAmount={(row, content) => {
                                        const draft = amountDraft(ledger, row);
                                        if (draft === null) {
                                            return content;
                                        }
                                        return (
                                            <InlineCell
                                                addon={draft.currency === ledger.currency ? null : draft.currency}
                                                align="end"
                                                editing={isEditing("amount", row.id)}
                                                initial={draft.text}
                                                label={
                                                    words.inline.editAmount({ name: list.names.merchant(row) }).value
                                                }
                                                numeric
                                                onCommit={(text) => inline.amount(row, text)}
                                                onEnd={() => setEditing(null)}
                                                onStart={() => startEdit("amount", row.id)}
                                            >
                                                {content}
                                            </InlineCell>
                                        );
                                    }}
                                    renderTags={(row, content) => (
                                        <InlineCell
                                            addon={null}
                                            align="start"
                                            editing={isEditing("tags", row.id)}
                                            initial={list
                                                .tagsOf(row.id)
                                                .map((tag) => `#${tag.name}`)
                                                .join(" ")}
                                            label={words.inline.editTags({ name: list.names.merchant(row) }).value}
                                            numeric={false}
                                            onCommit={(text) => inline.tags(row, text)}
                                            onEnd={() => setEditing(null)}
                                            onStart={() => startEdit("tags", row.id)}
                                            placeholder={words.inline.tagsPlaceholder.value}
                                        >
                                            {content}
                                        </InlineCell>
                                    )}
                                    renderCategory={(row, content) => (
                                        <CategoryPicker row={row} writes={writes}>
                                            {content}
                                        </CategoryPicker>
                                    )}
                                    label={words.page.title.value}
                                    layout={layout}
                                    list={list}
                                    onOpen={(row) => setSearch({ entry: row.id })}
                                    picking={{
                                        all: pageAll,
                                        ids: pickedIds,
                                        onPick: (id) =>
                                            setPickedIds((current) => {
                                                const next = new Set(current);
                                                if (!next.delete(id)) {
                                                    next.add(id);
                                                }
                                                return next;
                                            }),
                                        onPickAll: pickAll,
                                        some: shown.some((row) => pickedIds.has(row.id)),
                                    }}
                                    renderMenu={(row) => (
                                        <RowMenu
                                            name={list.names.merchant(row)}
                                            onDelete={() => deleteEntries([row.id])}
                                            onEditMerchant={
                                                "fromId" in row || row.feeFor !== null
                                                    ? undefined
                                                    : () => setMerchantFor(row.id)
                                            }
                                            onOpen={() => setSearch({ entry: row.id })}
                                            reviewing={list.review.has(row.id)}
                                            row={row}
                                            writes={writes}
                                        />
                                    )}
                                    rows={shown}
                                    selected={selected?.id ?? null}
                                    transfers={transfers}
                                />
                            )}
                        </div>
                        {rows.length === 0 ? null : (
                            <footer className="text-app-label flex min-h-12 flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-2">
                                <span className="text-muted-foreground font-mono tabular-nums">
                                    {words.footer.range({
                                        first: count(page.first + 1),
                                        last: count(page.last),
                                        total: count(rows.length),
                                    })}
                                </span>
                                {page.pages > 1 ? (
                                    <span className="flex items-center gap-1">
                                        <IconButton
                                            disabled={page.page === 0}
                                            icon={ArrowLeft01Icon}
                                            label={words.footer.previous.value}
                                            onClick={() => goTo(page.page - 1)}
                                            size="sm"
                                            variant="ghost"
                                        />
                                        <IconButton
                                            disabled={page.page === page.pages - 1}
                                            icon={ArrowRight01Icon}
                                            label={words.footer.next.value}
                                            onClick={() => goTo(page.page + 1)}
                                            size="sm"
                                            variant="ghost"
                                        />
                                    </span>
                                ) : null}
                                <span className="ms-auto flex flex-wrap items-center gap-x-4 gap-y-1">
                                    {footerFigures()}
                                </span>
                            </footer>
                        )}
                    </section>
                </>
            )}
            {picked.length > 0 ? (
                <BulkBar
                    list={list}
                    onClear={clearPicked}
                    onDelete={() => {
                        deleteEntries(picked.map((row) => row.id));
                        clearPicked();
                    }}
                    picked={picked}
                />
            ) : null}
            <ViewDialogs
                dialog={dialog}
                entries={(each) => viewCounts.get(each.id) ?? 0}
                onClose={() => setDialog(null)}
                onDelete={(each) => {
                    setDialog(null);
                    void saved.remove(each.id);
                    if (view?.id === each.id) {
                        setSearch({ view: null });
                    }
                }}
                onRename={(each, name) => {
                    setDialog(null);
                    void saved.rename(each.id, name);
                }}
                onSave={(name, keepSort) => {
                    setDialog(null);
                    void saved
                        .save({
                            ...(keepSort && { layout: layout.layout }),
                            name,
                            params: viewParams({
                                ...search,
                                accounts: filters.accounts.join(",") || undefined,
                                category: filters.categories.join(",") || undefined,
                            }),
                            sort: keepSort ? (search.sort ?? null) : null,
                        })
                        .then((id) => setSearch({ view: id }));
                }}
                views={saved.views}
            />
            <ExportDialog
                onClose={() => setExporting(false)}
                onExport={(options) => exportCsv(rows, options)}
                open={exporting}
                summary={{
                    entries: rows.length,
                    filters: [
                        ...applied.map((chip) => chip.label),
                        ...(query.q.trim() === "" ? [] : [`"${query.q.trim()}"`]),
                    ],
                    net: cash(totals.in - totals.out, "always"),
                    view: `${view?.name ?? tabNames[query.tab]}, ${period.label}`,
                }}
            />
            <EntrySheet
                onClose={() => setSearch({ entry: null })}
                onDelete={(row) => {
                    setSearch({ entry: null });
                    deleteEntries([row.id]);
                }}
                onEditMerchant={setMerchantFor}
                onStep={step}
                revision={merchantSaves}
                row={selected}
            />
            <MerchantDialog
                entryId={merchantFor}
                onClose={() => setMerchantFor(null)}
                onSaved={() => setMerchantSaves((saves) => saves + 1)}
            />
        </main>
    );
}
