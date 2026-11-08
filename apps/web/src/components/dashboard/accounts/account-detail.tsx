import {
    RiAddLine,
    RiArchiveLine,
    RiArrowLeftDownLine,
    RiArrowLeftLine,
    RiArrowLeftRightLine,
    RiArrowRightUpLine,
    RiBankCardLine,
    RiCalendarLine,
    RiCheckboxCircleLine,
    RiCheckLine,
    RiDeleteBin6Line,
    RiErrorWarningLine,
    RiExchangeDollarLine,
    RiFileList3Line,
    RiMore2Fill,
    RiPencilLine,
    RiPriceTag3Line,
    RiSafe2Line,
    RiUpload2Line,
    RiWallet3Line,
} from "@remixicon/react";
import { Link } from "@tanstack/react-router";
import { Menu } from "panelui-web/menu";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { timeOfDay, titled, useDateFormat, useWholeMoney } from "@/components/dashboard/home/format";
import { PhoneButton } from "@/components/dashboard/home/setup";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile, MerchantTile } from "@/components/ledger/tiles";
import { useDisplayFormat } from "@/lib/ledger-settings";

import {
    AccountsBar,
    BALANCE,
    Card,
    Head,
    ICON_TILE,
    INCOME,
    MUTED,
    PERCENT,
    SPEND,
    TD,
    Table,
    UpcomingCard,
    rateText,
} from "./accounts-screen";
import { useAccountFlows } from "./flows";
import {
    accountEntries,
    monthsBetween,
    plansOn,
    accountRows,
    accountSeries,
    cardStatement,
    checkedAge,
    flowsOf,
    inMain,
    monthStart,
    onlyCounterpart,
    periodFlows,
    rangeDays,
    ratesFor,
    spentByCategory,
} from "./model";
import type { AccountEntry, AccountRow, WorthRange } from "./model";
import { KpiBand, KpiCell, PhoneItem, Segments, Trend, toneOf, useCheckedText } from "./parts";
import { WorthChart } from "./worth-chart";

const DETAIL_CHART = 770 / 172;
const OB = "dash-ob h-9 gap-1.5 rounded-[10px] px-3 [&>svg]:size-4";
const ICO = "border-border bg-app-hover inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border";
const FIELD = "flex h-9 items-center justify-between border-b text-[13px] last:border-0";

const isCard = (row: AccountRow) => row.kind === "liability" && (row.statementDay !== null || row.creditLimit !== null);

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

function useMonthYear() {
    const { locale } = useLocale();
    return useMemo(() => {
        const format = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC", year: "numeric" });
        return (day: string) => format.format(Date.parse(`${day}T12:00:00Z`)).replace(".", "");
    }, [locale]);
}

function DetailBar({ row }: { row: AccountRow }) {
    const { ledger, photos } = useDashboard();
    const { actions, detail, flows } = useIntlayer("dashboard-accounts");
    const { open } = useAccountFlows();
    const card = isCard(row);
    return (
        <AccountsBar
            title={
                <span className="flex min-w-0 items-center gap-3">
                    <Link aria-label={detail.back.value} className={ICO} to="/app/accounts">
                        <RiArrowLeftLine className="text-muted-foreground" size={17} />
                    </Link>
                    <AccountTile account={row.look} photos={photos} size="lg" />
                    <span className="truncate">{row.name}</span>
                    {row.currency === ledger.currency ? null : (
                        <span className="dash-badge dash-figure shrink-0 text-xs">{row.currency}</span>
                    )}
                </span>
            }
        >
            <PhoneButton className={`${OB} max-sm:hidden`}>
                <RiArrowLeftRightLine />
                {card ? detail.payCard : actions.transfer}
            </PhoneButton>
            <button
                className={`${OB} max-sm:hidden`}
                onClick={() => open({ accountId: row.id, kind: "edit" })}
                type="button"
            >
                <RiPencilLine />
                {actions.edit}
            </button>
            <Menu>
                <Menu.Trigger aria-label={actions.more({ name: row.name }).value} className={ICO}>
                    <RiMore2Fill className="text-muted-foreground" size={17} />
                </Menu.Trigger>
                <Menu.Content align="end" className="app-shell dash-menu ph-no-capture w-[200px]" sideOffset={4}>
                    <Menu.Item
                        className="dash-menu-item sm:hidden"
                        onClick={() => open({ accountId: row.id, kind: "edit" })}
                    >
                        <RiPencilLine size={16} />
                        {actions.edit}
                    </Menu.Item>
                    <Menu.Item className="dash-menu-item" onClick={() => open({ accountId: row.id, kind: "check" })}>
                        <RiCheckboxCircleLine size={16} />
                        {actions.check}
                    </Menu.Item>
                    <Menu.Item className="dash-menu-item" onClick={() => open({ accountId: row.id, kind: "archive" })}>
                        <RiArchiveLine size={16} />
                        {flows.archive}
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
            <PhoneButton className="dash-btn">
                <RiAddLine size={17} />
                {detail.addEntry}
            </PhoneButton>
        </AccountsBar>
    );
}

const note = (children: ReactNode, tone = "text-muted-foreground") => (
    <span className={`${tone} min-w-0 truncate text-[13px] leading-5`}>{children}</span>
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
    const period = date.month(ledger.today.slice(0, 7));
    const flows = periodFlows(flowsOf(ledger, row.id), from, ledger.today, row.currency);
    const other = onlyCounterpart(accountEntries(ledger, row.id, from, ledger.today));
    const otherName = other ? (ledger.accounts.get(other.id)?.name ?? "") : "";
    const entries = (count: number) => {
        if (count === 0) {
            return detail.noEntries({ period });
        }
        return count === 1 ? detail.entryIn({ period }) : detail.entriesIn({ count, period });
    };
    let moved = detail.transfersIn({ count: flows.transfers, period });
    if (flows.transfers === 0) {
        moved = detail.noTransfers({ period });
    } else if (flows.transfers === 1 && other) {
        moved = other.outbound ? detail.transferTo({ name: otherName }) : detail.transferFrom({ name: otherName });
    }
    const [rate] = ratesFor(ledger, [row.currency]);
    const main = inMain(ledger, row.balance, row.currency);
    return (
        <KpiBand columns={4}>
            <KpiCell
                color={MUTED}
                icon={icon(RiSafe2Line)}
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
                    color={MUTED}
                    icon={icon(RiExchangeDollarLine)}
                    label={columns.inMain({ currency: ledger.currency })}
                    value={`${main.exact ? "" : "~"}${money(main.value, ledger.currency)}`}
                >
                    {note(detail.atRate({ date: date.day(ledger.today), rate: rateText(rate.rate) }))}
                </KpiCell>
            ) : null}
            <KpiCell
                color={INCOME}
                icon={icon(RiArrowLeftDownLine)}
                label={detail.cameIn}
                value={money(flows.cameIn, row.currency)}
            >
                {note(entries(flows.entriesIn))}
            </KpiCell>
            <KpiCell
                color={SPEND}
                icon={icon(RiArrowRightUpLine)}
                label={detail.wentOut}
                value={money(flows.wentOut, row.currency)}
            >
                {note(entries(flows.entriesOut))}
            </KpiCell>
            {rate ? null : (
                <KpiCell
                    color={MUTED}
                    icon={icon(RiArrowLeftRightLine)}
                    label={detail.moved}
                    value={money(flows.moved, row.currency)}
                >
                    {note(moved)}
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
    const statement = cardStatement(row, flowsOf(ledger, row.id), ledger.today, plansOn(ledger, row.id));
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
        <KpiBand columns={4}>
            <KpiCell
                color={MUTED}
                icon={RiBankCardLine}
                label={detail.balance}
                value={money(row.balance, row.currency)}
            >
                {note(detail.owedLine)}
            </KpiCell>
            <KpiCell
                color={overdue ? SPEND : "var(--color-app-warn)"}
                icon={overdue ? RiErrorWarningLine : RiFileList3Line}
                label={detail.statement}
                tone={overdue ? "text-app-spend" : ""}
                value={statement?.due === null || !statement ? "–" : money(statement.due, row.currency)}
            >
                {statement ? note(statementLine, overdue ? "text-app-spend" : undefined) : note(detail.noStatement)}
            </KpiCell>
            <KpiCell
                color={SPEND}
                icon={RiArrowRightUpLine}
                label={detail.since}
                value={statement ? money(statement.since, row.currency) : "–"}
            >
                {statement ? note(detail.nextClose({ date: date.day(statement.cycle.nextCloseOn) })) : null}
            </KpiCell>
            <KpiCell
                color={INCOME}
                icon={RiWallet3Line}
                label={detail.available}
                value={limit > 0 ? money(available, row.currency) : "–"}
            >
                {limit > 0 ? (
                    <>
                        <span className="bg-app-fill flex h-2 min-w-10 flex-1 overflow-hidden rounded-full">
                            <i
                                className="bg-foreground block h-full rounded-full"
                                style={{ width: `${used * PERCENT}%` }}
                            />
                        </span>
                        <span className="dash-figure text-muted-foreground shrink-0 text-xs">
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
    const data = useMemo(
        () =>
            accountSeries(ledger, row.id, rangeDays(ledger, range)).map((point) => ({
                ...point,
                value: owes ? -point.value : point.value,
            })),
        [ledger, owes, range, row.id]
    );
    const change = ((data.at(-1)?.value ?? 0) - (data[0]?.value ?? 0)) * (owes ? -1 : 1);
    const pill = owes
        ? detail.owed({ amount: money(-change, row.currency, "always") })
        : money(change, row.currency, "always");
    return (
        <Card>
            <div className="dash-card-head max-sm:h-auto max-sm:flex-wrap max-sm:py-3">
                <h2>{detail.history}</h2>
                <Trend tone={toneOf(change)}>{pill}</Trend>
                <div className="ml-auto">
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
                </div>
            </div>
            <div className="px-5 pb-3.5">
                <WorthChart
                    aspectRatio={DETAIL_CHART}
                    currency={row.currency}
                    data={data}
                    label={detail.history.value}
                    range={range}
                />
            </div>
        </Card>
    );
}

function EntryTile({ entry }: { entry: AccountEntry }) {
    if (entry.kind !== "entry") {
        return (
            <span className={ICON_TILE}>
                <RiArrowLeftRightLine size={14} />
            </span>
        );
    }
    return <MerchantTile name={entry.title || "?"} size="lg" />;
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
            <Menu.Trigger className="dash-chip" data-on={on}>
                {icon}
                {label}
            </Menu.Trigger>
            <Menu.Content
                className="app-shell dash-menu ph-no-capture max-h-80 w-[200px] overflow-y-auto"
                sideOffset={6}
            >
                {children}
            </Menu.Content>
        </Menu>
    );
}

const check = (on: boolean) => <RiCheckLine className={`text-app-tint! ml-auto ${on ? "" : "invisible"}`} size={16} />;

function TransactionsCard({ row }: { row: AccountRow }) {
    const { ledger } = useDashboard();
    const { actions, columns, detail, list } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
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
    return (
        <Card>
            <div className="dash-card-head max-sm:h-auto max-sm:flex-wrap max-sm:py-3">
                <h2>{detail.transactions}</h2>
                <span className="dash-figure text-muted-foreground text-[13px]">{shown.length}</span>
                <div className="ml-auto flex items-center gap-2">
                    <ChipMenu
                        icon={<RiCalendarLine className="text-muted-foreground" size={14} />}
                        label={monthName(month)}
                        on={false}
                    >
                        {months.map((key) => (
                            <Menu.Item
                                className="dash-menu-item"
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
                        icon={<RiPriceTag3Line className={chosen ? "" : "text-muted-foreground"} size={14} />}
                        label={chosen?.name ?? detail.category}
                        on={chosen !== undefined}
                    >
                        <Menu.Item className="dash-menu-item" onClick={() => setCategory(null)}>
                            {detail.category}
                            {check(category === null)}
                        </Menu.Item>
                        <div className="dash-menu-rule" />
                        {categories.map((each) => (
                            <Menu.Item className="dash-menu-item" key={each.id} onClick={() => setCategory(each.id)}>
                                <i className="size-1.5 shrink-0 rounded-full" style={{ background: each.color }} />
                                {each.name}
                                {check(category === each.id)}
                            </Menu.Item>
                        ))}
                    </ChipMenu>
                    <Link className="dash-chip" search={{ accounts: row.id, span: "all" }} to="/app/transactions">
                        {actions.seeAll}
                        <RiArrowRightUpLine className="text-muted-foreground" size={14} />
                    </Link>
                </div>
            </div>
            {shown.length === 0 ? (
                <p className="text-muted-foreground border-t px-5 py-8 text-center text-[13px]">
                    {detail.nothingIn({ period: date.month(month) })}
                </p>
            ) : (
                <Table
                    head={[
                        detail.merchant,
                        detail.category,
                        detail.date,
                        detail.amount,
                        ...(foreign ? [columns.inMain({ currency: ledger.currency })] : []),
                        "",
                    ]}
                    numbers={foreign ? 2 : 1}
                >
                    {shown.map((entry) => {
                        const found = entry.categoryId ? ledger.categories.get(entry.categoryId) : undefined;
                        const otherName = entry.other ? (ledger.accounts.get(entry.other)?.name ?? "") : "";
                        let title: ReactNode = entry.title;
                        if (entry.kind === "outbound") {
                            title = list.transferTo({ name: otherName });
                        } else if (entry.kind === "inbound") {
                            title = entry.other ? detail.fromName({ name: otherName }) : detail.transfer;
                        }
                        return (
                            <tr key={entry.id}>
                                <td className={TD}>
                                    <span className="flex min-w-0 items-center gap-2.5 text-sm font-medium">
                                        <EntryTile entry={entry} />
                                        <span className="max-w-[260px] truncate">{title}</span>
                                    </span>
                                </td>
                                <td className={TD}>
                                    {found ? (
                                        <span className="dash-badge">
                                            <u style={{ color: found.color }} />
                                            {found.name}
                                        </span>
                                    ) : (
                                        <span className="dash-badge text-muted-foreground">
                                            {entry.kind === "entry" ? detail.category : detail.transfer}
                                        </span>
                                    )}
                                </td>
                                <td className={`${TD} dash-figure text-muted-foreground`}>{date.day(entry.day)}</td>
                                <td
                                    className={`${TD} ${BALANCE} font-normal ${entry.value > 0 ? "text-app-income" : ""}`}
                                >
                                    {money(entry.value, row.currency, "always")}
                                </td>
                                {foreign ? (
                                    <td className={`${TD} ${BALANCE} text-muted-foreground font-normal`}>
                                        {money(
                                            entry.main ?? inMain(ledger, entry.value, row.currency).value,
                                            ledger.currency,
                                            "always"
                                        )}
                                    </td>
                                ) : null}
                                <td className={`${TD} w-10`}>
                                    <Menu>
                                        <Menu.Trigger
                                            aria-label={detail.transactions.value}
                                            className="text-muted-foreground hover:text-foreground -mr-1 inline-flex size-7 items-center justify-center rounded-lg align-middle"
                                        >
                                            <RiMore2Fill size={17} />
                                        </Menu.Trigger>
                                        <Menu.Content
                                            align="end"
                                            className="app-shell dash-menu ph-no-capture w-[180px]"
                                            sideOffset={4}
                                        >
                                            <PhoneItem>
                                                <RiPencilLine size={16} />
                                                {actions.edit}
                                            </PhoneItem>
                                        </Menu.Content>
                                    </Menu>
                                </td>
                            </tr>
                        );
                    })}
                </Table>
            )}
        </Card>
    );
}

const GHOST_ROWS = [
    [68, 88, 74, 40, 56],
    [78, 78, 58, 40, 70],
    [68, 70, 70, 34, 66],
    [44, 84, 76, 34, 50],
    [90, 80, 52, 36, 66],
    [88, 90, 64, 30, 50],
    [94, 88, 50, 34, 56],
] as const;
const GHOST_COLUMNS = "grid grid-cols-[30%_18%_17%_1fr_auto] items-center gap-2 px-5";

function EmptyEntries() {
    const { detail } = useIntlayer("dashboard-accounts");
    return (
        <Card className="flex-1">
            <div className="dash-card-head">
                <h2>{detail.transactions}</h2>
            </div>
            <div aria-hidden className={`${GHOST_COLUMNS} mt-3 h-9 border-b`}>
                {[48, 44, 42, 40, 40].map((width, index) => (
                    <i className={`dash-gl ${index === 4 ? "justify-self-end" : ""}`} key={index} style={{ width }} />
                ))}
            </div>
            <div aria-hidden className="[mask-image:linear-gradient(#000_55%,transparent)]">
                {GHOST_ROWS.map(([name, badge, day, amount, right], index) => (
                    <div className={`${GHOST_COLUMNS} h-[42px] border-b last:border-0`} key={index}>
                        <span className="flex items-center gap-2.5">
                            <i className="dash-gx" />
                            <i className="dash-gl" style={{ width: name }} />
                        </span>
                        <i className="dash-gl h-[22px]! rounded-md!" style={{ width: badge }} />
                        <i className="dash-gl" style={{ width: day }} />
                        <i className="dash-gl" style={{ width: amount }} />
                        <i className="dash-gl justify-self-end" style={{ width: right }} />
                    </div>
                ))}
            </div>
            <div className="flex flex-col items-center gap-1.5 px-6 pt-6 pb-10 text-center">
                <b className="text-[15px] leading-[22px] font-semibold">{detail.emptyTitle}</b>
                <p className="text-muted-foreground text-[13px]">{detail.emptyBody}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <PhoneButton className="dash-btn">
                        <RiAddLine size={17} />
                        {detail.addEntry}
                    </PhoneButton>
                    <PhoneButton className={OB}>
                        <RiUpload2Line />
                        {detail.importEntries}
                    </PhoneButton>
                </div>
            </div>
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
    let line: ReactNode = detail.checkLine;
    if (row.checkedAt !== null) {
        const offset = ledger.offsetAt(row.checkedAt);
        line =
            age.state === "today"
                ? detail.matchedAt({ time: clockTime(timeOfDay(row.checkedAt, offset)) })
                : detail.matchedOn({ date: date.day(new Date(row.checkedAt + offset).toISOString().slice(0, 10)) });
    }
    return (
        <Card className="flex-row! items-center gap-3 p-4">
            <span
                className="flex size-8 shrink-0 items-center justify-center rounded-[10px]"
                style={{
                    background: `color-mix(in oklab, ${fresh ? INCOME : "var(--color-app-tint)"} 16%, transparent)`,
                    color: fresh ? INCOME : "var(--color-app-tint)",
                }}
            >
                {fresh ? <RiCheckLine size={16} /> : <RiErrorWarningLine size={16} />}
            </span>
            <span className="min-w-0 flex-1">
                <b className="block truncate text-[13px] leading-[18px] font-medium">
                    {age.state === "never" ? detail.checkTitle : titled(checked(age), locale)}
                </b>
                <small className="text-muted-foreground block truncate text-xs leading-4">{line}</small>
            </span>
            <button className="dash-ob" onClick={() => open({ accountId: row.id, kind: "check" })} type="button">
                {detail.check}
            </button>
        </Card>
    );
}

function InstallmentsCard({ row }: { row: AccountRow }) {
    const { ledger } = useDashboard();
    const { actions, list } = useIntlayer("dashboard-accounts");
    const { open } = useAccountFlows();
    const { money } = useDisplayFormat();
    const plans = plansOn(ledger, row.id).filter((plan) => plan.left > 0);
    return (
        <Card>
            <Head
                action={
                    <button
                        className="dash-ob"
                        onClick={() => open({ accountId: row.id, kind: "purchase" })}
                        type="button"
                    >
                        <RiAddLine size={16} />
                        {actions.newPurchase}
                    </button>
                }
                title={list.installments}
            />
            {plans.length === 0 ? null : (
                <div className="flex flex-col gap-4 px-5 pb-[18px]">
                    {plans.map((plan) => (
                        <div key={plan.id}>
                            <div className="flex items-baseline gap-2 text-[13px] font-medium">
                                <span className="min-w-0 truncate">{plan.name || list.planFallback}</span>
                                <span className="dash-figure ml-auto whitespace-nowrap">
                                    {list.planLeft({ amount: money(plan.left, plan.currency) })}
                                </span>
                            </div>
                            <div className="bg-app-fill mt-2.5 flex h-2 overflow-hidden rounded-full">
                                <i
                                    className="bg-foreground block h-full rounded-full"
                                    style={{ width: `${plan.fraction * PERCENT}%` }}
                                />
                            </div>
                            <div className="dash-figure text-muted-foreground mt-2.5 flex text-xs leading-4">
                                {plan.count} x {money(plan.each, plan.currency)}
                                <span className="ml-auto">{list.planPaid({ count: plan.paidCount })}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

function SpentCard({ row }: { row: AccountRow }) {
    const { ledger } = useDashboard();
    const { detail } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const shares = spentByCategory(ledger, row.id, monthStart(ledger.today), ledger.today);
    if (shares.length === 0) {
        return null;
    }
    const total = shares.reduce((sum, share) => sum + share.value, 0);
    return (
        <Card>
            <div className="dash-card-head">
                <h2 className="min-w-0 truncate">{detail.spentFrom({ name: row.name })}</h2>
                <span className="dash-figure text-muted-foreground ml-auto text-[13px]">
                    {money(total, ledger.currency)}
                </span>
            </div>
            <div className="px-5 pb-[18px]">
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
                        <div className="flex h-9 items-center gap-2 border-b text-[13px] last:border-0" key={share.id}>
                            <i className="size-1.5 shrink-0 rounded-full" style={{ background: share.color }} />
                            <span className="min-w-0 truncate">{share.name}</span>
                            <span className="dash-figure ml-auto font-medium">
                                {money(share.value, ledger.currency)}
                            </span>
                            <span className="dash-figure text-muted-foreground w-9 text-right text-xs">
                                {Math.round((share.value / total) * PERCENT)}%
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
    const { detail } = useIntlayer("dashboard-accounts");
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
    }
    const fields: [ReactNode, ReactNode][] = [
        [detail.type, type],
        [detail.currency, row.currency],
    ];
    if (row.currency !== ledger.currency) {
        fields.push([detail.mainCurrency, ledger.currency]);
    }
    fields.push([detail.started, monthYear(row.openedDay)]);
    if (card) {
        fields.push(
            [detail.limit, row.creditLimit === null ? "–" : money(row.creditLimit, row.currency)],
            [detail.statementDay, row.statementDay === null ? "–" : detail.day({ day: row.statementDay })],
            [detail.paymentDay, row.paymentDay === null ? "–" : detail.day({ day: row.paymentDay })]
        );
    } else {
        const count = flowsOf(ledger, row.id).length;
        fields.push([detail.opening, money(row.initialBalance, row.currency)]);
        if (count > 0) {
            fields.push(
                [detail.entries, count.toLocaleString("en-US")],
                [detail.average, average === null ? "–" : money(average, row.currency)]
            );
        }
    }
    return (
        <Card className="flex-1">
            <div className="dash-card-head">
                <h2>{detail.details}</h2>
            </div>
            <div className="px-5 pb-3">
                {fields.map(([label, value], index) => (
                    <div className={FIELD} key={index}>
                        <span className="text-muted-foreground">{label}</span>
                        <span className="dash-figure">{value}</span>
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
                    <Link className="text-foreground underline" to="/app/accounts">
                        {detail.back}
                    </Link>
                </p>
            </main>
        );
    }
    const empty = flowsOf(ledger, row.id).length === 0;
    return (
        <main className="@container min-w-0 px-4 pb-5 sm:px-6">
            <DetailBar row={row} />
            {isCard(row) ? <CardKpis row={row} /> : <BankKpis row={row} />}
            <div className="mt-4 grid grid-cols-1 gap-4 @5xl:grid-cols-[minmax(0,1fr)_332px]">
                <div className="flex min-w-0 flex-col gap-4">
                    {empty ? (
                        <EmptyEntries />
                    ) : (
                        <>
                            <HistoryCard row={row} />
                            <TransactionsCard key={row.id} row={row} />
                        </>
                    )}
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                    <CheckCard row={row} />
                    <UpcomingCard accountId={row.id} />
                    {isCard(row) ? <InstallmentsCard row={row} /> : <SpentCard row={row} />}
                    <DetailsCard row={row} />
                </div>
            </div>
        </main>
    );
}
