import ArrowRight from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { useContext } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LedgerSettingsContext } from "@/lib/ledger-settings";

import type { Standout } from "./answers";
import { CategoryTile } from "./category-tile";
import { KEPT_COLOR } from "./flow";
import { useInsightsFormat } from "./format";
import type { InsightsModel } from "./model";

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
            className="border-border hover:bg-muted block border-b px-5 py-4"
            search={(previous) => ({ ...previous, category: target?.topId ?? card.categoryId })}
            to="/app"
        >
            <span className="flex items-center gap-2">
                <CategoryTile color={category?.color ?? KEPT_COLOR} look={model.looks.get(card.categoryId)} />
                <span className="text-[13px] font-semibold">{category?.name}</span>
            </span>
            <span className="mt-2 block font-mono text-[22px] leading-7 font-semibold">
                {figureOf(card, copy, fmt)}
            </span>
            <span className="text-muted-foreground mt-1 block text-[13px] leading-[18px]">
                {sentenceOf(card, copy, fmt, model.closed)}
            </span>
        </Link>
    );
}

function EverythingRow({ children, hash, value }: { children: ReactNode; hash?: string; value?: string }) {
    return (
        <Link
            className="border-border hover:bg-muted flex h-9 items-center justify-between gap-3 border-b px-5 text-[13px]"
            hash={hash}
            search={(previous) => ({ ...previous, category: undefined })}
            to={hash ? "." : "/app"}
        >
            <span>{children}</span>
            <span className="text-muted-foreground flex items-center gap-2 font-mono text-xs">
                {value}
                <HugeiconsIcon className="size-3.5" icon={ArrowRight} />
            </span>
        </Link>
    );
}

export function InsightsPanel({ model }: { model: InsightsModel }) {
    const { ledger } = useDashboard();
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const copy = useIntlayer("dashboard-insights");
    const fmt = useInsightsFormat(ledger);
    const { cards, daily, flow, spend } = model;
    return (
        <div>
            <h2 className="border-border flex h-[52px] items-center border-b px-5 text-[15px] font-semibold">
                {copy.standsOut.title}
            </h2>
            {cards.length === 0 ? (
                <p className="text-muted-foreground border-border border-b px-5 py-4 text-[13px]">
                    {copy.standsOut.empty}
                </p>
            ) : (
                cards.map((card) => <StandoutCard card={card} key={`${card.kind}:${card.categoryId}`} model={model} />)
            )}
            <h3 className="text-muted-foreground px-5 pt-4 pb-2 text-xs">{copy.everything.title}</h3>
            <EverythingRow value={String(spend.length)}>{copy.everything.allCategories}</EverythingRow>
            {incomeTracking ? (
                <EverythingRow hash="cash-flow" value={fmt.signed(flow.kept)}>
                    {copy.everything.incomeNet}
                </EverythingRow>
            ) : null}
            <EverythingRow hash="daily-spend" value={copy.daily.average({ amount: fmt.amount(daily.average) }).value}>
                {copy.everything.byDay}
            </EverythingRow>
        </div>
    );
}
