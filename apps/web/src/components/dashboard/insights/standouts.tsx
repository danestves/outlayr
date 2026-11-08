import { Link } from "@tanstack/react-router";
import { useContext } from "react";
import { useIntlayer } from "react-intlayer";

import { CardFrame } from "@/components/dashboard/home/card-frame";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LedgerSettingsContext } from "@/lib/ledger-settings";

import type { Standout } from "./answers";
import { CategoryTile } from "./category-tile";
import { KEPT_COLOR } from "./flow";
import { useInsightsFormat } from "./format";
import type { InsightsModel } from "./model";

const CELL = "block min-w-0 px-4 py-3.5 max-md:not-last:border-b md:not-last:border-r";

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

function StandoutCard({ card, model }: { card: Standout; model: InsightsModel }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights");
    const fmt = useInsightsFormat(ledger);
    const target = ledger.budgetTargets.get(card.categoryId);
    const category = target ?? ledger.categories.get(card.categoryId);
    return (
        <Link
            className={`${CELL} hover:bg-muted`}
            search={(previous) => ({ ...previous, category: target?.topId ?? card.categoryId })}
            to="/app"
        >
            <span className="flex items-center gap-2">
                <CategoryTile color={category?.color ?? KEPT_COLOR} look={model.looks.get(card.categoryId)} />
                <span className="text-sm font-medium">{category?.name}</span>
            </span>
            <span
                className={`mt-2 block font-mono text-xl leading-7 font-medium ${card.kind === "overBudget" || !card.under ? "text-destructive" : "text-success"}`}
            >
                {figureOf(card, copy, fmt)}
            </span>
            <span className="text-muted-foreground mt-1 block text-sm leading-5">
                {sentenceOf(card, copy, fmt, model.closed)}
            </span>
        </Link>
    );
}

function streakLine(model: InsightsModel, copy: Copy, fmt: Format) {
    const streak = model.keptStreak;
    if (streak === null) {
        return null;
    }
    const lowest = streak.kind === "lowest";
    if (streak.since === null) {
        return (lowest ? copy.standsOut.keptLowest : copy.standsOut.keptHighest)({ count: String(streak.months) })
            .value;
    }
    const month = fmt.month(streak.since);
    return (lowest ? copy.standsOut.keptLowestSince : copy.standsOut.keptHighestSince)({ month }).value;
}

function KeptCell({ model }: { model: InsightsModel }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights");
    const fmt = useInsightsFormat(ledger);
    const usual =
        model.usualKept === null
            ? null
            : copy.standsOut.keptUsual({ percent: String(Math.round(model.usualKept * 100)) }).value;
    const note = [usual, streakLine(model, copy, fmt)].filter(Boolean).join(" ");
    const { income, kept } = model.flow;
    const percent = Math.round((kept / income) * 100);
    return (
        <div className={CELL}>
            <span className="flex items-center gap-2">
                <span aria-hidden className="size-5 shrink-0 rounded-md" style={{ backgroundColor: KEPT_COLOR }} />
                <span className="text-sm font-medium">{copy.measures.kept}</span>
            </span>
            <span className="mt-2 block font-mono text-xl leading-7 font-medium">
                {copy.standsOut.kept({ percent: String(percent) })}
            </span>
            {note ? <span className="text-muted-foreground mt-1 block text-sm leading-5">{note}</span> : null}
        </div>
    );
}

export function StandoutsCard({ model }: { model: InsightsModel }) {
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const copy = useIntlayer("dashboard-insights");
    const showKept = incomeTracking && model.flow.income > 0;
    const cards = model.cards.slice(0, showKept ? 2 : 3);
    const empty = cards.length === 0 && !showKept;
    return (
        <CardFrame title={copy.standsOut.title}>
            {empty ? (
                <p className="text-muted-foreground p-4 text-sm">{copy.standsOut.empty}</p>
            ) : (
                <div className="grid md:auto-cols-fr md:grid-flow-col">
                    {cards.map((card) => (
                        <StandoutCard card={card} key={`${card.kind}:${card.categoryId}`} model={model} />
                    ))}
                    {showKept ? <KeptCell model={model} /> : null}
                </div>
            )}
        </CardFrame>
    );
}
