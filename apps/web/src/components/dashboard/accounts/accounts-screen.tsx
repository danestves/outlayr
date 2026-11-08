import {
    RiAddLine,
    RiArchiveLine,
    RiArrowDownSLine,
    RiArrowLeftDownLine,
    RiArrowLeftRightLine,
    RiArrowRightUpLine,
    RiBankCardLine,
    RiBankLine,
    RiDeleteBin6Line,
    RiHistoryLine,
    RiMore2Fill,
    RiUpload2Line,
    RiSafe2Line,
} from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { Menu } from "panelui-web/menu";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDateFormat, useWholeMoney, titled } from "@/components/dashboard/home/format";
import { PhoneButton } from "@/components/dashboard/home/setup";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { NO_PHOTOS, photoUrlsQuery, toPhotoUrls } from "@/components/dashboard/shell/photos";
import { AccountTile, LookTile } from "@/components/ledger/tiles";
import { archivedAccount } from "@/lib/account-writes";
import { addDays } from "@/lib/ledger";
import { commitRows } from "@/lib/ledger-commit";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useAccountFlows, useLedgerDb } from "./flows";
import {
    accountRows,
    archivedRows,
    byCurrency,
    cardStatement,
    changeSince,
    checkedAge,
    creditLine,
    flowsOf,
    groupRows,
    hasPlans,
    monthStart,
    rangeDays,
    ratesFor,
    recentBalances,
    sortRows,
    storedSort,
    worthSeries,
} from "./model";
import type { AccountRow, AccountSort, ArchivedRow, WorthRange } from "./model";
import {
    AccountCell,
    KpiBand,
    KpiCell,
    RowMenu,
    Segments,
    SortMenu,
    Spark,
    Trend,
    toneOf,
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
const LIST_CHART = 770 / 236;
const TH =
    "text-muted-foreground h-9 px-2.5 text-left text-xs font-medium shadow-[inset_0_1px_0_var(--color-app-rule),inset_0_-1px_0_var(--color-app-rule)] first:pl-5 last:pr-5 last:text-right";
export const TD = "h-11 border-b px-2.5 whitespace-nowrap first:pl-5 last:pr-5 last:text-right";
export const BALANCE = "dash-figure text-right text-sm font-medium";
export const ROW = "flex h-11 items-center gap-2.5 border-b text-[13px] font-medium last:border-0";
export const ICON_TILE =
    "bg-app-fill text-muted-foreground flex size-[26px] shrink-0 items-center justify-center rounded-lg";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
    return <section className={`dash-card ${className}`}>{children}</section>;
}

export function Head({ aside, count, title }: { aside?: ReactNode; count?: number; title: ReactNode }) {
    return (
        <div className="dash-card-head">
            <h2>{title}</h2>
            {count === undefined ? null : (
                <span className="dash-figure text-muted-foreground text-[13px]">{count}</span>
            )}
            {aside ? (
                <span className="dash-figure text-muted-foreground ml-auto min-w-0 truncate text-[13px]">{aside}</span>
            ) : null}
        </div>
    );
}

/** `numbers` counts the right-aligned figure columns that sit before the trailing menu column. */
export function Table({
    children,
    head,
    numbers = 1,
}: {
    children: ReactNode;
    head: readonly ReactNode[];
    numbers?: number;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
                <thead>
                    <tr>
                        {head.map((cell, index) => (
                            <th
                                className={`${TH} ${index >= head.length - 1 - numbers && index < head.length - 1 ? "text-right" : ""}`}
                                key={index}
                            >
                                {cell}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="[&>tr:last-child>td]:border-0">{children}</tbody>
            </table>
        </div>
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

function Kpis({ model }: { model: ListModel }) {
    const { ledger } = useDashboard();
    const { kpi } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const { whole } = useWholeMoney(ledger.currency);
    const { before, months, now, rows } = model;
    const credit = creditLine(ledger, groupRows(rows).cards);
    const net = now?.net ?? 0;
    const delta = (key: "net" | "owe" | "own") => (now?.[key] ?? 0) - (before?.[key] ?? 0);
    const quiet = rows.length === 0;
    const growth = before && before.net !== 0 ? delta("net") / Math.abs(before.net) : null;
    const line = (key: "net" | "owe" | "own", color: string) =>
        quiet ? null : <Spark color={color} height={28} values={months.map((point) => point[key])} width={96} />;
    const change = (key: "owe" | "own", goodWhenUp: boolean) =>
        quiet ? null : (
            <Trend tone={toneOf(delta(key), goodWhenUp)}>{money(delta(key), ledger.currency, "always")}</Trend>
        );
    if (quiet) {
        const zero = money(0, ledger.currency);
        return (
            <KpiBand columns={4}>
                {[kpi.netWorth, kpi.have, kpi.owe, kpi.available].map((label) => (
                    <KpiCell color={MUTED} key={label.value} label={label} quiet value={zero} />
                ))}
            </KpiBand>
        );
    }
    return (
        <KpiBand columns={credit ? 4 : 3}>
            <KpiCell color={MUTED} icon={RiSafe2Line} label={kpi.netWorth} value={money(net, ledger.currency)}>
                {growth === null || quiet ? (
                    <span />
                ) : (
                    <Trend tone={toneOf(growth)}>{`${growth > 0 ? "+" : ""}${(growth * PERCENT).toFixed(1)}%`}</Trend>
                )}
                {line("net", MUTED)}
            </KpiCell>
            <KpiCell
                color={INCOME}
                icon={RiArrowLeftDownLine}
                label={kpi.have}
                value={money(now?.own ?? 0, ledger.currency)}
            >
                {change("own", true)}
                {line("own", INCOME)}
            </KpiCell>
            <KpiCell
                color={SPEND}
                icon={RiArrowRightUpLine}
                label={kpi.owe}
                value={money(now?.owe ?? 0, ledger.currency)}
            >
                {change("owe", false)}
                {line("owe", SPEND)}
            </KpiCell>
            {credit ? (
                <KpiCell
                    color={MUTED}
                    icon={RiBankCardLine}
                    label={kpi.available}
                    value={`${credit.exact ? "" : "~"}${money(credit.available, ledger.currency)}`}
                >
                    <Trend tone="flat">{kpi.of({ amount: `${credit.exact ? "" : "~"}${whole(credit.limit)}` })}</Trend>
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
        <Card className="flex-1">
            <div className="dash-card-head max-sm:h-auto max-sm:flex-wrap max-sm:py-3">
                <h2>
                    <Link className="hover:text-app-tint inline-flex items-center gap-1" to="/app/accounts/net-worth">
                        {kpi.netWorth}
                        <RiArrowRightUpLine className="text-muted-foreground" size={15} />
                    </Link>
                </h2>
                <span className="dash-figure text-muted-foreground truncate text-[13px]">
                    {list.inPeriod({
                        amount: money(gained, ledger.currency, "always"),
                        period: date.month(ledger.today.slice(0, 7)),
                    })}
                </span>
                <div className="ml-auto">
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
                </div>
            </div>
            <div className="flex-1 px-5 pb-3.5">
                <WorthChart aspectRatio={LIST_CHART} data={data} label={kpi.netWorth.value} range={range} />
            </div>
        </Card>
    );
}

function Balance({ row }: { row: AccountRow }) {
    const { money } = useDisplayFormat();
    return <td className={`${TD} ${BALANCE}`}>{money(row.balance, row.currency)}</td>;
}

function InMain({ row }: { row: AccountRow }) {
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    return (
        <td className={`${TD} ${BALANCE}`}>
            {row.exact ? "" : "~"}
            {money(row.value, ledger.currency)}
        </td>
    );
}

function CurrencyCell({ row }: { row: AccountRow }) {
    return (
        <td className={TD}>
            {row.currency}
            {row.exact ? null : (
                <span className="dash-badge text-muted-foreground ml-2 font-mono">{row.currency}?</span>
            )}
        </td>
    );
}

function MenuCell({ row }: { row: AccountRow }) {
    return (
        <td className={`${TD} w-10`}>
            <RowMenu row={row} />
        </td>
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
        <Card>
            <Head aside={money(total, ledger.currency)} count={assets.length} title={list.accounts} />
            {model.multi ? (
                <Table
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
                        <tr key={row.id}>
                            <td className={TD}>
                                <AccountLink row={row}>
                                    <AccountCell note={<CheckedNote row={row} />} row={row} />
                                </AccountLink>
                            </td>
                            <CurrencyCell row={row} />
                            <Balance row={row} />
                            <InMain row={row} />
                            <MenuCell row={row} />
                        </tr>
                    ))}
                </Table>
            ) : (
                <Table head={[columns.account, columns.last30, monthName, columns.balance, ""]}>
                    {assets.map((row) => {
                        const line = model.recent.get(row.id) ?? [];
                        const change = model.changes.get(row.id) ?? 0;
                        return (
                            <tr key={row.id}>
                                <td className={TD}>
                                    <AccountLink row={row}>
                                        <AccountCell row={row} />
                                    </AccountLink>
                                </td>
                                <td className={TD}>
                                    <Spark
                                        color={(line.at(-1) ?? 0) >= (line[0] ?? 0) ? INCOME : SPEND}
                                        height={26}
                                        values={line}
                                        width={120}
                                    />
                                </td>
                                <td className={TD}>
                                    <Trend tone={toneOf(change)}>{money(change, row.currency, "always")}</Trend>
                                </td>
                                <Balance row={row} />
                                <MenuCell row={row} />
                            </tr>
                        );
                    })}
                </Table>
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
        const statement = cardStatement(row, flowsOf(ledger, row.id), ledger.today, hasPlans(ledger, row.id));
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
        return <td className={`${TD} text-muted-foreground`}>{card.noLimit}</td>;
    }
    const used = Math.min(1, Math.max(0, -row.balance / row.creditLimit));
    return (
        <td className={TD}>
            <div className="bg-app-fill flex h-2 w-[120px] overflow-hidden rounded-full">
                <i className="bg-foreground block h-full rounded-full" style={{ width: `${used * PERCENT}%` }} />
            </div>
            <small className="dash-figure text-muted-foreground mt-1 block text-xs leading-4">
                {card.available({
                    amount: money(Math.max(0, row.creditLimit + row.balance), row.currency),
                })}
            </small>
        </td>
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
        <Card>
            <Head aside={money(total, ledger.currency)} count={cards.length} title={list.cards} />
            {model.multi ? (
                <Table
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
                        <tr key={row.id}>
                            <td className={TD}>
                                <AccountLink row={row}>
                                    <AccountCell note={statement(row) ?? <CheckedNote row={row} />} row={row} />
                                </AccountLink>
                            </td>
                            <CurrencyCell row={row} />
                            <Balance row={row} />
                            <InMain row={row} />
                            <MenuCell row={row} />
                        </tr>
                    ))}
                </Table>
            ) : (
                <Table head={[columns.card, columns.used, columns.statement, columns.balance, ""]}>
                    {cards.map((row) => (
                        <tr key={row.id}>
                            <td className={TD}>
                                <AccountLink row={row}>
                                    <AccountCell row={row} />
                                </AccountLink>
                            </td>
                            <UsedCell row={row} />
                            <td className={TD}>{statement(row)}</td>
                            <Balance row={row} />
                            <MenuCell row={row} />
                        </tr>
                    ))}
                </Table>
            )}
        </Card>
    );
}

export function UpcomingCard({ accountId }: { accountId?: string }) {
    const { ledger, overview, photos } = useDashboard();
    const { list } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const horizon = addDays(ledger.today, UPCOMING_DAYS);
    const charges = overview.upcoming.charges
        .filter((charge) => charge.nextCharge <= horizon && (!accountId || charge.accountId === accountId))
        .slice(0, UPCOMING_ROWS);
    if (charges.length === 0) {
        return null;
    }
    const unvalued = charges.some((charge) => charge.valued === null && charge.currency !== overview.upcoming.currency);
    const total = charges.reduce(
        (sum, charge) => sum + (charge.valued ?? charge.amount) * (charge.kind === "income" ? -1 : 1),
        0
    );
    return (
        <Card>
            <Head aside={unvalued ? null : money(total, overview.upcoming.currency)} title={list.upcoming} />
            <div className="px-5 pb-1.5">
                {charges.map((charge) => (
                    <div className={ROW} key={charge.id}>
                        <LookTile look={charge.look} photos={photos} plain size="lg" />
                        <span className="min-w-0 truncate">{charge.note}</span>
                        <span
                            className={`dash-figure font-normal whitespace-nowrap ${charge.nextCharge < ledger.today ? "text-app-spend" : "text-muted-foreground"}`}
                        >
                            {date.day(charge.nextCharge)}
                        </span>
                        <span
                            className={`dash-figure ml-auto whitespace-nowrap ${charge.kind === "income" ? "text-app-income" : ""}`}
                        >
                            {charge.valued === null
                                ? money(charge.amount, charge.currency)
                                : money(charge.valued, overview.upcoming.currency)}
                        </span>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function TransfersCard() {
    const { ledger } = useDashboard();
    const { list } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const transfers = ledger.transfers.toSorted((a, b) => b.at - a.at).slice(0, TRANSFER_ROWS);
    if (transfers.length === 0) {
        return null;
    }
    return (
        <Card className="flex-1">
            <Head title={list.transfers} />
            <div className="px-5 pb-1.5">
                {transfers.map((transfer) => (
                    <div className={ROW} key={transfer.id}>
                        <span className={ICON_TILE}>
                            <RiArrowLeftRightLine size={14} />
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
        <Card>
            <Head aside={money(model.now?.net ?? 0, ledger.currency)} title={list.byCurrency} />
            <div className="px-5 pb-[18px]">
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
        <Card>
            <Head aside={date.day(ledger.today)} title={list.rates} />
            <div className="px-5 pb-[18px]">
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
const GHOST_GRID = "grid grid-cols-[34%_21%_1fr_auto] items-center px-5";
// The client renderer drops preserveAspectRatio from JSX, so it is set on the node.
const stretch = (node: SVGSVGElement | null) => node?.setAttribute("preserveAspectRatio", "none");

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
        <section className="dash-card relative min-h-[760px] flex-1">
            <div aria-hidden className="px-5 pt-3.5">
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
                <button className="dash-btn mt-3" onClick={() => open({ kind: "create", type: "bank" })} type="button">
                    <RiAddLine size={17} />
                    {actions.addAccount}
                </button>
            </div>
        </section>
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
                className="text-muted-foreground hover:text-foreground -mr-1 inline-flex size-7 items-center justify-center rounded-lg align-middle"
            >
                <RiMore2Fill size={17} />
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell dash-menu ph-no-capture w-[210px]" sideOffset={4}>
                <Menu.Item className="dash-menu-item" onClick={restore}>
                    <RiArchiveLine size={16} />
                    {flows.restore}
                </Menu.Item>
                <Menu.Item
                    className="dash-menu-item"
                    onClick={() => navigate({ search: { accounts: row.id, span: "all" }, to: "/app/transactions" })}
                >
                    <RiHistoryLine size={16} />
                    {flows.seeTransactions}
                </Menu.Item>
                <div className="dash-menu-rule" />
                <Menu.Item
                    className="dash-menu-item text-app-spend [&>svg]:text-app-spend!"
                    onClick={() => open({ accountId: row.id, kind: "delete" })}
                >
                    <RiDeleteBin6Line size={16} />
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
        <Table head={[columns.account, flows.lastEntry, columns.balance, ""]}>
            {rows.map((row) => (
                <tr key={row.id}>
                    <td className={TD}>
                        <div className="flex min-w-0 items-center gap-2.5 opacity-60">
                            <AccountTile account={row.look} photos={photos} size="lg" />
                            <div className="min-w-0">
                                <b className="block truncate text-sm leading-[18px] font-medium">{row.name}</b>
                                <small className="text-muted-foreground block truncate text-xs leading-4">
                                    {row.currency} · {flows.archivedOn({ date: date.day(row.archivedDay) })}
                                </small>
                            </div>
                        </div>
                    </td>
                    <td className={`${TD} dash-figure text-muted-foreground`}>
                        {row.lastDay === null ? "" : date.full(row.lastDay)}
                    </td>
                    <td className={`${TD} ${BALANCE} text-muted-foreground`}>{money(row.balance, row.currency)}</td>
                    <td className={`${TD} w-10`}>
                        <ArchivedMenu row={row} />
                    </td>
                </tr>
            ))}
        </Table>
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
        <Card>
            <button
                aria-expanded={open}
                className="dash-card-head w-full text-left"
                onClick={() => setOpen(!open)}
                type="button"
            >
                <RiArchiveLine className="text-muted-foreground shrink-0" size={16} />
                <h2>{flows.archived}</h2>
                <span className="dash-figure text-muted-foreground text-[13px]">{rows.length}</span>
                {open ? (
                    <span className="text-muted-foreground ml-auto min-w-0 truncate text-[13px]">
                        {flows.archivedNote}
                    </span>
                ) : null}
                <RiArrowDownSLine
                    className={`text-muted-foreground shrink-0 ${open ? "rotate-180" : "ml-auto"}`}
                    size={18}
                />
            </button>
            {open ? <ArchivedRows rows={rows} /> : null}
        </Card>
    );
}

function AddAccountMenu() {
    const { actions, columns, flows } = useIntlayer("dashboard-accounts");
    const { open } = useAccountFlows();
    return (
        <Menu>
            <Menu.Trigger className="dash-btn">
                <RiAddLine size={17} />
                {actions.addAccount}
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell dash-menu ph-no-capture w-[232px]" sideOffset={4}>
                <Menu.Item className="dash-menu-item" onClick={() => open({ kind: "create", type: "bank" })}>
                    <RiBankLine size={16} />
                    {columns.account}
                </Menu.Item>
                <Menu.Item className="dash-menu-item" onClick={() => open({ kind: "create", type: "card" })}>
                    <RiBankCardLine size={16} />
                    {flows.cardOrLoan}
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
                    <PhoneButton className="dash-ob h-9 gap-1.5 rounded-[10px] px-3 [&>svg]:size-4">
                        <RiUpload2Line />
                        {actions.import}
                    </PhoneButton>
                ) : (
                    <>
                        <SortMenu onSort={saveSort} sort={sort} />
                        <PhoneButton className="dash-ob h-9 gap-1.5 rounded-[10px] px-3 max-sm:hidden [&>svg]:size-4">
                            <RiArrowLeftRightLine />
                            {actions.transfer}
                        </PhoneButton>
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
                        <TransfersCard />
                    </div>
                </div>
            )}
        </main>
    );
}
