import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useContext } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LedgerSettingsContext } from "@/lib/ledger-settings";

import type { Standout } from "./answers";
import { KEPT_COLOR } from "./flow";
import { useInsightsFormat } from "./format";
import type { InsightsModel } from "./model";
import { FIGURE, NOTE } from "./parts";
import { Key, Nothing, PhoneCard } from "./phone/card";

const ITEM =
    "group/row relative not-first:before:bg-border not-first:before:absolute not-first:before:inset-x-[15px] not-first:before:top-0 not-first:before:h-px";
const ROW = "block px-[15px] pt-4 pb-[5px] group-first/row:pt-3.5";

type Copy = ReturnType<typeof useIntlayer<"dashboard-insights">>;
type Format = ReturnType<typeof useInsightsFormat>;

function sentenceOf(card: Standout, copy: Copy, fmt: Format, closed: boolean) {
    if (card.kind === "versus") {
        const usual = closed ? copy.standsOut.usual : copy.standsOut.usualByNow;
        return usual({ amount: fmt.amount(card.usual) }).value;
    }
    const { biggest, budget } = card;
    if (budget.runOut) {
        const { day, daysEarly } = budget.runOut;
        return daysEarly === 1
            ? copy.standsOut.ranOutOne({ date: fmt.day(day) }).value
            : copy.standsOut.ranOut({ date: fmt.day(day), days: String(daysEarly) }).value;
    }
    if (!biggest) {
        return "";
    }
    const amount = fmt.amount(biggest.amount);
    const date = fmt.day(biggest.day);
    return biggest.note
        ? copy.standsOut.biggest({ amount, date, name: biggest.note }).value
        : copy.standsOut.biggestUnnamed({ amount, date }).value;
}

function figureOf(card: Standout, copy: Copy, fmt: Format) {
    if (card.kind === "overBudget") {
        return copy.standsOut.over({ amount: fmt.amount(card.impact) }).value;
    }
    const amount = fmt.amount(card.gap);
    return (card.under ? copy.standsOut.less({ amount }) : copy.standsOut.more({ amount })).value;
}

interface LinesProps {
    color: string;
    figure: ReactNode;
    name: ReactNode;
    note: ReactNode;
    tone: string;
}

function Lines({ color, figure, name, note, tone }: LinesProps) {
    return (
        <>
            <span className="flex h-5 items-center gap-[9px] text-sm font-medium">
                <Key color={color} />
                <span className="min-w-0 truncate">{name}</span>
                <span className={`${FIGURE} ml-auto pl-2 whitespace-nowrap ${tone}`}>{figure}</span>
            </span>
            {note ? <span className={`${NOTE} mt-0.5 block first-letter:uppercase`}>{note}</span> : null}
        </>
    );
}

function StandoutRow({ card, closed }: { card: Standout; closed: boolean }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights");
    const fmt = useInsightsFormat(ledger);
    const target = ledger.budgetTargets.get(card.categoryId);
    const category = target ?? ledger.categories.get(card.categoryId);
    const under = card.kind === "versus" && card.under;
    return (
        <li className={ITEM}>
            <Link
                className={`${ROW} hover:bg-app-hover`}
                search={(previous) => ({ ...previous, category: target?.topId ?? card.categoryId })}
                to="/app"
            >
                <Lines
                    color={category?.color ?? KEPT_COLOR}
                    figure={figureOf(card, copy, fmt)}
                    name={category?.name}
                    note={sentenceOf(card, copy, fmt, closed)}
                    tone={under ? "text-success" : "text-destructive"}
                />
            </Link>
        </li>
    );
}

function streakOf(model: InsightsModel, copy: Copy, fmt: Format) {
    const streak = model.keptStreak;
    if (streak === null) {
        return null;
    }
    const lowest = streak.kind === "lowest";
    if (streak.since === null) {
        return (lowest ? copy.standsOut.keptLowest : copy.standsOut.keptHighest)({ count: String(streak.months) })
            .value;
    }
    const month = fmt.longMonth(`${streak.since}-15`);
    return (lowest ? copy.standsOut.keptLowestSince : copy.standsOut.keptHighestSince)({ month }).value;
}

function KeptRow({ model }: { model: InsightsModel }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights");
    const fmt = useInsightsFormat(ledger);
    const usual =
        model.usualKept === null
            ? null
            : copy.standsOut.keptUsual({ percent: String(Math.round(model.usualKept * 100)) }).value;
    const { income, kept } = model.flow;
    return (
        <li className={ITEM}>
            <div className={ROW}>
                <Lines
                    color={KEPT_COLOR}
                    figure={copy.standsOut.kept({ percent: String(Math.round((kept / income) * 100)) })}
                    name={copy.measures.kept}
                    note={[usual, streakOf(model, copy, fmt)].filter(Boolean).join(", ")}
                    tone="text-muted-foreground"
                />
            </div>
        </li>
    );
}

export function StandoutsCard({ model }: { model: InsightsModel }) {
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const copy = useIntlayer("dashboard-insights");
    const showKept = incomeTracking && model.flow.income > 0;
    const cards = model.cards.slice(0, showKept ? 2 : 3);
    const empty = cards.length === 0 && !showKept;
    return (
        <PhoneCard title={copy.standsOut.title}>
            {empty ? (
                <Nothing>{copy.standsOut.empty}</Nothing>
            ) : (
                <ul className="pb-[17px]">
                    {cards.map((card) => (
                        <StandoutRow card={card} closed={model.closed} key={`${card.kind}:${card.categoryId}`} />
                    ))}
                    {showKept ? <KeptRow model={model} /> : null}
                </ul>
            )}
        </PhoneCard>
    );
}
