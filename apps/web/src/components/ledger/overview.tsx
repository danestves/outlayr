import type { api } from "@outlayr/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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

type Entries = FunctionReturnType<typeof api.ledger.recentTransactions>;
type Summary = FunctionReturnType<typeof api.ledger.spendingSummary>;
type Balances = FunctionReturnType<typeof api.ledger.accountBalances>;
type Budgets = FunctionReturnType<typeof api.ledger.budgetStatus>;
type Upcoming = FunctionReturnType<typeof api.ledger.upcomingCharges>;

/** Signed photo urls by key, minted once the keys are known. */
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

function Tile({
    emoji,
    imageKey,
    name,
    photos,
    size = "md",
}: {
    emoji: string | null;
    imageKey: string | null;
    name: string;
    photos: PhotoUrls;
    size?: "md" | "sm";
}) {
    const url = imageKey ? photos.get(imageKey) : undefined;
    const box = size === "md" ? "size-9 rounded-[10px] text-lg" : "size-7 rounded-lg text-sm";
    if (url) {
        return <img alt="" className={cn(box, "ring-border shrink-0 object-cover ring-1")} src={url} />;
    }
    return (
        <span
            aria-hidden
            className={cn(
                box,
                "bg-secondary text-muted-foreground flex shrink-0 items-center justify-center font-bold"
            )}
        >
            {emoji ?? name.slice(0, 1).toUpperCase()}
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

export function EntryLog({
    currency,
    entries,
    photos,
    today,
}: {
    currency: string;
    entries: Entries;
    photos: PhotoUrls;
    today: string;
}) {
    if (entries.length === 0) {
        return (
            <p className="text-muted-foreground mt-8 text-sm">
                No entries yet. Add one on your phone and it shows up here.
            </p>
        );
    }
    const days = Map.groupBy(entries, (row) => row.date);
    return (
        <section aria-label="Entries" className="pb-10">
            {[...days].map(([day, rows]) => {
                const [first] = rows;
                // A day in several currencies has no honest total without rates, so it shows none.
                const dayCurrency = rows.every((row) => row.currency === first?.currency)
                    ? (first?.currency ?? currency)
                    : null;
                const total = rows.reduce((sum, row) => sum + signed(row), 0);
                return (
                    <div key={day}>
                        <div className="border-border mt-6 flex items-baseline justify-between border-b-[1.3px] pb-1.5">
                            <MonoLabel>{dayLabel(day, today)}</MonoLabel>
                            <span className="text-muted-foreground font-mono text-[13px]">
                                {dayCurrency ? money(total, dayCurrency, "always") : null}
                            </span>
                        </div>
                        <ul>
                            {rows.map((row, index) => {
                                const name = row.note || row.category || "Entry";
                                const detail = [
                                    row.kind === "income" && !row.category ? "Income" : row.category,
                                    row.account,
                                    clockTime(row.time),
                                ]
                                    .filter(Boolean)
                                    .join(" · ");
                                return (
                                    <li
                                        className="flex h-[60px] items-center gap-3"
                                        key={`${day}-${row.time}-${index}`}
                                    >
                                        <Tile emoji={row.emoji} imageKey={row.imageKey} name={name} photos={photos} />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-base leading-[22px] font-semibold">{name}</p>
                                            <p className="text-muted-foreground truncate text-sm font-medium">
                                                {detail}
                                            </p>
                                        </div>
                                        <span
                                            className={cn(
                                                "text-[19px] leading-[25px] font-medium tabular-nums",
                                                row.kind === "income" && "text-app-income"
                                            )}
                                        >
                                            {money(signed(row), row.currency ?? currency, "always")}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                );
            })}
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

const ACCOUNTS_SHOWN = 4;

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
            <ul className="mt-2">
                {balances.accounts.slice(0, ACCOUNTS_SHOWN).map((account) => (
                    <li
                        className="border-secondary flex h-10 items-center gap-2.5 border-b last:border-0"
                        key={account.name}
                    >
                        <Tile
                            emoji={account.emoji}
                            imageKey={account.imageKey}
                            name={account.name}
                            photos={photos}
                            size="sm"
                        />
                        <span className="flex-1 truncate text-[15px] font-semibold">{account.name}</span>
                        <span className="text-[15px] font-medium tabular-nums">
                            {money(account.balance, account.currency)}
                        </span>
                    </li>
                ))}
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

const CHARGES_SHOWN = 3;

export function UpcomingCard({ upcoming }: { upcoming: Upcoming }) {
    if (upcoming.charges.length === 0) {
        return null;
    }
    const monthly = upcoming.monthlyCost.find((bucket) => bucket.currency === upcoming.currency);
    return (
        <RailSection
            aside={monthly ? `${money(monthly.amount, monthly.currency).replace(/\.00$/, "")} a month` : undefined}
            title="Upcoming"
        >
            <ul>
                {upcoming.charges.slice(0, CHARGES_SHOWN).map((charge, index) => (
                    <li
                        className="border-secondary flex h-[52px] items-center justify-between border-b last:border-0"
                        key={`${charge.nextCharge}-${index}`}
                    >
                        <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold">
                                {charge.note || charge.category || "Scheduled"}
                            </p>
                            <MonoLabel className="tracking-[0.08em]">{longDay(charge.nextCharge)}</MonoLabel>
                        </div>
                        <span
                            className={cn(
                                "text-[15px] font-medium tabular-nums",
                                charge.kind === "income" && "text-app-income"
                            )}
                        >
                            {money(signed(charge), charge.currency ?? upcoming.currency, "always")}
                        </span>
                    </li>
                ))}
            </ul>
        </RailSection>
    );
}

export function OverviewSkeleton() {
    return (
        <div aria-busy className="flex flex-col gap-4 pt-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-14 w-64" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-60 w-full" />
        </div>
    );
}
