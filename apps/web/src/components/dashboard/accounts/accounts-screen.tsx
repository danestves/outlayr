import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Archive02Icon from "@hugeicons/core-free-icons/Archive02Icon";
import ArrowDataTransferHorizontalIcon from "@hugeicons/core-free-icons/ArrowDataTransferHorizontalIcon";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import ArrowDownLeft01Icon from "@hugeicons/core-free-icons/ArrowDownLeft01Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import BankIcon from "@hugeicons/core-free-icons/BankIcon";
import CalendarCheckIn01Icon from "@hugeicons/core-free-icons/CalendarCheckIn01Icon";
import CreditCardIcon from "@hugeicons/core-free-icons/CreditCardIcon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import HistoryIcon from "@hugeicons/core-free-icons/HistoryIcon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import SafeIcon from "@hugeicons/core-free-icons/SafeIcon";
import Upload01Icon from "@hugeicons/core-free-icons/Upload01Icon";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import type { KpiColor } from "panelui-web/kpi";
import { Menu } from "panelui-web/menu";
import { Table } from "panelui-web/table";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { CardFrame } from "@/components/dashboard/home/card-frame";
import { useDateFormat, useWholeMoney, titled } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { NO_PHOTOS, photoUrlsQuery, toPhotoUrls } from "@/components/dashboard/shell/photos";
import { AccountTile, LookTile } from "@/components/ledger/tiles";
import { archivedAccount } from "@/lib/account-writes";
import { addDays } from "@/lib/ledger";
import { commitRows } from "@/lib/ledger-commit";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useAccountFlows, useLedgerDb } from "./flows";
import { Glyph } from "./glyph";
import {
    accountRows,
    archivedRows,
    byCurrency,
    cardStatement,
    changeSince,
    checkedAge,
    creditLine,
    flowsOf,
    goalRows,
    groupRows,
    monthStart,
    plansOn,
    rangeDays,
    ratesFor,
    recentBalances,
    sortRows,
    storedSort,
    upcomingRows,
    worthSeries,
} from "./model";
import type { AccountRow, AccountSort, ArchivedRow, UpcomingRow, WorthRange } from "./model";
import {
    AccountCell,
    KpiBand,
    KpiCell,
    Meter,
    PhoneAction,
    RowMenu,
    Segments,
    SortMenu,
    Spark,
    Trend,
    stretch,
    useCheckedText,
} from "./parts";
import { WorthChart } from "./worth-chart";

export const MUTED = "var(--color-app-muted)";
export const INCOME = "var(--color-app-income)";
export const SPEND = "var(--color-app-spend)";
const RECENT_DAYS = 30;
const UPCOMING_DAYS = 30;
const UPCOMING_ROWS = 5;
const TRANSFER_ROWS = 7;
export const PERCENT = 100;
const LIST_CHART = 770 / 220;
const HEAD = "h-9 first:ps-3.5 last:pe-3.5 last:text-end";
const CELL = "h-11 py-0 whitespace-nowrap first:ps-3.5 last:pe-3.5 last:text-end";
export const ROW = "flex h-11 items-center gap-2.5 border-b text-[13px] font-medium last:border-0";
export const ICON_TILE =
    "bg-app-fill text-muted-foreground flex size-[26px] shrink-0 items-center justify-center rounded-lg";

/** A band with its count beside the title and a quiet figure, the action or both at the end. */
export function Card({
    action,
    aside,
    children,
    className,
    count,
    panelClassName,
    stackAction,
    title,
}: {
    action?: ReactNode;
    aside?: ReactNode;
    children?: ReactNode;
    className?: string;
    count?: number;
    panelClassName?: string;
    stackAction?: boolean;
    title: ReactNode;
}) {
    return (
        <CardFrame
            action={
                aside || action ? (
                    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 sm:justify-end">
                        {aside ? (
                            <span className="dash-figure text-muted-foreground min-w-0 truncate text-[13px]">
                                {aside}
                            </span>
                        ) : null}
                        {action}
                    </span>
                ) : null
            }
            className={className}
            panelClassName={panelClassName}
            stackAction={stackAction}
            title={
                count === undefined ? (
                    title
                ) : (
                    <>
                        {title}{" "}
                        <span className="dash-figure text-muted-foreground ms-1 text-[13px] font-normal">{count}</span>
                    </>
                )
            }
        >
            {children}
        </CardFrame>
    );
}

/** `numbers` counts the right-aligned figure columns that sit before the trailing column. */
export function DataTable({
    children,
    head,
    numbers = 1,
}: {
    children: ReactNode;
    head: readonly ReactNode[];
    numbers?: number;
}) {
    return (
        <Table containerClassName="overflow-x-auto" striped>
            <Table.Header>
                <Table.Row>
                    {head.map((cell, index) => (
                        <Table.Head
                            align={index >= head.length - 1 - numbers && index < head.length - 1 ? "end" : "start"}
                            className={HEAD}
                            key={index}
                        >
                            {cell}
                        </Table.Head>
                    ))}
                </Table.Row>
            </Table.Header>
            <Table.Body>{children}</Table.Body>
        </Table>
    );
}

/** `figure` is a right-aligned amount. */
export function Cell({
    children,
    className = "",
    figure = false,
}: {
    children?: ReactNode;
    className?: string;
    figure?: boolean;
}) {
    return (
        <Table.Cell
            align={figure ? "end" : "start"}
            className={`${CELL} ${figure ? "dash-figure text-sm font-medium" : ""} ${className}`}
        >
            {children}
        </Table.Cell>
    );
}

function useListModel() {
    const { ledger, overview } = useDashboard();
    return useMemo(() => {
        const rows = accountRows(ledger, overview);
        const start = addDays(monthStart(ledger.today), -1);
        const months = worthSeries(ledger, rangeDays(ledger, "sixMonths"));
        const [before] = worthSeries(ledger, [start]);
        return {
            before,
            changes: changeSince(ledger, monthStart(ledger.today)),
            months,
            multi: rows.some((row) => row.currency !== ledger.currency),
            now: months.at(-1),
            recent: recentBalances(ledger, RECENT_DAYS),
            rows,
        };
    }, [ledger, overview]);
}

type ListModel = ReturnType<typeof useListModel>;

const quietNote = (children: ReactNode) => (
    <span className="text-muted-foreground truncate text-[13px] leading-5">{children}</span>
);

function Kpis({ model }: { model: ListModel }) {
    const { ledger } = useDashboard();
    const { kpi, list } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const { whole } = useWholeMoney(ledger.currency);
    const { before, months, multi, now, rows } = model;
    const credit = creditLine(ledger, groupRows(rows).cards);
    const net = now?.net ?? 0;
    const delta = (key: "net" | "owe" | "own") => (now?.[key] ?? 0) - (before?.[key] ?? 0);
    const quiet = rows.length === 0;
    const growth = before && before.net !== 0 ? delta("net") / Math.abs(before.net) : null;
    const { assets, cards } = groupRows(rows);
    const line = (key: "net" | "owe" | "own", color?: KpiColor) =>
        quiet ? null : <Spark className="w-24" color={color} height={28} values={months.map((point) => point[key])} />;
    const change = (key: "owe" | "own", goodWhenUp: boolean) =>
        quiet ? null : (
            <Trend goodWhenUp={goodWhenUp} value={delta(key)}>
                {money(delta(key), ledger.currency, "always")}
            </Trend>
        );
    if (quiet) {
        const zero = money(0, ledger.currency);
        return (
            <KpiBand>
                {[kpi.netWorth, kpi.have, kpi.owe, kpi.available].map((label) => (
                    <KpiCell color={MUTED} key={label.value} label={label} quiet value={zero} />
                ))}
            </KpiBand>
        );
    }
    return (
        <KpiBand>
            <KpiCell color={MUTED} icon={SafeIcon} label={kpi.netWorth} value={money(net, ledger.currency)}>
                {multi ? (
                    quietNote(list.inMain({ currency: ledger.currency }))
                ) : (
                    <>
                        {growth === null ? (
                            <span />
                        ) : (
                            <Trend value={growth}>{`${growth > 0 ? "+" : ""}${(growth * PERCENT).toFixed(1)}%`}</Trend>
                        )}
                        {line("net")}
                    </>
                )}
            </KpiCell>
            <KpiCell
                color={INCOME}
                icon={ArrowDownLeft01Icon}
                label={kpi.have}
                value={money(now?.own ?? 0, ledger.currency)}
            >
                {multi
                    ? quietNote(assets.length === 1 ? list.oneAccount : kpi.accounts({ count: assets.length }))
                    : change("own", true)}
                {multi ? null : line("own", "success")}
            </KpiCell>
            <KpiCell
                color={SPEND}
                icon={ArrowUpRight01Icon}
                label={kpi.owe}
                value={money(now?.owe ?? 0, ledger.currency)}
            >
                {multi
                    ? quietNote(cards.length === 1 ? list.oneCard : list.cardCount({ count: cards.length }))
                    : change("owe", false)}
                {multi ? null : line("owe", "destructive")}
            </KpiCell>
            {credit ? (
                <KpiCell
                    color={MUTED}
                    icon={CreditCardIcon}
                    label={kpi.available}
                    value={`${credit.exact ? "" : "~"}${money(credit.available, ledger.currency)}`}
                >
                    <Badge className="dash-figure text-muted-foreground" variant="secondary">
                        {kpi.of({ amount: `${credit.exact ? "" : "~"}${whole(credit.limit)}` })}
                    </Badge>
                </KpiCell>
            ) : null}
        </KpiBand>
    );
}

function WorthCard({ model }: { model: ListModel }) {
    const { ledger } = useDashboard();
    const { kpi, list, range: copy } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const [range, setRange] = useState<WorthRange>("sixMonths");
    const data = useMemo(
        () =>
            worthSeries(ledger, rangeDays(ledger, range)).map((point) => ({
                day: point.day,
                value: point.net,
            })),
        [ledger, range]
    );
    const gained = (model.now?.net ?? 0) - (model.before?.net ?? 0);
    return (
        <Card
            action={
                <Segments
                    onPick={setRange}
                    options={[
                        { label: copy.month, value: "month" },
                        { label: copy.quarter, value: "quarter" },
                        { label: copy.sixMonths, value: "sixMonths" },
                        { label: copy.year, value: "year" },
                    ]}
                    value={range}
                />
            }
            className={model.multi ? "" : "flex-1"}
            stackAction
            title={
                <span className="flex min-w-0 items-baseline gap-2">
                    <Link className="hover:text-app-tint" to="/app/accounts/net-worth">
                        {kpi.netWorth}
                    </Link>
                    <span className="dash-figure text-muted-foreground truncate text-[13px] font-normal tracking-normal">
                        {model.multi
                            ? list.inCurrency({ currency: ledger.currency })
                            : list.inPeriod({
                                  amount: money(gained, ledger.currency, "always"),
                                  period: date.month(ledger.today.slice(0, 7)),
                              })}
                    </span>
                </span>
            }
        >
            <div className="flex-1 p-3.5">
                <WorthChart aspectRatio={LIST_CHART} data={data} label={kpi.netWorth.value} range={range} />
            </div>
        </Card>
    );
}

function Balance({ row }: { row: AccountRow }) {
    const { money } = useDisplayFormat();
    return <Cell figure>{money(row.balance, row.currency)}</Cell>;
}

function InMain({ row }: { row: AccountRow }) {
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    return (
        <Cell figure>
            {row.exact ? "" : "~"}
            {money(row.value, ledger.currency)}
        </Cell>
    );
}

function CurrencyCell({ row }: { row: AccountRow }) {
    return (
        <Cell>
            {row.currency}
            {row.exact ? null : (
                <Badge className="ms-2 font-mono" variant="outline">
                    {row.currency}?
                </Badge>
            )}
        </Cell>
    );
}

function MenuCell({ row }: { row: AccountRow }) {
    return (
        <Cell className="w-10">
            <RowMenu row={row} />
        </Cell>
    );
}

function AssetsCard({ model, sort }: { model: ListModel; sort: AccountSort }) {
    const { ledger } = useDashboard();
    const { columns, list } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const { locale } = useLocale();
    const assets = sortRows(groupRows(model.rows).assets, sort);
    if (assets.length === 0) {
        return null;
    }
    const total = assets.reduce((sum, row) => sum + row.value, 0);
    const monthName = titled(date.month(ledger.today.slice(0, 7)), locale);
    return (
        <Card aside={money(total, ledger.currency)} count={assets.length} title={list.accounts}>
            {model.multi ? (
                <DataTable
                    head={[
                        columns.account,
                        columns.currency,
                        columns.balance,
                        columns.inMain({ currency: ledger.currency }),
                        "",
                    ]}
                    numbers={2}
                >
                    {assets.map((row) => (
                        <Table.Row key={row.id}>
                            <Cell>
                                <AccountLink row={row}>
                                    <AccountCell note={<CheckedNote row={row} />} row={row} />
                                </AccountLink>
                            </Cell>
                            <CurrencyCell row={row} />
                            <Balance row={row} />
                            <InMain row={row} />
                            <MenuCell row={row} />
                        </Table.Row>
                    ))}
                </DataTable>
            ) : (
                <DataTable head={[columns.account, columns.last30, monthName, columns.balance, ""]}>
                    {assets.map((row) => {
                        const line = model.recent.get(row.id) ?? [];
                        const change = model.changes.get(row.id) ?? 0;
                        return (
                            <Table.Row key={row.id}>
                                <Cell>
                                    <AccountLink row={row}>
                                        <AccountCell row={row} />
                                    </AccountLink>
                                </Cell>
                                <Cell>
                                    <Spark
                                        className="w-[120px]"
                                        color={(line.at(-1) ?? 0) >= (line[0] ?? 0) ? "success" : "destructive"}
                                        height={26}
                                        values={line}
                                    />
                                </Cell>
                                <Cell>
                                    <Trend value={change}>{money(change, row.currency, "always")}</Trend>
                                </Cell>
                                <Balance row={row} />
                                <MenuCell row={row} />
                            </Table.Row>
                        );
                    })}
                </DataTable>
            )}
        </Card>
    );
}

function CheckedNote({ row }: { row: AccountRow }) {
    const { ledger } = useDashboard();
    const checked = useCheckedText();
    const { locale } = useLocale();
    const age = checkedAge(row.checkedAt, ledger);
    return <span className={age.state === "stale" ? "text-app-tint" : ""}>{titled(checked(age), locale)}</span>;
}

function AccountLink({ children, row }: { children: ReactNode; row: AccountRow }) {
    return (
        <Link
            className="block rounded-lg outline-offset-4"
            params={{ accountId: row.id }}
            to="/app/accounts/$accountId"
        >
            {children}
        </Link>
    );
}

export function useStatementText() {
    const { ledger } = useDashboard();
    const { card } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    return (row: AccountRow) => {
        const statement = cardStatement(row, flowsOf(ledger, row.id), ledger.today, plansOn(ledger, row.id));
        if (!statement) {
            return null;
        }
        const { cycle, due, overdue } = statement;
        if (due === null) {
            return <span className="text-muted-foreground">{card.closes({ date: date.day(cycle.nextCloseOn) })}</span>;
        }
        if (due === 0) {
            return <span className="text-muted-foreground">{card.nothingDue({ date: date.day(cycle.dueOn) })}</span>;
        }
        return (
            <span className={overdue ? "text-app-spend" : ""}>
                <span className="dash-figure">{money(due, row.currency)}</span>{" "}
                <span className={overdue ? "" : "text-muted-foreground"}>
                    {overdue
                        ? card.overdue({ date: date.day(cycle.dueOn) })
                        : card.due({ date: date.day(cycle.dueOn) })}
                </span>
            </span>
        );
    };
}

function UsedCell({ row }: { row: AccountRow }) {
    const { card } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    if (row.creditLimit === null || row.creditLimit <= 0) {
        return <Cell className="text-muted-foreground">{card.noLimit}</Cell>;
    }
    const used = Math.min(1, Math.max(0, -row.balance / row.creditLimit));
    return (
        <Cell>
            <Meter className="w-[120px]" max={1} value={used} />
            <small className="dash-figure text-muted-foreground mt-1 block text-xs leading-4">
                {card.available({
                    amount: money(Math.max(0, row.creditLimit + row.balance), row.currency),
                })}
            </small>
        </Cell>
    );
}

function CardsCard({ model, sort }: { model: ListModel; sort: AccountSort }) {
    const { ledger } = useDashboard();
    const { columns, list } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const statement = useStatementText();
    const cards = sortRows(groupRows(model.rows).cards, sort);
    if (cards.length === 0) {
        return null;
    }
    const total = cards.reduce((sum, row) => sum + row.value, 0);
    return (
        <Card aside={money(total, ledger.currency)} count={cards.length} title={list.cards}>
            {model.multi ? (
                <DataTable
                    head={[
                        columns.card,
                        columns.currency,
                        columns.balance,
                        columns.inMain({ currency: ledger.currency }),
                        "",
                    ]}
                    numbers={2}
                >
                    {cards.map((row) => (
                        <Table.Row key={row.id}>
                            <Cell>
                                <AccountLink row={row}>
                                    <AccountCell note={statement(row) ?? <CheckedNote row={row} />} row={row} />
                                </AccountLink>
                            </Cell>
                            <CurrencyCell row={row} />
                            <Balance row={row} />
                            <InMain row={row} />
                            <MenuCell row={row} />
                        </Table.Row>
                    ))}
                </DataTable>
            ) : (
                <DataTable head={[columns.card, columns.used, columns.statement, columns.balance, ""]}>
                    {cards.map((row) => (
                        <Table.Row key={row.id}>
                            <Cell>
                                <AccountLink row={row}>
                                    <AccountCell row={row} />
                                </AccountLink>
                            </Cell>
                            <UsedCell row={row} />
                            <Cell>{statement(row)}</Cell>
                            <Balance row={row} />
                            <MenuCell row={row} />
                        </Table.Row>
                    ))}
                </DataTable>
            )}
        </Card>
    );
}

function UpcomingLead({ row }: { row: UpcomingRow }) {
    const { photos } = useDashboard();
    if (row.source.kind === "charge") {
        return <LookTile look={row.source.charge.look} photos={photos} plain size="lg" />;
    }
    return (
        <span className={ICON_TILE}>
            {row.source.kind === "statement" ? (
                <Glyph icon={CreditCardIcon} size={14} />
            ) : (
                <Glyph icon={CalendarCheckIn01Icon} size={14} />
            )}
        </span>
    );
}

export function UpcomingCard({ accountId, showEmpty = false }: { accountId?: string; showEmpty?: boolean }) {
    const { ledger, overview } = useDashboard();
    const { list } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const horizon = addDays(ledger.today, UPCOMING_DAYS);
    const rows = upcomingRows(ledger, overview, horizon, accountId).slice(0, UPCOMING_ROWS);
    if (rows.length === 0) {
        return showEmpty ? (
            <Card title={list.upcoming}>
                <p className="text-muted-foreground px-3.5 py-3 text-[13px]">{list.nothingScheduled}</p>
            </Card>
        ) : null;
    }
    const unvalued = rows.some((row) => row.value === null);
    const total = rows.reduce((sum, row) => sum + (row.value ?? 0) * (row.income ? -1 : 1), 0);
    const titleOf = ({ source }: UpcomingRow) => {
        if (source.kind === "charge") {
            return source.charge.note;
        }
        if (source.kind === "statement") {
            return accountId ? list.payment : source.accountName;
        }
        const name = source.name || list.planFallback.value;
        return source.sequence > 0 ? list.planNth({ count: source.count, name, sequence: source.sequence }) : name;
    };
    return (
        <Card aside={unvalued ? null : money(total, overview.upcoming.currency)} title={list.upcoming}>
            <div className="px-3.5 py-1">
                {rows.map((row) => (
                    <div className={ROW} key={row.id}>
                        <UpcomingLead row={row} />
                        <span className="min-w-0 truncate">{titleOf(row)}</span>
                        <span
                            className={`dash-figure font-normal whitespace-nowrap ${row.day < ledger.today ? "text-app-spend" : "text-muted-foreground"}`}
                        >
                            {date.day(row.day)}
                        </span>
                        <span
                            className={`dash-figure ml-auto whitespace-nowrap ${row.income ? "text-app-income" : ""}`}
                        >
                            {money(row.amount, row.currency)}
                        </span>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function GoalsCard({ model }: { model: ListModel }) {
    const { ledger } = useDashboard();
    const { actions, list } = useIntlayer("dashboard-accounts");
    const { whole } = useWholeMoney(ledger.currency);
    const goals = goalRows(ledger, model.rows);
    if (goals.length === 0) {
        return null;
    }
    return (
        <Card
            action={
                <PhoneAction className="-my-1" size="sm">
                    {actions.seeAll}
                </PhoneAction>
            }
            title={list.goals}
        >
            <div className="flex flex-col gap-4 px-3.5 py-3">
                {goals.map((goal) => (
                    <div key={goal.id}>
                        <div className="flex items-baseline gap-2 text-[13px] font-medium">
                            <span className="min-w-0 truncate">{goal.name}</span>
                            <span className="dash-figure ml-auto whitespace-nowrap">
                                {goal.exact ? "" : "~"}
                                {whole(goal.saved)}
                                <span className="text-muted-foreground font-normal">
                                    {" / "}
                                    {whole(goal.target)}
                                </span>
                            </span>
                        </div>
                        <Meter className="mt-2.5" max={1} value={goal.fraction} />
                    </div>
                ))}
            </div>
        </Card>
    );
}

function TransfersCard() {
    const { ledger } = useDashboard();
    const { actions, list } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const transfers = ledger.transfers.toSorted((a, b) => b.at - a.at).slice(0, TRANSFER_ROWS);
    if (transfers.length === 0) {
        return null;
    }
    return (
        <Card
            action={
                <Button
                    className="-my-1"
                    nativeButton={false}
                    render={<Link search={{ span: "all", type: "transfers" }} to="/app/transactions" />}
                    size="sm"
                    variant="outline"
                >
                    {actions.seeAll}
                </Button>
            }
            className="flex-1"
            title={list.transfers}
        >
            <div className="px-3.5 py-1">
                {transfers.map((transfer) => (
                    <div className={ROW} key={transfer.id}>
                        <span className={ICON_TILE}>
                            <Glyph icon={ArrowDataTransferHorizontalIcon} size={14} />
                        </span>
                        <span className="min-w-0 truncate">
                            {list.transferTo({ name: ledger.accounts.get(transfer.toId)?.name ?? "" })}
                        </span>
                        <span className="dash-figure text-muted-foreground font-normal whitespace-nowrap">
                            {date.day(transfer.day)}
                        </span>
                        <span className="dash-figure ml-auto whitespace-nowrap">
                            {money(transfer.sent, transfer.sentCurrency)}
                        </span>
                    </div>
                ))}
            </div>
        </Card>
    );
}

const shade = (index: number) =>
    `color-mix(in oklab, var(--color-foreground) ${Math.max(20, 100 - index * 35)}%, transparent)`;

function CurrencyCard({ model }: { model: ListModel }) {
    const { ledger } = useDashboard();
    const { list } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const shares = byCurrency(ledger, model.rows);
    const positive = shares.filter((share) => share.value > 0);
    const whole = positive.reduce((sum, share) => sum + share.value, 0);
    return (
        <Card aside={money(model.now?.net ?? 0, ledger.currency)} title={list.byCurrency}>
            <div className="p-3.5">
                <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                    {positive.map((share, index) => (
                        <i
                            className="block h-full rounded-full"
                            key={share.code}
                            style={{ background: shade(index), flex: `${share.value / whole} 1 0` }}
                        />
                    ))}
                </div>
                <div className="mt-2">
                    {shares.map((share, index) => (
                        <div
                            className="flex h-10 items-center gap-2 border-b text-[13px] last:border-0"
                            key={share.code}
                        >
                            <i
                                className="size-1.5 rounded-full"
                                style={{ background: share.value > 0 ? shade(index) : SPEND }}
                            />
                            <span className="dash-figure">{share.code}</span>
                            <span className="dash-figure ml-auto">
                                {share.exact ? "" : "~"}
                                {money(share.value, ledger.currency)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}

const RATE_DECIMALS = 4;
const BIG_RATE = 100;

export const rateText = (rate: number) => rate.toFixed(rate >= BIG_RATE ? 2 : RATE_DECIMALS);

function RatesCard({ model }: { model: ListModel }) {
    const { ledger } = useDashboard();
    const { list } = useIntlayer("dashboard-accounts");
    const date = useDateFormat();
    const rates = ratesFor(
        ledger,
        model.rows.map((row) => row.currency)
    );
    const missing = rates
        .filter((rate) => !rate.exact)
        .map((rate) => (rate.from === ledger.currency ? rate.to : rate.from));
    return (
        <Card aside={date.day(ledger.today)} title={list.rates}>
            <div className="p-3.5">
                {rates.map((rate) => (
                    <div
                        className="dash-figure flex h-10 items-center border-b text-[13px] last:border-0"
                        key={`${rate.from}${rate.to}`}
                    >
                        {list.rateTo({ from: rate.from, to: rate.to })}
                        <span className={`ml-auto ${rate.exact ? "" : "text-app-warn"}`}>{rateText(rate.rate)}</span>
                    </div>
                ))}
                {missing.length > 0 ? (
                    <p className="text-muted-foreground mt-3 text-[13px] leading-5">
                        {list.noRate({ codes: missing.join(", ") })}
                    </p>
                ) : null}
            </div>
        </Card>
    );
}

const GHOST_LINE =
    "M0 34L22 33L44 31L66 32L88 32L110 31L128 29L150 31L172 31L194 32L216 30L238 28L260 27L282 27L304 26L326 25L348 25L370 26L392 26L414 25L436 23L458 22L480 22L500 22";
const GHOST_SPARK = "M0 9L14 8L26 10L40 6L54 7L68 5L82 7L96 9L110 5L124 6L138 3L152 6L166 4L184 5";
const GHOST_TABLE = [
    [82, 40, 48],
    [76, 40, 64],
    [56, 34, 64],
] as const;
const GHOST_GRID = "grid grid-cols-[34%_21%_1fr_auto] items-center px-3.5";
function GhostSpark() {
    return (
        <svg className="block h-3.5 w-[184px] max-w-full" ref={stretch} viewBox="0 0 184 14">
            <path className="stroke-app-ghost" d={GHOST_SPARK} fill="none" strokeDasharray="2 3" />
        </svg>
    );
}

export function EmptyAccounts() {
    const { actions, empty } = useIntlayer("dashboard-accounts");
    const { open } = useAccountFlows();
    return (
        <Frame className="min-h-[760px] min-w-0 flex-1 rounded-2xl" variant="band">
            <Frame.Panel className="flex-1 group-data-[variant=band]/frame:rounded-[10px]">
                <div aria-hidden className="px-3.5 pt-3.5">
                    <svg
                        className="block h-[192px] w-full [&_*]:[vector-effect:non-scaling-stroke]"
                        ref={stretch}
                        viewBox="0 0 500 40"
                    >
                        {[0.5, 13.5, 26.5, 39.5].map((y) => (
                            <line className="stroke-border" key={y} x1={0} x2={500} y1={y} y2={y} />
                        ))}
                        <path className="stroke-app-ghost" d={GHOST_LINE} fill="none" strokeDasharray="2 3" />
                    </svg>
                </div>
                <div aria-hidden className={`${GHOST_GRID} mt-6 h-9 border-b`}>
                    <i className="dash-gl w-[52px]" />
                    <i className="dash-gl w-[38px]" />
                    <i className="dash-gl w-[46px]" />
                    <i className="dash-gl w-[40px]" />
                </div>
                <div aria-hidden className="[mask-image:linear-gradient(#000_40%,transparent)]">
                    {GHOST_TABLE.map(([name, change, balance]) => (
                        <div className={`${GHOST_GRID} h-[42px] border-b last:border-0`} key={name}>
                            <span className="flex items-center gap-2.5">
                                <i className="dash-gx" />
                                <i className="dash-gl" style={{ width: name }} />
                            </span>
                            <GhostSpark />
                            <i className="dash-gl" style={{ width: change }} />
                            <i className="dash-gl" style={{ width: balance }} />
                        </div>
                    ))}
                </div>
                <div className="flex flex-col items-center gap-1.5 px-6 pt-6 pb-10 text-center">
                    <b className="text-[15px] leading-[22px] font-semibold">{empty.title}</b>
                    <p className="text-muted-foreground text-[13px]">{empty.line}</p>
                    <Button className="mt-3" onClick={() => open({ kind: "create", type: "bank" })}>
                        <Glyph icon={Add01Icon} />
                        {actions.addAccount}
                    </Button>
                </div>
            </Frame.Panel>
        </Frame>
    );
}

function ArchivedMenu({ row }: { row: ArchivedRow }) {
    const { ledger } = useDashboard();
    const { actions, flows } = useIntlayer("dashboard-accounts");
    const { open, toast } = useAccountFlows();
    const db = useLedgerDb();
    const navigate = useNavigate();
    const restore = async () => {
        const account = ledger.books.accounts.find((each) => each.localId === row.id);
        if (!account) {
            return;
        }
        try {
            await commitRows(db, [archivedAccount(account, null, Date.now())]);
        } catch {
            toast({ text: flows.restoreFailed({ name: row.name }).value });
        }
    };
    return (
        <Menu>
            <Menu.Trigger
                aria-label={actions.more({ name: row.name }).value}
                render={<Button className="text-muted-foreground -mr-1" size="icon-sm" variant="ghost" />}
            >
                <Glyph icon={MoreVerticalIcon} size={17} />
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell ph-no-capture w-[210px]" sideOffset={4}>
                <Menu.Item onClick={restore}>
                    <Glyph icon={Archive02Icon} size={16} />
                    {flows.restore}
                </Menu.Item>
                <Menu.Item
                    onClick={() => navigate({ search: { accounts: row.id, span: "all" }, to: "/app/transactions" })}
                >
                    <Glyph icon={HistoryIcon} size={16} />
                    {flows.seeTransactions}
                </Menu.Item>
                <Menu.Separator />
                <Menu.Item variant="destructive" onClick={() => open({ accountId: row.id, kind: "delete" })}>
                    <Glyph icon={Delete02Icon} size={16} />
                    {actions.delete}
                </Menu.Item>
            </Menu.Content>
        </Menu>
    );
}

function ArchivedRows({ rows }: { rows: readonly ArchivedRow[] }) {
    const { columns, flows } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const convex = useRouteContext({ from: "/_account/app", select: (context) => context.convexQueryClient });
    // The shell mints photos only for open accounts, so an archived logo or photo is minted when it is looked at.
    const keys = [...new Set(rows.flatMap((row) => (row.look?.imageKey ? [row.look.imageKey] : [])))].toSorted();
    const { data: photos = NO_PHOTOS } = useQuery({ ...photoUrlsQuery(convex, keys), select: toPhotoUrls });
    return (
        <DataTable head={[columns.account, flows.lastEntry, columns.balance, ""]}>
            {rows.map((row) => (
                <Table.Row key={row.id}>
                    <Cell>
                        <div className="flex min-w-0 items-center gap-2.5 opacity-60">
                            <AccountTile account={row.look} photos={photos} size="lg" />
                            <div className="min-w-0">
                                <b className="block truncate text-sm leading-[18px] font-medium">{row.name}</b>
                                <small className="text-muted-foreground block truncate text-xs leading-4">
                                    {row.currency} · {flows.archivedOn({ date: date.day(row.archivedDay) })}
                                </small>
                            </div>
                        </div>
                    </Cell>
                    <Cell className="dash-figure text-muted-foreground">
                        {row.lastDay === null ? "" : date.full(row.lastDay)}
                    </Cell>
                    <Cell className="text-muted-foreground" figure>
                        {money(row.balance, row.currency)}
                    </Cell>
                    <Cell className="w-10">
                        <ArchivedMenu row={row} />
                    </Cell>
                </Table.Row>
            ))}
        </DataTable>
    );
}

function ArchivedCard() {
    const { ledger } = useDashboard();
    const { flows } = useIntlayer("dashboard-accounts");
    const [open, setOpen] = useState(false);
    const rows = useMemo(() => archivedRows(ledger), [ledger]);
    if (rows.length === 0) {
        return null;
    }
    return (
        <Card
            action={
                <Button
                    aria-expanded={open}
                    aria-label={flows.archived.value}
                    className="text-muted-foreground -my-1"
                    onClick={() => setOpen(!open)}
                    size="icon-sm"
                    variant="ghost"
                >
                    <Glyph icon={ArrowDown01Icon} className={open ? "rotate-180" : ""} />
                </Button>
            }
            aside={open ? flows.archivedNote : null}
            title={
                <span className="inline-flex items-center gap-2 text-[13px] font-medium">
                    <Glyph icon={Archive02Icon} className="text-muted-foreground shrink-0" size={16} />
                    {flows.archived}
                    <span className="dash-figure text-muted-foreground font-normal">{rows.length}</span>
                </span>
            }
        >
            {open ? <ArchivedRows rows={rows} /> : null}
        </Card>
    );
}

function AddAccountMenu() {
    const { actions, columns, flows } = useIntlayer("dashboard-accounts");
    const { open } = useAccountFlows();
    return (
        <Menu>
            <Menu.Trigger render={<Button />}>
                <Glyph icon={Add01Icon} />
                {actions.addAccount}
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell ph-no-capture w-[232px]" sideOffset={4}>
                <Menu.Item onClick={() => open({ kind: "create", type: "bank" })}>
                    <Glyph icon={BankIcon} size={16} />
                    {columns.account}
                </Menu.Item>
                <Menu.Item onClick={() => open({ kind: "create", type: "card" })}>
                    <Glyph icon={CreditCardIcon} size={16} />
                    {flows.cardOrLoan}
                </Menu.Item>
                <Menu.Item onClick={() => open({ kind: "purchase" })}>
                    <Glyph icon={CalendarCheckIn01Icon} size={16} />
                    {flows.purchaseInInstallments}
                </Menu.Item>
            </Menu.Content>
        </Menu>
    );
}

export function AccountsBar({ children, title }: { children?: ReactNode; title: ReactNode }) {
    return (
        <div className="flex min-h-16 flex-wrap items-center gap-2 py-3.5 max-sm:py-3">
            <h1 className="mr-auto text-lg leading-6 font-semibold tracking-[-0.02em]">{title}</h1>
            {children}
        </div>
    );
}

export function AccountsScreen() {
    const { ledger } = useDashboard();
    const { actions, list } = useIntlayer("dashboard-accounts");
    const model = useListModel();
    const { sort: saveSort } = useAccountFlows();
    const sort = storedSort(ledger);
    const empty = model.rows.length === 0;
    return (
        <main className="@container min-w-0 px-4 pb-5 sm:px-6">
            <AccountsBar title={list.title}>
                {empty ? (
                    <PhoneAction>
                        <Glyph icon={Upload01Icon} />
                        {actions.import}
                    </PhoneAction>
                ) : (
                    <>
                        <SortMenu onSort={saveSort} sort={sort} />
                        <PhoneAction className="max-sm:hidden">
                            <Glyph icon={ArrowDataTransferHorizontalIcon} />
                            {actions.transfer}
                        </PhoneAction>
                    </>
                )}
                {empty ? null : <AddAccountMenu />}
            </AccountsBar>
            <Kpis model={model} />
            {empty ? (
                <div className="mt-4 flex flex-col gap-4">
                    <EmptyAccounts />
                    <ArchivedCard />
                </div>
            ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 @5xl:grid-cols-[minmax(0,1fr)_332px]">
                    <div className="flex min-w-0 flex-col gap-4">
                        <WorthCard model={model} />
                        <AssetsCard model={model} sort={sort} />
                        <CardsCard model={model} sort={sort} />
                        <ArchivedCard />
                    </div>
                    <div className="flex min-w-0 flex-col gap-4">
                        {model.multi ? (
                            <>
                                <CurrencyCard model={model} />
                                <RatesCard model={model} />
                            </>
                        ) : null}
                        <UpcomingCard />
                        <GoalsCard model={model} />
                        <TransfersCard />
                    </div>
                </div>
            )}
        </main>
    );
}
