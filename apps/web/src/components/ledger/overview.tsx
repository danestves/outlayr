import FALLBACK_ICON from "@hugeicons/core-free-icons/MoreHorizontalCircle01Icon";
import FEE_ICON from "@hugeicons/core-free-icons/PercentCircleIcon";
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import type { api } from "@outlayr/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import type { CSSProperties, ReactNode } from "react";

import { CATEGORY_ICONS } from "@/components/ledger/category-icons";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    addDays,
    budgetPace,
    clockTime,
    dayLabel,
    daysBetween,
    longDay,
    money,
    moneyParts,
    shortDay,
} from "@/lib/ledger";
import { cn } from "@/lib/utils";

export type Overview = FunctionReturnType<typeof api.ledger.overview>;
type LogDay = Overview["log"][number];
type LogRow = LogDay["rows"][number];
type EntryRow = Extract<LogRow, { type: "entry" }>;
type TransferRow = Extract<LogRow, { type: "transfer" }>;
type Look = EntryRow["look"];
type AccountLook = NonNullable<TransferRow["from"]>;
type Summary = Overview["summary"];
type Balances = Overview["balances"];
type Budgets = Overview["budgets"];
type Upcoming = Overview["upcoming"];

export type PhotoUrls = ReadonlyMap<string, string>;

export function MonoLabel({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <span
            className={cn(
                "text-muted-foreground font-mono text-[11px] leading-4 tracking-[0.1em] uppercase",
                className
            )}
        >
            {children}
        </span>
    );
}

const FALLBACK_COLOR = "#767676";

const TILE = { badge: "size-5 rounded-[6px]", row: "size-9 rounded-[9px]" } as const;

/** The app's wash-and-glyph tile: a 22% tint behind the glyph, dashed and faded when the money has not moved yet. */
function Tile({
    children,
    color,
    future = false,
    imageUrl,
    size = "row",
}: {
    children?: ReactNode;
    color: string;
    future?: boolean;
    imageUrl?: string;
    size?: keyof typeof TILE;
}) {
    const style: CSSProperties & Record<"--tile", string> = { "--tile": color };
    if (imageUrl) {
        return (
            <img
                alt=""
                className={cn(
                    TILE[size],
                    "shrink-0 border border-[color-mix(in_srgb,var(--tile)_20%,transparent)] object-cover",
                    future && "border-2 border-dashed opacity-60"
                )}
                src={imageUrl}
                style={style}
            />
        );
    }
    return (
        <span
            aria-hidden
            className={cn(
                TILE[size],
                "flex shrink-0 items-center justify-center text-[color-mix(in_oklab,var(--tile)_78%,var(--color-foreground))]",
                future
                    ? "border-2 border-dashed border-[color-mix(in_srgb,var(--tile)_73%,transparent)] opacity-60"
                    : "bg-[color-mix(in_srgb,var(--tile)_22%,transparent)]"
            )}
            style={style}
        >
            {children}
        </span>
    );
}

function Glyph({ icon, size }: { icon: IconSvgElement; size: keyof typeof TILE }) {
    return <HugeiconsIcon icon={icon} size={size === "row" ? 20 : 12} strokeWidth={size === "row" ? 1.9 : 2.2} />;
}

function LookTile({
    fee = false,
    future,
    look,
    photos,
}: {
    fee?: boolean;
    future?: boolean;
    look: Look;
    photos: PhotoUrls;
}) {
    const imageUrl = look.imageKey ? photos.get(look.imageKey) : undefined;
    let glyph: ReactNode;
    if (fee) {
        glyph = <Glyph icon={FEE_ICON} size="row" />;
    } else if (!look.icon && look.emoji) {
        glyph = <span className="text-lg leading-none">{look.emoji}</span>;
    } else {
        glyph = <Glyph icon={(look.icon && CATEGORY_ICONS.get(look.icon)) || FALLBACK_ICON} size="row" />;
    }
    return (
        <Tile color={fee ? FALLBACK_COLOR : (look.color ?? FALLBACK_COLOR)} future={future} imageUrl={imageUrl}>
            {glyph}
        </Tile>
    );
}

const WORDS = /[^\p{L}\p{N}]+/u;

function initials(name: string) {
    const words = name.trim().split(WORDS).filter(Boolean);
    return [words[0], words.length > 1 ? words.at(-1) : undefined]
        .map((word) => [...(word ?? "")][0] ?? "")
        .join("")
        .toLocaleUpperCase();
}

function AccountTile({
    account,
    photos,
    size = "row",
}: {
    account: AccountLook;
    photos: PhotoUrls;
    size?: keyof typeof TILE;
}) {
    const imageUrl = account.imageKey ? photos.get(account.imageKey) : undefined;
    let glyph: ReactNode;
    if (account.person) {
        glyph = (
            <span className={cn("font-semibold", size === "row" ? "text-[15px]" : "text-[9px]")}>
                {initials(account.name)}
            </span>
        );
    } else if (!account.icon && account.emoji) {
        glyph = (
            <span className={size === "row" ? "text-lg leading-none" : "text-[11px] leading-none"}>
                {account.emoji}
            </span>
        );
    } else {
        glyph = <Glyph icon={(account.icon && CATEGORY_ICONS.get(account.icon)) || FALLBACK_ICON} size={size} />;
    }
    return (
        <Tile color={account.color ?? "var(--color-foreground)"} imageUrl={imageUrl} size={size}>
            {glyph}
        </Tile>
    );
}

function TransferTile({ from, photos, to }: { from: AccountLook; photos: PhotoUrls; to: AccountLook }) {
    return (
        <span className="relative shrink-0">
            <AccountTile account={from} photos={photos} />
            <span className="bg-background absolute -right-[7px] -bottom-[7px] rounded-[8px] p-0.5">
                <AccountTile account={to} photos={photos} size="badge" />
            </span>
        </span>
    );
}

function Recurring({ children }: { children: ReactNode }) {
    return (
        <span className="relative shrink-0">
            {children}
            <span className="bg-muted absolute -right-[5px] -bottom-[5px] rounded-md p-[3px]">
                <HugeiconsIcon icon={RefreshIcon} size={12} strokeWidth={2} />
            </span>
        </span>
    );
}

function Figure({ amount, currency }: { amount: number; currency: string }) {
    const { fraction, lead, whole } = moneyParts(amount, currency);
    return (
        <p className="mt-1 flex items-baseline text-[52px] leading-[58px] font-normal tracking-[-0.02em] tabular-nums">
            <small className="text-muted-foreground text-[26px] tracking-normal">{lead}</small>
            {whole}
            <small className="text-muted-foreground text-[26px] tracking-normal">{fraction}</small>
        </p>
    );
}

export function MonthHero({ budgets, summary, today }: { budgets: Budgets; summary: Summary; today: string }) {
    const { overall } = budgets;
    const pace = overall ? budgetPace(overall, today) : null;
    return (
        <section className="mt-6">
            <MonoLabel>Net · this month · {summary.currency}</MonoLabel>
            <Figure amount={summary.income - summary.spent} currency={summary.currency} />
            {overall && pace ? (
                <div className="mt-3.5">
                    <MonoLabel>
                        {overall.name ?? "Monthly limit"} · {money(overall.effectiveLimit, budgets.currency)}
                    </MonoLabel>
                    <div className="relative mt-2">
                        <Progress
                            aria-label="Spent of the limit"
                            className={cn(overall.overBudget && "[&_[data-slot=progress-indicator]]:bg-destructive")}
                            value={pace.spentShare * 100}
                        />
                        <span
                            aria-hidden
                            className="bg-muted-foreground absolute -top-[3px] h-2.5 w-px"
                            style={{ left: `${pace.elapsedShare * 100}%` }}
                        />
                    </div>
                    <div className="text-muted-foreground mt-1.5 flex justify-between font-mono text-xs">
                        <span>
                            {overall.overBudget
                                ? `${money(-overall.remaining, budgets.currency)} over`
                                : `${money(overall.remaining, budgets.currency)} left`}{" "}
                            · {pace.daysLeft === 1 ? "1 day" : `${pace.daysLeft} days`} to go
                        </span>
                        <span>
                            {money(Math.abs(Math.round(pace.underPace)), budgets.currency).replace(/\.00$/, "")}{" "}
                            {pace.underPace >= 0 ? "under" : "over"} pace
                        </span>
                    </div>
                </div>
            ) : null}
            <DailyBars summary={summary} today={today} />
        </section>
    );
}

function DailyBars({ summary, today }: { summary: Summary; today: string }) {
    const spentOn = new Map(summary.spentByDay.map((day) => [day.date, day.amount]));
    const days = Array.from({ length: daysBetween(summary.from, summary.to) + 1 }, (_, index) =>
        addDays(summary.from, index)
    );
    const peak = Math.max(...spentOn.values(), 1);
    const middle = days[Math.floor(days.length / 2)];
    return (
        <figure aria-label="Spending by day" className="mt-6">
            <div className="flex h-16 items-end justify-between gap-[3px]">
                {days.map((day) => {
                    const spent = spentOn.get(day) ?? 0;
                    return (
                        <span
                            className={cn(
                                "min-h-1 max-w-[13px] flex-1 rounded-[4px]",
                                day > today ? "bg-foreground/15" : "bg-foreground"
                            )}
                            key={day}
                            style={{ height: `${(spent / peak) * 100}%` }}
                            title={`${shortDay(day)} · ${money(spent, summary.currency)}`}
                        />
                    );
                })}
            </div>
            <figcaption className="mt-1.5 flex justify-between">
                <MonoLabel>{shortDay(summary.from)}</MonoLabel>
                {middle ? <MonoLabel>{shortDay(middle)}</MonoLabel> : null}
                <MonoLabel>{shortDay(summary.to)}</MonoLabel>
            </figcaption>
        </figure>
    );
}

const signed = (row: { amount: number; kind: "expense" | "income" }) =>
    row.kind === "income" ? row.amount : -row.amount;

type Money = NonNullable<EntryRow["fee"]>;

const inList = (figure: Money, currency: string) =>
    figure.valued === null ? { amount: figure.amount, currency: figure.currency } : { amount: figure.valued, currency };

/** Ports the app's `rowFigure`: a fee in the shown currency is taken in, so a day's rows add up to its header. */
function entryFigure(row: Pick<EntryRow, "amount" | "currency" | "fee" | "kind" | "valued">, currency: string) {
    const shown = inList(row, currency);
    const fee = row.fee ? inList(row.fee, currency) : null;
    if (fee?.currency === shown.currency) {
        const total = shown.amount + (row.kind === "income" ? -fee.amount : fee.amount);
        return { apart: null, currency: shown.currency, feeIn: true, total };
    }
    return { apart: fee, currency: shown.currency, feeIn: false, total: shown.amount };
}

const SUB = "text-muted-foreground truncate text-sm leading-5 font-medium tabular-nums";

function FeeMark() {
    return (
        <HugeiconsIcon aria-label="Fee included" className="text-muted-foreground shrink-0" icon={FEE_ICON} size={14} />
    );
}

function CodeMark({ code }: { code: string }) {
    return (
        <span className="border-border text-muted-foreground rounded-[3px] border px-[3px] font-mono text-[10px] leading-[14px] tracking-[0.08em]">
            {code}
        </span>
    );
}

function Row({
    amount,
    detail,
    tile,
    title,
    under,
}: {
    amount: ReactNode;
    detail: ReactNode;
    tile: ReactNode;
    title: string;
    under?: ReactNode;
}) {
    return (
        <li className="flex min-h-[60px] items-center gap-3 py-2">
            {tile}
            <div className="min-w-0 flex-1">
                <p className="truncate text-base leading-[22px] font-medium">{title}</p>
                <div className="flex min-w-0 items-center gap-1.5">{detail}</div>
            </div>
            <div className="flex shrink-0 flex-col items-end">
                {amount}
                {under}
            </div>
        </li>
    );
}

function EntryLine({ currency, photos, row }: { currency: string; photos: PhotoUrls; row: EntryRow }) {
    const figure = entryFigure(row, currency);
    const original = row.valued === null ? null : money(row.amount, row.currency);
    const tile = <LookTile fee={row.isFee} look={row.look} photos={photos} />;
    return (
        <Row
            amount={
                <span
                    className={cn(
                        "text-lg leading-6 font-medium tabular-nums",
                        row.kind === "income" && "text-app-income"
                    )}
                >
                    {money(signed({ amount: figure.total, kind: row.kind }), figure.currency, "always")}
                </span>
            }
            detail={
                <>
                    <span className={SUB}>{[row.account, clockTime(row.time)].filter(Boolean).join(" · ")}</span>
                    {figure.feeIn ? <FeeMark /> : null}
                    {row.currency !== currency && original === null ? <CodeMark code={row.currency} /> : null}
                </>
            }
            tile={row.recurring ? <Recurring>{tile}</Recurring> : tile}
            title={row.note || row.category || "Entry"}
            under={
                <>
                    {original ? <span className={SUB}>{original}</span> : null}
                    {figure.apart ? (
                        <span className={SUB}>Fee {money(figure.apart.amount, figure.apart.currency)}</span>
                    ) : null}
                </>
            }
        />
    );
}

function TransferLine({ photos, row }: { photos: PhotoUrls; row: TransferRow }) {
    const moved = row.fees.length > 0 || row.arrivedCurrency !== row.sentCurrency;
    const { from, to } = row;
    return (
        <Row
            amount={
                <span className="text-lg leading-6 font-medium tabular-nums">{money(row.sent, row.sentCurrency)}</span>
            }
            detail={
                <>
                    <span className={SUB}>{clockTime(row.time)}</span>
                    {row.fees.length > 0 ? <FeeMark /> : null}
                </>
            }
            tile={
                from && to ? (
                    <TransferTile from={from} photos={photos} to={to} />
                ) : (
                    <LookTile look={{ color: null, emoji: null, icon: "Exchange01", imageKey: null }} photos={photos} />
                )
            }
            title={row.note}
            under={moved ? <span className={SUB}>→ {money(row.arrived, row.arrivedCurrency)}</span> : null}
        />
    );
}

function DayTotals({ totals }: { totals: LogDay["totals"] }) {
    return (
        <span className="text-muted-foreground flex items-baseline gap-1.5 text-[13px] font-semibold tabular-nums">
            {totals.map((bucket, index) => (
                <span className="flex items-baseline gap-1.5" key={bucket.currency}>
                    {index > 0 ? <span className="opacity-70">/</span> : null}
                    {money(bucket.amount, bucket.currency, "always")}
                </span>
            ))}
        </span>
    );
}

export function EntryLog({
    currency,
    log,
    photos,
    today,
}: {
    currency: string;
    log: Overview["log"];
    photos: PhotoUrls;
    today: string;
}) {
    if (log.length === 0) {
        return (
            <p className="text-muted-foreground mt-8 text-sm">
                No entries yet. Add one on your phone and it shows up here.
            </p>
        );
    }
    return (
        <section aria-label="Entries" className="pb-10">
            {log.map((day) => (
                <div key={day.date}>
                    <div className="border-border mt-7 flex items-baseline justify-between gap-2 border-b-[1.3px] pb-1.5">
                        <MonoLabel>{dayLabel(day.date, today)}</MonoLabel>
                        <DayTotals totals={day.totals} />
                    </div>
                    <ul>
                        {day.rows.map((row) =>
                            row.type === "transfer" ? (
                                <TransferLine key={row.id} photos={photos} row={row} />
                            ) : (
                                <EntryLine currency={currency} key={row.id} photos={photos} row={row} />
                            )
                        )}
                    </ul>
                </div>
            ))}
        </section>
    );
}

function RailSection({ aside, children, title }: { aside?: ReactNode; children: ReactNode; title: string }) {
    return (
        <section>
            <div className="border-foreground flex items-baseline justify-between border-b-[1.5px] pb-1.5">
                <h2 className="text-[17px] leading-[22px] font-bold tracking-[-0.01em]">{title}</h2>
                {aside ? <span className="text-app-tint text-sm font-semibold">{aside}</span> : null}
            </div>
            {children}
        </section>
    );
}

const ACCOUNTS_SHOWN = 6;

export function AccountsCard({ balances, photos }: { balances: Balances; photos: PhotoUrls }) {
    return (
        <RailSection
            aside={balances.accounts.length > ACCOUNTS_SHOWN ? `${balances.accounts.length} in all` : undefined}
            title="Accounts"
        >
            <div className="mt-3 flex justify-between">
                <div className="flex flex-col gap-0.5">
                    <MonoLabel>Have</MonoLabel>
                    <strong className="text-xl tracking-[-0.01em] tabular-nums">
                        {money(balances.owned, balances.currency)}
                    </strong>
                </div>
                <div className="flex flex-col gap-0.5 text-right">
                    <MonoLabel>Owe</MonoLabel>
                    <strong className="text-xl tracking-[-0.01em] tabular-nums">
                        {money(balances.owed, balances.currency)}
                    </strong>
                </div>
            </div>
            <ul className="mt-1">
                {balances.accounts.slice(0, ACCOUNTS_SHOWN).map((account, index) => {
                    const foreign = account.currency !== balances.currency;
                    return (
                        <li className="flex min-h-[52px] items-center gap-3 py-1.5" key={`${index}-${account.name}`}>
                            <AccountTile account={account.look} photos={photos} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[15px] leading-5 font-medium">{account.name}</p>
                                {foreign ? <p className={SUB}>{money(account.balance, account.currency)}</p> : null}
                            </div>
                            <span className="flex shrink-0 items-baseline gap-1.5">
                                {account.exact ? null : <CodeMark code={`${balances.currency}?`} />}
                                <span className="text-[15px] font-medium tabular-nums">
                                    {money(account.balanceInMainCurrency, balances.currency)}
                                </span>
                            </span>
                        </li>
                    );
                })}
            </ul>
        </RailSection>
    );
}

const BUDGETS_SHOWN = 3;

export function BudgetsCard({ budgets }: { budgets: Budgets }) {
    if (budgets.categories.length === 0) {
        return null;
    }
    const over = budgets.categories.filter((budget) => budget.overBudget).length;
    const shown = budgets.categories
        .toSorted((a, b) => Number(b.overBudget) - Number(a.overBudget))
        .slice(0, BUDGETS_SHOWN);
    return (
        <RailSection
            aside={
                over > 0 ? (
                    <Badge variant="destructive">{`${over} of ${budgets.categories.length} over`}</Badge>
                ) : undefined
            }
            title="Budgets"
        >
            <ul>
                {shown.map((budget) => {
                    const name = budget.name ?? budget.category ?? "Budget";
                    const share = budget.effectiveLimit > 0 ? Math.min(budget.spent / budget.effectiveLimit, 1) : 1;
                    return (
                        <li className="border-secondary border-b py-2.5 last:border-0" key={`${name}-${budget.from}`}>
                            <div className="flex items-baseline justify-between">
                                <span className="text-[15px] font-semibold">{name}</span>
                                <span
                                    className={cn(
                                        "text-[15px] font-semibold tabular-nums",
                                        budget.overBudget && "text-destructive"
                                    )}
                                >
                                    {money(Math.abs(budget.remaining), budgets.currency)}{" "}
                                    <small
                                        className={cn(
                                            "text-[13px] font-medium",
                                            !budget.overBudget && "text-muted-foreground"
                                        )}
                                    >
                                        {budget.overBudget ? "over" : "left"}
                                    </small>
                                </span>
                            </div>
                            <Progress
                                aria-label={`${name} spent`}
                                className={cn(
                                    "mt-2",
                                    budget.overBudget && "[&_[data-slot=progress-indicator]]:bg-destructive"
                                )}
                                value={share * 100}
                            />
                        </li>
                    );
                })}
            </ul>
        </RailSection>
    );
}

const CHARGES_SHOWN = 4;

const CADENCES = new Map([
    ["daily", { label: "Daily", unit: "days" }],
    ["weekly", { label: "Weekly", unit: "weeks" }],
    ["monthly", { label: "Monthly", unit: "months" }],
    ["yearly", { label: "Yearly", unit: "years" }],
]);

function cadenceLabel(cadence: string | null, every: number) {
    const known = cadence === null ? undefined : CADENCES.get(cadence);
    if (!known) {
        return null;
    }
    return every > 1 ? `Every ${every} ${known.unit}` : known.label;
}

export function UpcomingCard({
    currency,
    photos,
    upcoming,
}: {
    currency: string;
    photos: PhotoUrls;
    upcoming: Upcoming;
}) {
    if (upcoming.charges.length === 0) {
        return null;
    }
    const monthly = upcoming.monthlyCost.find((bucket) => bucket.currency === upcoming.currency);
    return (
        <RailSection
            aside={monthly ? `${money(monthly.amount, monthly.currency).replace(/\.00$/, "")} a month` : undefined}
            title="Upcoming"
        >
            <ul className="mt-1">
                {upcoming.charges.slice(0, CHARGES_SHOWN).map((charge) => {
                    const figure = entryFigure(charge, currency);
                    const cadence = cadenceLabel(charge.cadence, charge.every);
                    return (
                        <li className="flex min-h-[52px] items-center gap-3 py-1.5" key={charge.id}>
                            <LookTile future look={charge.look} photos={photos} />
                            <div className="min-w-0 flex-1">
                                <p className="text-muted-foreground truncate text-[15px] leading-5 font-medium">
                                    {charge.note || "Scheduled"}
                                </p>
                                <p className={SUB}>
                                    {[longDay(charge.nextCharge), cadence].filter(Boolean).join(" · ")}
                                </p>
                            </div>
                            <span
                                className={cn(
                                    "text-muted-foreground shrink-0 text-[15px] font-medium tabular-nums",
                                    charge.kind === "income" && "text-app-income"
                                )}
                            >
                                {money(signed({ amount: figure.total, kind: charge.kind }), figure.currency, "always")}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </RailSection>
    );
}
