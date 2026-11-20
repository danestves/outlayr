import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import AlertCircleIcon from "@hugeicons/core-free-icons/AlertCircleIcon";
import Archive02Icon from "@hugeicons/core-free-icons/Archive02Icon";
import ArrowDataTransferHorizontalIcon from "@hugeicons/core-free-icons/ArrowDataTransferHorizontalIcon";
import ArrowDownLeft01Icon from "@hugeicons/core-free-icons/ArrowDownLeft01Icon";
import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import BalanceScaleIcon from "@hugeicons/core-free-icons/BalanceScaleIcon";
import BankIcon from "@hugeicons/core-free-icons/BankIcon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import CalendarCheckIn01Icon from "@hugeicons/core-free-icons/CalendarCheckIn01Icon";
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon";
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon";
import CreditCardIcon from "@hugeicons/core-free-icons/CreditCardIcon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import Exchange01Icon from "@hugeicons/core-free-icons/Exchange01Icon";
import Flag01Icon from "@hugeicons/core-free-icons/Flag01Icon";
import ImageAdd01Icon from "@hugeicons/core-free-icons/ImageAdd01Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import Note01Icon from "@hugeicons/core-free-icons/Note01Icon";
import PencilEdit01Icon from "@hugeicons/core-free-icons/PencilEdit01Icon";
import SafeIcon from "@hugeicons/core-free-icons/SafeIcon";
import Tag01Icon from "@hugeicons/core-free-icons/Tag01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import TransactionHistoryIcon from "@hugeicons/core-free-icons/TransactionHistoryIcon";
import Upload04Icon from "@hugeicons/core-free-icons/Upload04Icon";
import { entryLook } from "@outlayr/money/ledger-log";
import { Link } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Chip } from "panelui-web/chip";
import { Frame } from "panelui-web/frame";
import { Menu } from "panelui-web/menu";
import { Table } from "panelui-web/table";
import { Toast } from "panelui-web/toast";
import { Fragment, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { Empty } from "@/components/dashboard/home/empty";
import { timeOfDay, titled, useDateFormat, useMonthYear, useWholeMoney } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { EntrySheet, editableDoc } from "@/components/dashboard/transactions/entry-sheet";
import type { EntryStart } from "@/components/dashboard/transactions/entry-sheet";
import { rowOf } from "@/components/dashboard/transactions/model";
import { deleteToasts, useDeleteEntries } from "@/components/dashboard/transactions/use-delete";
import { AccountTile, LookTile, MerchantTile } from "@/components/ledger/tiles";
import { MenuContent } from "@/components/ui/menu-content";
import { openAccounts } from "@/lib/dashboard-series-ledger";
import { addDays } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { viewTransition } from "@/lib/motion";
import { photoSrc } from "@/lib/photo-src";

import {
    AccountsBar,
    Card,
    Cell,
    DataTable,
    ICON_TILE,
    INCOME,
    MUTED,
    PERCENT,
    SPEND,
    UpcomingCard,
    rateText,
} from "./accounts-screen";
import { useAccountFlows } from "./flows";
import { Glyph } from "./glyph";
import {
    accountEntries,
    monthsBetween,
    plansOn,
    accountRows,
    accountSeries,
    checkedAge,
    flowsOf,
    inMain,
    isCard,
    monthStart,
    onlyCounterpart,
    periodFlows,
    rangeDays,
    ratesFor,
    spentByCategory,
    statementOf,
} from "./model";
import type { AccountEntry, AccountRow, WorthRange } from "./model";
import { KpiBand, KpiCell, Meter, PhoneAction, PhoneItem, Segments, Trend, useCheckedText } from "./parts";
import { WorthChart } from "./worth-chart";

const DETAIL_CHART = 778 / 172;
const FOREIGN_CHART = 778 / 256;
const IN_MAIN = "var(--color-app-info)";
const FIELD = "text-app-label flex h-9 items-center justify-between gap-3 border-b last:border-0";

const monthBack = (key: string, back: number) => {
    const [year, month] = key.split("-").map(Number);
    return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1 - back, 15)).toISOString().slice(0, 7);
};

const lastDayOf = (key: string) => {
    const [year, month] = key.split("-").map(Number);
    return new Date(Date.UTC(year ?? 0, month ?? 1, 0)).toISOString().slice(0, 10);
};

function useMonthName() {
    const date = useDateFormat();
    const { locale } = useLocale();
    return (key: string) => titled(date.month(key), locale);
}

function DetailBar({ row }: { row: AccountRow }) {
    const { ledger } = useDashboard();
    const { actions, detail, flows } = useIntlayer("dashboard-accounts");
    const { open } = useAccountFlows();
    const card = isCard(row);
    return (
        <AccountsBar
            title={
                <span className="flex min-w-0 items-center gap-2">
                    <Button
                        aria-label={detail.back.value}
                        className="mr-1"
                        nativeButton={false}
                        render={<Link to="/accounts" viewTransition={viewTransition("push-left", { back: true })} />}
                        size="icon"
                        variant="outline"
                    >
                        <Glyph icon={ArrowLeft02Icon} className="text-muted-foreground" />
                    </Button>
                    <AccountTile account={row.look} size="logo" />
                    <span className="truncate">{row.name}</span>
                    {row.currency === ledger.currency ? null : (
                        <Badge className="ml-1 shrink-0 font-mono tabular-nums" variant="outline">
                            {row.currency}
                        </Badge>
                    )}
                </span>
            }
        >
            <Button
                className="max-sm:hidden"
                onClick={() => open({ accountId: row.id, kind: "transfer" })}
                variant="outline"
            >
                <Glyph icon={ArrowDataTransferHorizontalIcon} className="text-muted-foreground" size={16} />
                {card ? detail.payCard : actions.transfer}
            </Button>
            <Button
                className="max-sm:hidden"
                onClick={() => open({ accountId: row.id, kind: "edit" })}
                variant="outline"
            >
                <Glyph icon={PencilEdit01Icon} className="text-muted-foreground" size={16} />
                {actions.edit}
            </Button>
            <Menu>
                <Menu.Trigger
                    aria-label={actions.more({ name: row.name }).value}
                    render={<Button size="icon" variant="outline" />}
                >
                    <Glyph icon={MoreVerticalIcon} className="text-muted-foreground" />
                </Menu.Trigger>
                <MenuContent align="end" className={card ? "w-58" : "w-50"} sideOffset={4}>
                    <Menu.Item className="sm:hidden" onClick={() => open({ accountId: row.id, kind: "edit" })}>
                        <Glyph icon={PencilEdit01Icon} size={16} />
                        {actions.edit}
                    </Menu.Item>
                    {card ? (
                        <>
                            <Menu.Item onClick={() => open({ accountId: row.id, kind: "purchase" })}>
                                <Glyph icon={CalendarCheckIn01Icon} size={16} />
                                {actions.newPurchase}
                            </Menu.Item>
                            <Menu.Item onClick={() => open({ accountId: row.id, kind: "scan" })}>
                                <Glyph icon={ImageAdd01Icon} size={16} />
                                {actions.importScreenshot}
                            </Menu.Item>
                            <PhoneItem>
                                <Glyph icon={Flag01Icon} size={16} />
                                {actions.payOffBy}
                            </PhoneItem>
                        </>
                    ) : (
                        <Menu.Item onClick={() => open({ accountId: row.id, kind: "check" })}>
                            <Glyph icon={CheckmarkCircle02Icon} size={16} />
                            {actions.check}
                        </Menu.Item>
                    )}
                    <Menu.Separator />
                    <Menu.Item onClick={() => open({ accountId: row.id, kind: "archive" })}>
                        <Glyph icon={Archive02Icon} size={16} />
                        {flows.archive}
                    </Menu.Item>
                    <Menu.Item variant="destructive" onClick={() => open({ accountId: row.id, kind: "delete" })}>
                        <Glyph icon={Delete02Icon} size={16} />
                        {actions.delete}
                    </Menu.Item>
                </MenuContent>
            </Menu>
            <Button onClick={() => open({ accountId: row.id, kind: "entry" })}>
                <Glyph icon={Add01Icon} size={16} />
                {detail.addEntry}
            </Button>
        </AccountsBar>
    );
}

const note = (children: ReactNode, tone = "text-muted-foreground") => (
    <span className={`${tone} text-app-label min-w-0 truncate`}>{children}</span>
);

function BankKpis({ row }: { row: AccountRow }) {
    const { ledger } = useDashboard();
    const { columns, detail } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const monthYear = useMonthYear();
    const from = monthStart(ledger.today);
    const empty = flowsOf(ledger, row.id).length === 0;
    // A new account reads as a plain band until it has history.
    const icon = <T,>(glyph: T) => (empty ? undefined : glyph);
    const [rate] = ratesFor(ledger, [row.currency]);
    const period = date.month(ledger.today.slice(0, 7));
    const flows = periodFlows(flowsOf(ledger, row.id), from, ledger.today, row.currency);
    const inMonth = accountEntries(ledger, row.id, from, ledger.today);
    const corrections = inMonth.filter((entry) => entry.adjustment);
    const adjusted = corrections.reduce((sum, entry) => sum + entry.value, 0);
    const transfers = flows.transfers - corrections.length;
    const other = onlyCounterpart(inMonth.filter((entry) => !entry.adjustment));
    const lastCorrected = corrections[0]?.day ?? ledger.today;
    const adjustedDay = lastCorrected === ledger.today ? detail.today : date.day(lastCorrected);
    const otherName = other ? (ledger.accounts.get(other.id)?.name ?? "") : "";
    const entries = (count: number) => {
        if (count === 0) {
            return detail.noEntries({ period });
        }
        if (rate) {
            return count === 1 ? detail.entryCount : detail.entriesCount({ count });
        }
        return count === 1 ? detail.entryIn({ period }) : detail.entriesIn({ count, period });
    };
    let moved: ReactNode = detail.transfersIn({ count: transfers, period });
    if (transfers === 0) {
        moved = detail.noTransfers;
    } else if (transfers === 1) {
        if (other) {
            moved = other.outbound ? detail.transferTo({ name: otherName }) : detail.transferFrom({ name: otherName });
        } else {
            moved = detail.oneTransferIn({ period });
        }
    }
    const main = inMain(ledger, row.balance, row.currency);
    return (
        <KpiBand>
            <KpiCell
                color={MUTED}
                icon={icon(rate ? BankIcon : SafeIcon)}
                label={detail.balance}
                value={money(row.balance, row.currency)}
            >
                {note(
                    detail.startedAt({
                        amount: money(row.initialBalance, row.currency),
                        date: monthYear(row.openedDay),
                    })
                )}
            </KpiCell>
            {rate ? (
                <KpiCell
                    color={IN_MAIN}
                    icon={icon(Exchange01Icon)}
                    label={columns.inMain({ currency: ledger.currency })}
                    value={`${main.exact ? "" : "~"}${money(main.value, ledger.currency)}`}
                >
                    {note(detail.atRate({ date: date.day(ledger.today), rate: rateText(rate.rate) }))}
                </KpiCell>
            ) : null}
            <KpiCell
                color={INCOME}
                icon={icon(ArrowDownLeft01Icon)}
                label={rate ? detail.flowIn : detail.cameIn}
                value={money(flows.cameIn, row.currency)}
            >
                {note(entries(flows.entriesIn))}
            </KpiCell>
            <KpiCell
                color={SPEND}
                icon={icon(ArrowUpRight01Icon)}
                label={rate ? detail.flowOut : detail.wentOut}
                value={money(flows.wentOut, row.currency)}
            >
                {note(entries(flows.entriesOut))}
            </KpiCell>
            {rate ? null : (
                <KpiCell
                    color={transfers === 0 && adjusted !== 0 ? "var(--color-app-warn)" : MUTED}
                    icon={icon(transfers === 0 && adjusted !== 0 ? BalanceScaleIcon : ArrowDataTransferHorizontalIcon)}
                    label={transfers === 0 && adjusted !== 0 ? detail.adjusted : detail.moved}
                    value={money(transfers === 0 ? adjusted : flows.moved - adjusted, row.currency)}
                >
                    {note(transfers === 0 && adjusted !== 0 ? adjustedDay : moved)}
                </KpiCell>
            )}
        </KpiBand>
    );
}

function CardKpis({ row }: { row: AccountRow }) {
    const { ledger } = useDashboard();
    const { detail } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const { whole } = useWholeMoney(row.currency);
    const date = useDateFormat();
    const statement = statementOf(ledger, row);
    const limit = row.creditLimit ?? 0;
    const available = Math.max(0, limit + row.balance);
    const used = limit > 0 ? Math.min(1, Math.max(0, -row.balance / limit)) : 0;
    const overdue = statement?.overdue === true;
    let statementLine: ReactNode = null;
    if (statement) {
        statementLine = overdue
            ? detail.overdueSince({ date: date.day(statement.cycle.dueOn) })
            : detail.dueClosed({ closed: date.day(statement.cycle.closedOn), due: date.day(statement.cycle.dueOn) });
    }
    return (
        <KpiBand>
            <KpiCell
                color={MUTED}
                icon={CreditCardIcon}
                label={detail.balance}
                value={money(row.balance, row.currency)}
            >
                {note(detail.owedLine)}
            </KpiCell>
            <KpiCell
                color={overdue ? SPEND : "var(--color-app-warn)"}
                icon={overdue ? AlertCircleIcon : Note01Icon}
                label={detail.statement}
                tone={overdue ? "text-app-spend" : ""}
                value={statement?.due === null || !statement ? "–" : money(statement.due, row.currency)}
            >
                {statement ? note(statementLine, overdue ? "text-app-spend" : undefined) : note(detail.noStatement)}
            </KpiCell>
            <KpiCell
                color={SPEND}
                icon={ArrowUpRight01Icon}
                label={detail.since}
                value={statement ? money(statement.since, row.currency) : "–"}
            >
                {statement ? note(detail.nextClose({ date: date.day(statement.cycle.nextCloseOn) })) : null}
            </KpiCell>
            <KpiCell
                color={INCOME}
                icon={SafeIcon}
                label={detail.available}
                value={limit > 0 ? money(available, row.currency) : "–"}
            >
                {limit > 0 ? (
                    <>
                        <Meter className="min-w-10 flex-1" max={1} value={used} />
                        <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                            {detail.ofLimit({ limit: whole(limit), percent: Math.round(used * PERCENT) })}
                        </span>
                    </>
                ) : null}
            </KpiCell>
        </KpiBand>
    );
}

function HistoryCard({ row }: { row: AccountRow }) {
    const { ledger } = useDashboard();
    const { detail, range: copy } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const [range, setRange] = useState<WorthRange>("month");
    const owes = row.kind !== "asset";
    // A debt reads as what is owed, so the line climbs when it grows.
    const data = useMemo(() => {
        const days = rangeDays(ledger, range);
        const [first = ledger.today] = days;
        const [opening, ...closes] = accountSeries(ledger, row.id, [addDays(first, -1), ...days]);
        return [...(opening ? [{ ...opening, day: first }] : []), ...closes].map((point) => ({
            ...point,
            value: owes ? -point.value : point.value,
        }));
    }, [ledger, owes, range, row.id]);
    const change = (data.at(-1)?.value ?? 0) - (data[0]?.value ?? 0);
    const amount = money(change, row.currency, "always");
    return (
        <Card
            action={
                <Segments
                    onPick={setRange}
                    options={[
                        { label: copy.month, value: "month" },
                        { label: copy.quarter, value: "quarter" },
                        { label: copy.year, value: "year" },
                        { label: copy.all, value: "all" },
                    ]}
                    value={range}
                />
            }
            stackAction
            title={
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    {detail.history}
                    <Trend className="[&_svg]:hidden" goodWhenUp={!owes} value={change}>
                        {owes ? detail.owed({ amount }).value : amount}
                    </Trend>
                </span>
            }
        >
            <div className="p-4 pb-3.5" data-motion="dissolve" key={range}>
                <WorthChart
                    aspectRatio={row.currency === ledger.currency ? DETAIL_CHART : FOREIGN_CHART}
                    currency={row.currency}
                    data={data}
                    label={detail.history.value}
                    range={range}
                />
            </div>
        </Card>
    );
}

function EntryTile({ entry, imageUrl }: { entry: AccountEntry; imageUrl?: string }) {
    const { ledger } = useDashboard();
    if (entry.kind !== "entry") {
        return (
            <span className={ICON_TILE}>
                <Glyph icon={entry.adjustment ? BalanceScaleIcon : ArrowDataTransferHorizontalIcon} size={14} />
            </span>
        );
    }
    const source = ledger.books.transactions.find((row) => row.localId === entry.rowId);
    const category = ledger.books.categories.find((row) => row.localId === source?.categoryId);
    const look = source ? entryLook(source, category) : null;
    if (imageUrl || !(look?.icon || look?.emoji)) {
        return <MerchantTile imageUrl={imageUrl} name={entry.title || "?"} size="lg" />;
    }
    return <LookTile look={look} plain size="lg" />;
}

function EntryMenu({
    entry,
    name,
    onDelete,
    onOpen,
}: {
    entry: AccountEntry;
    name: string;
    onDelete: () => void;
    onOpen: (start?: EntryStart) => void;
}) {
    const { actions } = useIntlayer("dashboard-accounts");
    return (
        <Menu>
            <Menu.Trigger
                aria-label={actions.more({ name }).value}
                render={<Button className="text-muted-foreground -mx-2 -my-1" size="icon-sm" variant="ghost" />}
            >
                <Glyph icon={MoreVerticalIcon} size={17} />
            </Menu.Trigger>
            <MenuContent align="center" className="w-55" side="left" sideOffset={-6}>
                <EntryActions entry={entry} onDelete={onDelete} onOpen={onOpen} />
            </MenuContent>
        </Menu>
    );
}

function ChipMenu({
    children,
    icon,
    label,
    on,
}: {
    children: ReactNode;
    icon: ReactNode;
    label: ReactNode;
    on: boolean;
}) {
    return (
        <Menu>
            <Menu.Trigger render={<Chip className="gap-1.5" pressed={on} size="lg" />}>
                {icon}
                {label}
            </Menu.Trigger>
            <MenuContent className="max-h-80 w-50 overflow-y-auto" sideOffset={6}>
                {children}
            </MenuContent>
        </Menu>
    );
}

const check = (on: boolean) => (
    <Glyph icon={Tick02Icon} className={`text-app-tint! ml-auto ${on ? "" : "invisible"}`} size={16} />
);

function ActionItem({ children, live, onPress }: { children: ReactNode; live: boolean; onPress: () => void }) {
    return live ? <Menu.Item onClick={onPress}>{children}</Menu.Item> : <PhoneItem>{children}</PhoneItem>;
}

function EntryActions({
    entry,
    onDelete,
    onOpen,
}: {
    entry: AccountEntry;
    onDelete: () => void;
    onOpen: (start?: EntryStart) => void;
}) {
    const { ledger } = useDashboard();
    const { actions } = useIntlayer("dashboard-accounts");
    const row = rowOf(ledger, entry.rowId);
    const isEntry = row !== null && !("fromId" in row);
    const editable = isEntry && editableDoc(ledger, row) !== undefined;
    return (
        <>
            <ActionItem live={!entry.outside} onPress={() => onOpen()}>
                <Glyph icon={ArrowUpRight01Icon} size={16} />
                {actions.open}
            </ActionItem>
            <ActionItem live={editable} onPress={() => onOpen("edit")}>
                <Glyph icon={PencilEdit01Icon} size={16} />
                {actions.edit}
            </ActionItem>
            {isEntry || entry.outside ? (
                <ActionItem live={editable} onPress={() => onOpen("category")}>
                    <Glyph icon={Tag01Icon} size={16} />
                    {actions.changeCategory}
                </ActionItem>
            ) : null}
            {(isEntry || entry.outside) && openAccounts(ledger.books).length > 1 ? (
                <ActionItem live={editable} onPress={() => onOpen("account")}>
                    <Glyph icon={BankIcon} size={16} />
                    {actions.moveToAccount}
                </ActionItem>
            ) : null}
            <Menu.Separator />
            {entry.outside ? (
                <PhoneItem>
                    <Glyph icon={Delete02Icon} size={16} />
                    {actions.delete}
                </PhoneItem>
            ) : (
                <Menu.Item onClick={onDelete} variant="destructive">
                    <Glyph icon={Delete02Icon} size={16} />
                    {actions.delete}
                </Menu.Item>
            )}
        </>
    );
}

function TransactionsCard({ row }: { row: AccountRow }) {
    const { ledger } = useDashboard();
    const { actions, columns, detail, list } = useIntlayer("dashboard-accounts");
    const { clockTime, money } = useDisplayFormat();
    const date = useDateFormat();
    const monthName = useMonthName();
    const current = ledger.today.slice(0, 7);
    const foreign = row.currency !== ledger.currency;
    const [month, setMonth] = useState(current);
    const [category, setCategory] = useState<string | null>(null);
    const months = useMemo(
        () =>
            Array.from({ length: monthsBetween(row.openedDay, ledger.today) + 1 }, (_, index) =>
                monthBack(current, index)
            ),
        [current, ledger.today, row.openedDay]
    );
    const entries = useMemo(
        () => accountEntries(ledger, row.id, `${month}-01`, lastDayOf(month)),
        [ledger, month, row.id]
    );
    const categories = [...new Set(entries.flatMap((entry) => (entry.categoryId ? [entry.categoryId] : [])))].flatMap(
        (id) => {
            const found = ledger.categories.get(id);
            return found ? [found] : [];
        }
    );
    const shown = category ? entries.filter((entry) => entry.categoryId === category) : entries;
    const chosen = category ? ledger.categories.get(category) : undefined;
    const deleteEntries = useDeleteEntries();
    const [opened, setOpened] = useState<{ id: string; start?: EntryStart } | null>(null);
    const openedRow = useMemo(() => (opened ? rowOf(ledger, opened.id) : null), [ledger, opened]);
    const remove = (id: string) => {
        setOpened(null);
        deleteEntries([id]);
    };
    const step = (by: 1 | -1) => {
        const stops = shown.filter((entry) => !entry.outside);
        const at = stops.findIndex((entry) => entry.rowId === opened?.id);
        const next = stops[at === -1 ? 0 : at + by];
        if (next) {
            setOpened({ id: next.rowId });
        }
    };
    return (
        <Card
            action={
                <span className="-mr-1 flex flex-wrap items-center gap-3">
                    <ChipMenu
                        icon={<Glyph icon={Calendar03Icon} className="text-muted-foreground" size={14} />}
                        label={monthName(month)}
                        on={false}
                    >
                        {months.map((key) => (
                            <Menu.Item
                                key={key}
                                onClick={() => {
                                    setMonth(key);
                                    setCategory(null);
                                }}
                            >
                                {monthName(key)}
                                {key.slice(0, 4) === current.slice(0, 4) ? null : (
                                    <span className="text-muted-foreground">{key.slice(0, 4)}</span>
                                )}
                                {check(key === month)}
                            </Menu.Item>
                        ))}
                    </ChipMenu>
                    <ChipMenu
                        icon={<Glyph icon={Tag01Icon} className={chosen ? "" : "text-muted-foreground"} size={14} />}
                        label={chosen?.name ?? detail.category}
                        on={chosen !== undefined}
                    >
                        <Menu.Item onClick={() => setCategory(null)}>
                            {detail.category}
                            {check(category === null)}
                        </Menu.Item>
                        <Menu.Separator />
                        {categories.map((each) => (
                            <Menu.Item key={each.id} onClick={() => setCategory(each.id)}>
                                <i className="size-1.5 shrink-0 rounded-full" style={{ background: each.color }} />
                                {each.name}
                                {check(category === each.id)}
                            </Menu.Item>
                        ))}
                    </ChipMenu>
                    <Button
                        className="gap-1.5"
                        nativeButton={false}
                        render={<Link search={{ accounts: row.id, span: "all" }} to="/transactions" />}
                        size="sm"
                        variant="outline"
                    >
                        {actions.seeAll}
                        <Glyph icon={ArrowUpRight01Icon} className="text-muted-foreground" size={16} />
                    </Button>
                </span>
            }
            className="flex-1"
            count={shown.length}
            stackAction
            title={detail.transactions}
        >
            {shown.length === 0 ? (
                <p className="text-muted-foreground text-app-label px-5 py-8 text-center">
                    {detail.nothingIn({ period: date.month(month) })}
                </p>
            ) : (
                <DataTable
                    head={[
                        detail.merchant,
                        detail.category,
                        detail.date,
                        detail.amount,
                        ...(foreign ? [columns.inMain({ currency: ledger.currency })] : []),
                        "",
                    ]}
                    numbers={foreign ? 2 : 1}
                    phoneHidden={foreign ? [2, 5] : [2]}
                >
                    {shown.map((entry) => {
                        const found = entry.categoryId ? ledger.categories.get(entry.categoryId) : undefined;
                        const otherName = entry.other ? (ledger.accounts.get(entry.other)?.name ?? "") : "";
                        let title: ReactNode = entry.title;
                        if (entry.adjustment) {
                            title = detail.adjustmentRow;
                        } else if (entry.kind === "outbound") {
                            title = list.transferTo({ name: otherName });
                        } else if (entry.kind === "inbound") {
                            title = entry.other ? detail.fromName({ name: otherName }) : detail.transfer;
                        }
                        const income = entry.kind === "entry" && entry.value > 0;
                        const checkedHere =
                            entry.adjustment && entry.at === row.checkedAt && entry.day === ledger.today;
                        return (
                            <Fragment key={entry.id}>
                                {checkedHere ? (
                                    <Table.Row>
                                        <Table.Cell
                                            className="text-muted-foreground text-app-caption! py-2! ps-3.5!"
                                            colSpan={foreign ? 6 : 5}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Glyph className="text-app-income" icon={Tick02Icon} size={12} />
                                                {detail.checkedBand({
                                                    amount: money(entry.value, row.currency),
                                                    time: clockTime(timeOfDay(entry.at, ledger.offsetAt(entry.at))),
                                                })}
                                            </span>
                                        </Table.Cell>
                                    </Table.Row>
                                ) : null}
                                <Table.Row className="has-data-popup-open:bg-muted/40">
                                    <Cell>
                                        <span className="flex min-w-0 items-center gap-2.5 text-sm font-medium">
                                            <EntryTile entry={entry} imageUrl={photoSrc(entry.imageKey)} />
                                            <span className="max-w-30 truncate sm:max-w-65">{title}</span>
                                        </span>
                                    </Cell>
                                    <Cell>
                                        {found ? (
                                            <Badge className={income ? "text-muted-foreground" : ""} variant="outline">
                                                {income ? null : (
                                                    <i
                                                        className="size-1.5 rounded-full"
                                                        style={{ background: found.color }}
                                                    />
                                                )}
                                                {found.name}
                                            </Badge>
                                        ) : (
                                            <Badge className="text-muted-foreground" variant="outline">
                                                {entry.adjustment && detail.adjustmentChip}
                                                {!entry.adjustment &&
                                                    (entry.kind === "entry" ? detail.category : detail.transfer)}
                                            </Badge>
                                        )}
                                    </Cell>
                                    <Cell className="text-muted-foreground font-mono tabular-nums">
                                        {date.day(entry.day)}
                                    </Cell>
                                    <Cell className={`font-normal ${entry.value > 0 ? "text-app-income" : ""}`} figure>
                                        {money(entry.value, row.currency, "always")}
                                    </Cell>
                                    {foreign ? (
                                        <Cell className="text-muted-foreground font-normal" figure>
                                            {money(
                                                entry.main ?? inMain(ledger, entry.value, row.currency).value,
                                                ledger.currency,
                                                "always"
                                            )}
                                        </Cell>
                                    ) : null}
                                    <Cell className="w-10">
                                        <EntryMenu
                                            entry={entry}
                                            name={entry.title || detail.transfer.value}
                                            onDelete={() => remove(entry.rowId)}
                                            onOpen={(start) => setOpened({ id: entry.rowId, start })}
                                        />
                                    </Cell>
                                </Table.Row>
                            </Fragment>
                        );
                    })}
                </DataTable>
            )}
            <EntrySheet
                onClose={() => setOpened(null)}
                onDelete={(entry) => remove(entry.id)}
                onStep={step}
                row={openedRow}
                start={opened?.start}
            />
        </Card>
    );
}

function EmptyEntries({ accountId }: { accountId: string }) {
    const { open } = useAccountFlows();
    const { detail } = useIntlayer("dashboard-accounts");
    return (
        <Card className="flex-1" title={detail.transactions}>
            <Empty
                action={
                    <>
                        <Button onClick={() => open({ accountId, kind: "entry" })}>
                            <Glyph icon={Add01Icon} size={16} />
                            {detail.addEntry}
                        </Button>
                        <PhoneAction size="sm">
                            <Glyph icon={Upload04Icon} className="text-muted-foreground" size={16} />
                            {detail.importEntries}
                        </PhoneAction>
                    </>
                }
                icon={TransactionHistoryIcon}
                line={detail.emptyBody}
                title={detail.emptyTitle}
            />
        </Card>
    );
}

function CheckCard({ row }: { row: AccountRow }) {
    const { ledger } = useDashboard();
    const { detail } = useIntlayer("dashboard-accounts");
    const { open } = useAccountFlows();
    const { clockTime } = useDisplayFormat();
    const checked = useCheckedText();
    const date = useDateFormat();
    const { locale } = useLocale();
    const age = checkedAge(row.checkedAt, ledger);
    const fresh = age.state === "today" || age.state === "yesterday" || age.state === "daysAgo";
    const stale = !fresh && age.state !== "never";
    let tone = "bg-app-tint/16 text-app-tint";
    if (fresh) {
        tone = "bg-app-income/14 text-app-income";
    } else if (age.state === "never") {
        tone = "bg-app-muted/16 text-app-muted";
    }
    let line: ReactNode = null;
    if (stale) {
        line = detail.compareBankApp;
    } else if (row.checkedAt !== null) {
        const offset = ledger.offsetAt(row.checkedAt);
        line =
            age.state === "today"
                ? detail.matchedAt({ time: clockTime(timeOfDay(row.checkedAt, offset)) })
                : detail.matchedOn({ date: date.day(new Date(row.checkedAt + offset).toISOString().slice(0, 10)) });
    }
    return (
        <Frame className="min-w-0" variant="plain">
            <Frame.Panel>
                <Frame.Row className="py-3.5 pr-3 pl-4">
                    <Frame.Media className={`rounded-app-md size-8 ${tone}`}>
                        <Glyph icon={stale ? Clock01Icon : Tick02Icon} size={17} />
                    </Frame.Media>
                    <Frame.Content className="gap-0">
                        <Frame.Title className={stale ? "text-app-tint!" : undefined}>
                            {age.state === "never" ? detail.checkTitle : titled(checked(age), locale)}
                        </Frame.Title>
                        {line ? <Frame.Description className="text-app-caption">{line}</Frame.Description> : null}
                    </Frame.Content>
                    <Frame.Actions>
                        <Button onClick={() => open({ accountId: row.id, kind: "check" })} size="sm" variant="outline">
                            {detail.check}
                        </Button>
                    </Frame.Actions>
                </Frame.Row>
            </Frame.Panel>
        </Frame>
    );
}

function InstallmentsCard({ row }: { row: AccountRow }) {
    const { ledger } = useDashboard();
    const { actions, list } = useIntlayer("dashboard-accounts");
    const { open } = useAccountFlows();
    const { money } = useDisplayFormat();
    const plans = plansOn(ledger, row.id).filter((plan) => plan.left > 0);
    return (
        <Card
            action={
                <Button onClick={() => open({ accountId: row.id, kind: "purchase" })} size="sm" variant="outline">
                    <Glyph icon={Add01Icon} className="text-muted-foreground" size={16} />
                    {actions.newPurchase}
                </Button>
            }
            title={list.installments}
        >
            {plans.length === 0 ? null : (
                <div className="flex flex-col gap-4 p-4">
                    {plans.map((plan) => {
                        const amount = money(plan.left, plan.currency);
                        const [before, after] = list.planLeft({ amount }).value.split(amount);
                        return (
                            <Link
                                className="hover:bg-muted/50 rounded-app-sm -m-2 block p-2 transition-colors"
                                key={plan.id}
                                params={{ planId: plan.id }}
                                to="/installments/$planId"
                            >
                                <div className="text-app-label flex items-baseline gap-2 font-medium">
                                    <span className="min-w-0 truncate">{plan.name || list.planFallback}</span>
                                    <span className="ml-auto font-mono whitespace-nowrap tabular-nums">
                                        <span className="text-muted-foreground font-normal">{before}</span>
                                        {amount}
                                        <span className="text-muted-foreground font-normal">{after}</span>
                                    </span>
                                </div>
                                <Meter className="mt-2" max={1} value={plan.fraction} />
                                <div className="text-muted-foreground text-app-caption mt-2 flex font-mono tabular-nums">
                                    {plan.count} x {money(plan.each, plan.currency)}
                                    <span className="ml-auto">{list.planPaid({ count: plan.paidCount })}</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}

function SpentCard({ row }: { row: AccountRow }) {
    const { ledger } = useDashboard();
    const { detail } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const { whole } = useWholeMoney(row.currency);
    const shares = spentByCategory(ledger, row.id, monthStart(ledger.today), ledger.today);
    if (shares.length === 0) {
        return null;
    }
    const total = shares.reduce((sum, share) => sum + share.value, 0);
    if (row.currency !== ledger.currency) {
        return (
            <Card aside={money(total, row.currency)} title={detail.spent}>
                <div className="px-4 pt-4 pb-1.5">
                    {shares.map((share) => (
                        <div className={FIELD} key={share.id}>
                            <span className="text-muted-foreground flex min-w-0 items-center gap-2">
                                <i className="size-2 shrink-0 rounded-xs" style={{ background: share.color }} />
                                <span className="truncate">{share.name}</span>
                            </span>
                            <span className="font-mono tabular-nums">{money(share.value, row.currency)}</span>
                        </div>
                    ))}
                </div>
            </Card>
        );
    }
    return (
        <Card aside={whole(total)} title={detail.spentFrom({ name: row.name })}>
            <div className="p-4">
                <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                    {shares.map((share) => (
                        <i
                            className="block h-full rounded-full"
                            key={share.id}
                            style={{ background: share.color, flex: `${share.value} 1 0` }}
                        />
                    ))}
                </div>
                <div className="mt-2">
                    {shares.map((share) => (
                        <div className={FIELD} key={share.id}>
                            <span className="flex min-w-0 items-center gap-2">
                                <i className="size-2 shrink-0 rounded-full" style={{ background: share.color }} />
                                <span className="truncate">{share.name}</span>
                            </span>
                            <span className="font-mono tabular-nums">
                                {whole(share.value)}
                                <span className="text-muted-foreground ml-1.5">
                                    {Math.round((share.value / total) * PERCENT)}%
                                </span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}

function DetailsCard({ row }: { row: AccountRow }) {
    const { ledger } = useDashboard();
    const { detail, flows } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const monthYear = useMonthYear();
    const average = useMemo(() => {
        const months = accountSeries(ledger, row.id, rangeDays(ledger, "year")).filter(
            (point) => point.day >= row.openedDay
        );
        return months.length === 0 ? null : months.reduce((sum, point) => sum + point.value, 0) / months.length;
    }, [ledger, row.id, row.openedDay]);
    const card = isCard(row);
    let type: ReactNode = detail.account;
    if (card) {
        type = detail.card;
    } else if (row.kind !== "asset") {
        type = detail.loan;
    } else if (row.look.icon === "Bank") {
        type = flows.bank;
    } else if (row.look.icon === "Wallet01") {
        type = flows.cash;
    }
    const count = flowsOf(ledger, row.id).length;
    const foreign = row.currency !== ledger.currency;
    const fields: [ReactNode, ReactNode, "words"?][] = [
        [detail.type, type, "words"],
        [detail.currency, row.currency],
    ];
    if (foreign) {
        fields.push([detail.mainCurrency, ledger.currency]);
    }
    if (card) {
        fields.push(
            [detail.limit, row.creditLimit === null ? "–" : money(row.creditLimit, row.currency)],
            [detail.statementDay, row.statementDay === null ? "–" : detail.day({ day: row.statementDay })],
            [detail.paymentDay, row.paymentDay === null ? "–" : detail.day({ day: row.paymentDay })]
        );
    } else if (foreign) {
        fields.push([detail.started, monthYear(row.openedDay)]);
    } else {
        fields.push(
            [detail.started, monthYear(row.openedDay)],
            [detail.opening, money(row.initialBalance, row.currency)]
        );
        if (count > 0) {
            fields.push(
                [detail.entries, count.toLocaleString("en-US")],
                [detail.average, average === null ? "–" : money(average, row.currency)]
            );
        }
    }
    return (
        <Card className="flex-1" title={detail.details}>
            <div className="p-4">
                {fields.map(([label, value, words], index) => (
                    <div className={FIELD} key={index}>
                        <span className="text-muted-foreground">{label}</span>
                        <span
                            className={
                                words ? "" : `font-mono tabular-nums ${count > 0 ? "text-muted-foreground" : ""}`
                            }
                        >
                            {value}
                        </span>
                    </div>
                ))}
            </div>
        </Card>
    );
}

export function AccountDetail({ accountId }: { accountId: string }) {
    const { ledger, overview } = useDashboard();
    const { detail } = useIntlayer("dashboard-accounts");
    const row = useMemo(
        // A full page load arrives lowercased by the canonical URL redirect, so ids match without case.
        () => accountRows(ledger, overview).find((each) => each.id.toLowerCase() === accountId.toLowerCase()),
        [accountId, ledger, overview]
    );
    if (!row) {
        return (
            <main className="min-w-0 px-4 pb-5 sm:px-6">
                <AccountsBar title={detail.details} />
                <p className="text-muted-foreground py-6 text-sm">
                    {detail.notFound}{" "}
                    <Link
                        className="text-foreground underline"
                        to="/accounts"
                        viewTransition={viewTransition("push-left", { back: true })}
                    >
                        {detail.back}
                    </Link>
                </p>
            </main>
        );
    }
    const empty = flowsOf(ledger, row.id).length === 0;
    return (
        <Toast.Provider position="bottom-center" toastManager={deleteToasts}>
            <main className="@container flex min-h-dvh min-w-0 flex-col px-4 pb-5 sm:px-6">
                <DetailBar row={row} />
                {isCard(row) ? <CardKpis row={row} /> : <BankKpis row={row} />}
                <div className="mt-4 grid flex-1 grid-cols-1 gap-4 @5xl:grid-cols-[minmax(0,1fr)_332px]">
                    <div className="flex min-w-0 flex-col gap-4">
                        {empty ? (
                            <EmptyEntries accountId={row.id} />
                        ) : (
                            <>
                                <HistoryCard row={row} />
                                <TransactionsCard key={row.id} row={row} />
                            </>
                        )}
                    </div>
                    <div className="flex min-w-0 flex-col gap-4">
                        <CheckCard row={row} />
                        <UpcomingCard accountId={row.id} showEmpty={!empty} />
                        {isCard(row) ? <InstallmentsCard row={row} /> : <SpentCard row={row} />}
                        <DetailsCard row={row} />
                    </div>
                </div>
            </main>
        </Toast.Provider>
    );
}
