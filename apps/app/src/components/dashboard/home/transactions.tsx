import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Upload04Icon from "@hugeicons/core-free-icons/Upload04Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Table } from "panelui-web/table";
import { Tabs } from "panelui-web/tabs";
import { useId, useMemo, useState } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { FeeTile, MerchantTile, TransferTile } from "@/components/ledger/tiles";
import { openAccounts } from "@/lib/dashboard-series-ledger";
import { periodOf } from "@/lib/dashboard-series-period";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { CardFrame } from "./card-frame";
import { useCatalog, useImageUrls } from "./catalog";
import type { Catalog } from "./catalog";
import { useCategoryName, useDateFormat } from "./format";
import type { SetupState } from "./model";
import { figureOf, foldFees, viewRows } from "./rows";
import type { FoldedRow } from "./rows";
import { Cover, GhostRows, PhoneButton, QuietTable, TABLE_FADE } from "./setup";

const ROWS_SHOWN = 10;
const LONG_FEE = 8;
const TABS = ["all", "expenses", "incomeTab"] as const;
type Tab = (typeof TABS)[number];
const isTab = (value: unknown): value is Tab => TABS.some((tab) => tab === value);
const TYPE_OF = { expenses: "expenses", incomeTab: "income" } as const;

const ROW =
    "relative h-[51px] border-0 [--stripe:color-mix(in_oklab,var(--color-app-fill)_40%,var(--color-app-group))] [--tile-ring:var(--color-app-group)] even:bg-(--stripe) even:[--tile-ring:var(--stripe)] hover:bg-(--stripe) hover:[--tile-ring:var(--stripe)]";
const HEAD = "first:ps-3.5 last:pe-3.5";
const CELL = "h-[51px] overflow-hidden px-1.5 py-0 align-middle first:ps-3.5 last:pe-3.5 @sm:px-3";
const SIDE = `${CELL} hidden truncate @2xl:table-cell`;
const FIGURE = `${CELL} dash-figure whitespace-nowrap @max-sm:overflow-visible`;
const NAME = `${CELL} max-w-0 @2xl:max-w-none`;
const SIDE_HEAD = `${HEAD} hidden @2xl:table-cell`;
const SECOND_LINE = "dash-figure text-muted-foreground block text-xs leading-4";
const ARRIVAL_LINE =
    "dash-figure text-muted-foreground flex justify-end text-xs leading-4 @max-sm:w-0 @max-sm:min-w-full";

const imageKeys = (catalog: Catalog, rows: readonly FoldedRow[]) => [
    ...new Set(
        rows.flatMap((row) => {
            const key = "fromId" in row ? null : catalog.transaction(row.id)?.imageKey;
            return key ? [key] : [];
        })
    ),
];

export function Transactions({ quiet, setup }: { quiet: boolean; setup: SetupState | null }) {
    const { filters, ledger, photos: accountPhotos, setFilters } = useDashboard();
    const { add } = useIntlayer("dashboard");
    const { open } = useAccountFlows();
    const { setup: setupCopy, transactions: copy } = useIntlayer("dashboard-home");
    const { locale } = useLocale();
    const categoryName = useCategoryName();
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const [tab, setTab] = useState<Tab>("all");
    const every = useMemo(
        () =>
            foldFees(
                viewRows(
                    ledger,
                    { accounts: filters.accounts, categories: filters.categories, period: filters.period },
                    "newest"
                ).filter((row) => tab === "all" || ("income" in row && row.income === (tab === "incomeTab")))
            ),
        [filters.accounts, filters.categories, filters.period, ledger, tab]
    );
    const rows = useMemo(() => every.slice(0, ROWS_SHOWN), [every]);
    const headKeys = useMemo(() => imageKeys(catalog, rows), [catalog, rows]);
    const headPhotos = useImageUrls(headKeys);
    const tableId = useId();
    if (quiet) {
        const current = periodOf(filters.currentKey, ledger.firstDayOfMonth);
        const month = date.month(current.key);
        return (
            <CardFrame className="@4xl:col-span-2" title={copy.title}>
                <div className="dash-empty relative isolate min-h-[299px] justify-end pt-0 pb-7">
                    <QuietTable />
                    <b className="text-[15px] font-semibold">{copy.quietTitle}</b>
                    <p className="text-muted-foreground text-[13px]">
                        {copy.quietLine({ from: date.day(filters.period.from), to: date.day(filters.period.to) })}
                    </p>
                    {filters.period.key === filters.currentKey ? null : (
                        <Button className="mt-2.5" onClick={() => setFilters({ period: null })}>
                            {copy.backTo({ month: `${month.charAt(0).toLocaleUpperCase()}${month.slice(1)}` })}
                        </Button>
                    )}
                </div>
            </CardFrame>
        );
    }
    const active = setup?.step === "entry";
    const showAccount = Boolean(setup) || openAccounts(ledger.books).length > 1;
    const count = (value: number) => value.toLocaleString(locale);
    const accountName = (id: string) => ledger.accounts.get(id)?.name ?? "";
    const second = (row: FoldedRow, figure: ReturnType<typeof figureOf>) => {
        if (figure.arrived !== null && "fromId" in row) {
            const arrived = money(figure.arrived, row.arrivedCurrency);
            return (
                <span className={ARRIVAL_LINE}>
                    <span aria-hidden>→ {arrived}</span>
                    <span className="sr-only">{copy.arrived({ amount: arrived })}</span>
                </span>
            );
        }
        if (figure.fee === null) {
            return null;
        }
        const [charged, ...more] = row.fees;
        const chargedIn = charged && more.length === 0 ? catalog.transaction(charged.id)?.currency : null;
        const fee = charged && chargedIn ? money(charged.original, chargedIn) : money(figure.fee, ledger.currency);
        return (
            <span className={SECOND_LINE}>
                +{fee}
                <span className={fee.length > LONG_FEE ? "hidden @2xl:inline" : ""}> {copy.feeWord}</span>
            </span>
        );
    };
    return (
        <CardFrame
            action={
                <Tabs onValueChange={(value) => isTab(value) && setTab(value)} value={tab}>
                    <Tabs.List className="bg-background/40 gap-0 rounded-[9px] p-0.5 [&>[data-slot=tabs-indicator]]:rounded-[7px] [&>[data-slot=tabs-indicator]]:shadow-none">
                        {TABS.map((each) => (
                            <Tabs.Trigger
                                aria-controls={tableId}
                                id={`${tableId}-${each}`}
                                className="h-[26px] rounded-[7px] px-2.5 text-[13px] leading-5"
                                key={each}
                                value={each}
                            >
                                {copy[each]}
                            </Tabs.Trigger>
                        ))}
                    </Tabs.List>
                </Tabs>
            }
            className={`@4xl:col-span-2 ${setup ? "min-h-[375px] @4xl:h-[375px]" : ""} ${active ? "ring-primary/55 ring-1" : ""}`}
            footer={
                setup || every.length === 0 ? undefined : (
                    <>
                        <span className="text-muted-foreground text-[13px] leading-5">{copy.entries}</span>
                        <span className="dash-figure font-medium">
                            {every.length <= ROWS_SHOWN
                                ? count(every.length)
                                : copy.shownOf({ shown: count(ROWS_SHOWN), total: count(every.length) })}
                        </span>
                        <Button
                            className="ml-auto"
                            nativeButton={false}
                            render={
                                <Link
                                    search={(prev) => (tab === "all" ? prev : { ...prev, type: TYPE_OF[tab] })}
                                    to="/transactions"
                                />
                            }
                            size="sm"
                            variant="outline"
                        >
                            {copy.seeAll}
                        </Button>
                    </>
                )
            }
            headerClassName="sm:min-h-11 sm:group-data-[variant=band]/frame:py-0 sm:group-data-[variant=band]/frame:pe-1.5"
            panelClassName="@container min-h-0 overflow-clip [overflow-anchor:none]"
            stackAction
            title={copy.title}
        >
            <div aria-labelledby={`${tableId}-${tab}`} id={tableId} role="tabpanel">
                <Table
                    aria-label={copy.title.value}
                    aria-rowcount={setup ? undefined : Math.max(rows.length, 1) + 1}
                    className="@2xl:table-fixed"
                    containerClassName="overflow-clip"
                    maxHeight="none"
                    striped={Boolean(setup)}
                >
                    <Table.Header className="in-data-[sticky]:bg-card">
                        <Table.Row aria-rowindex={1} className="border-0">
                            <Table.Head className={`${HEAD} w-full ${showAccount ? "@2xl:w-[33%]" : "@2xl:w-[50%]"}`}>
                                {copy.columns.merchant}
                            </Table.Head>
                            <Table.Head className={`${SIDE_HEAD} w-[19%]`}>{copy.columns.category}</Table.Head>
                            {showAccount ? (
                                <Table.Head className={`${SIDE_HEAD} w-[17%]`}>{copy.columns.account}</Table.Head>
                            ) : null}
                            <Table.Head className={`${SIDE_HEAD} w-[10%]`}>{copy.columns.date}</Table.Head>
                            <Table.Head align="end" className={`${HEAD} w-px @2xl:w-[21%]`}>
                                {copy.columns.amount}
                            </Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {rows.length === 0 && !setup ? (
                            <Table.Row aria-rowindex={2} className="border-0">
                                <Table.Cell
                                    className="text-muted-foreground py-8 text-[13px] first:ps-3.5"
                                    colSpan={showAccount ? 5 : 4}
                                >
                                    {copy.empty}
                                </Table.Cell>
                            </Table.Row>
                        ) : null}
                        {rows.map((row, index) => {
                            const figure = figureOf(ledger, row);
                            const line = second(row, figure);
                            const day = date.day(row.day);
                            if ("fromId" in row) {
                                const names = `${accountName(row.fromId)} → ${accountName(row.toId)}`;
                                return (
                                    <Table.Row aria-rowindex={index + 2} className={ROW} key={row.id}>
                                        <Table.Cell className={NAME}>
                                            <span className="flex items-center gap-3 font-medium">
                                                <TransferTile
                                                    from={catalog.account(row.fromId)}
                                                    photos={accountPhotos}
                                                    to={catalog.account(row.toId)}
                                                />
                                                <span className="min-w-0">
                                                    <Link
                                                        className="block truncate outline-none after:absolute after:inset-0 focus-visible:underline"
                                                        search={(prev) => ({
                                                            ...prev,
                                                            entry: row.id,
                                                            type: tab === "all" ? undefined : TYPE_OF[tab],
                                                        })}
                                                        to="/transactions"
                                                    >
                                                        {names}
                                                    </Link>
                                                    <span className="text-muted-foreground block truncate text-xs font-normal @2xl:hidden">
                                                        {day}
                                                        <span className="hidden @sm:inline"> · {copy.transfer}</span>
                                                    </span>
                                                </span>
                                            </span>
                                        </Table.Cell>
                                        <Table.Cell className={`${SIDE} text-muted-foreground`}>
                                            {copy.transfer}
                                        </Table.Cell>
                                        {showAccount ? (
                                            <Table.Cell aria-label={copy.columns.account.value} className={SIDE} />
                                        ) : null}
                                        <Table.Cell className={`${SIDE} dash-figure text-muted-foreground`}>
                                            {day}
                                        </Table.Cell>
                                        <Table.Cell align="end" className={`${FIGURE} text-muted-foreground`}>
                                            {money(figure.amount, ledger.currency)}
                                            {line}
                                        </Table.Cell>
                                    </Table.Row>
                                );
                            }
                            const top = ledger.categories.get(row.topId);
                            const name = top ? categoryName(top) : "";
                            const merchant = row.note.trim() || name;
                            const imageKey = catalog.transaction(row.id)?.imageKey;
                            const standsAlone = row.feeFor !== null;
                            const feeKind = catalog.transaction(row.id)?.feeForId ? copy.cardFee : copy.transferFee;
                            return (
                                <Table.Row aria-rowindex={index + 2} className={ROW} key={row.id}>
                                    <Table.Cell className={NAME}>
                                        <span className="flex items-center gap-3 font-medium">
                                            {standsAlone ? (
                                                <FeeTile />
                                            ) : (
                                                <MerchantTile
                                                    imageUrl={imageKey ? headPhotos?.get(imageKey) : undefined}
                                                    name={merchant}
                                                    size="lg"
                                                />
                                            )}
                                            <span className="min-w-0">
                                                <Link
                                                    className="block truncate outline-none after:absolute after:inset-0 focus-visible:underline"
                                                    search={(prev) => ({
                                                        ...prev,
                                                        entry: row.id,
                                                        type: tab === "all" ? undefined : TYPE_OF[tab],
                                                    })}
                                                    to="/transactions"
                                                >
                                                    {merchant}
                                                </Link>
                                                <span className="text-muted-foreground block truncate text-xs font-normal @2xl:hidden">
                                                    {day}
                                                    <span className="hidden @sm:inline">
                                                        {" "}
                                                        · {standsAlone ? feeKind : name}
                                                    </span>
                                                </span>
                                            </span>
                                        </span>
                                    </Table.Cell>
                                    <Table.Cell className={SIDE}>
                                        {standsAlone ? (
                                            <span className="text-muted-foreground">{feeKind}</span>
                                        ) : (
                                            <span className="flex min-w-0 items-center gap-[7px]">
                                                <span
                                                    aria-hidden
                                                    className="size-1.5 shrink-0 rounded-full bg-current"
                                                    style={{ color: top?.color }}
                                                />
                                                <span className="truncate">{name}</span>
                                            </span>
                                        )}
                                    </Table.Cell>
                                    {showAccount ? (
                                        <Table.Cell className={`${SIDE} text-muted-foreground`}>
                                            {row.accountId ? accountName(row.accountId) : copy.noAccount}
                                        </Table.Cell>
                                    ) : null}
                                    <Table.Cell className={`${SIDE} dash-figure text-muted-foreground`}>
                                        {day}
                                    </Table.Cell>
                                    <Table.Cell
                                        align="end"
                                        className={`${FIGURE} ${row.income ? "text-app-income" : ""}`}
                                    >
                                        {money(row.income ? figure.amount : -figure.amount, ledger.currency, "always")}
                                        {line}
                                    </Table.Cell>
                                </Table.Row>
                            );
                        })}
                        {setup ? <GhostRows cell={CELL} label={copy.title.value} side={SIDE} /> : null}
                    </Table.Body>
                </Table>
            </div>
            {setup && rows.length > 0 ? <Cover fade={TABLE_FADE} /> : null}
            {setup?.done.entry === false ? (
                <Cover line={active ? setupCopy.entryLast : setupCopy.entryLine} title={setupCopy.entryTitle}>
                    <Button
                        onClick={() => open({ kind: "entry" })}
                        size={active ? "md" : "sm"}
                        variant={active ? "default" : "outline"}
                    >
                        <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                        {add.entry}
                    </Button>
                    <PhoneButton size="sm" variant="outline">
                        <HugeiconsIcon icon={Upload04Icon} strokeWidth={2} />
                        {setupCopy.import}
                    </PhoneButton>
                </Cover>
            ) : null}
        </CardFrame>
    );
}
