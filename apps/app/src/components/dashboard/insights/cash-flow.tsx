import { Link } from "@tanstack/react-router";
import { useContext, useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LedgerSettingsContext } from "@/lib/ledger-settings";

import { KEPT_COLOR, flowOf } from "./flow";
import type { Band, FlowRow } from "./flow";
import { useInsightsFormat } from "./format";
import type { InsightsModel } from "./model";
import { FIGURE } from "./parts";
import { Aside, Key, MONO, Nothing, PhoneCard } from "./phone/card";
import { Sankey } from "./phone/sankey";

const CELL = "border-border border-b p-0 group-last/row:border-b-0";
const AMOUNT = `${CELL} ${MONO} pl-2.5 text-right whitespace-nowrap`;
// Zero max-width lets the name truncate while the money columns grow to fit a longer language.
const NAME = `${CELL} max-w-0 text-left font-normal`;

type Copy = ReturnType<typeof useIntlayer<"dashboard-insights">>;
type Format = ReturnType<typeof useInsightsFormat>;

function bandName(band: Band, copy: Copy) {
    if (band.kind === "savings") {
        return copy.cashFlow.savings.value;
    }
    return band.name ?? copy.changes.other.value;
}

function Legend({ bands, fmt }: { bands: readonly Band[]; fmt: Format }) {
    const copy = useIntlayer("dashboard-insights");
    return (
        <ul className="text-muted-foreground mx-[15px] flex flex-wrap gap-x-1.5 gap-y-1 text-[13px] leading-5">
            {bands.map((band) => (
                <li className="flex min-w-0 items-center gap-2" key={band.id}>
                    <Key color={band.color} />
                    <span className="truncate">
                        {`${bandName(band, copy)} `}
                        <span className={FIGURE}>{fmt.whole(band.amount)}</span>
                    </span>
                </li>
            ))}
        </ul>
    );
}

function LeftCell({ categoryId, fmt, model }: { categoryId: string; fmt: Format; model: InsightsModel }) {
    const copy = useIntlayer("dashboard-insights");
    const budget = model.budgets.get(categoryId);
    if (!model.budgeted) {
        return <td aria-hidden className={CELL} />;
    }
    if (!budget) {
        return <td className={`${AMOUNT} text-muted-foreground`}>{copy.budget.none}</td>;
    }
    return (
        <td className={`${AMOUNT} ${budget.overBudget ? "text-destructive" : "text-muted-foreground"}`}>
            {fmt.amount(budget.remaining)}
        </td>
    );
}

function CategoryRow({ fmt, model, row }: { fmt: Format; model: InsightsModel; row: FlowRow }) {
    const { ledger } = useDashboard();
    const category = ledger.categories.get(row.id);
    return (
        <tr className="group/row hover:bg-app-hover relative h-[38px]">
            <th className={NAME} scope="row">
                <span className="flex min-w-0 items-center gap-[9px]">
                    <Key color={category?.color ?? KEPT_COLOR} />
                    <Link
                        className="truncate before:absolute before:inset-0"
                        search={(previous) => ({ ...previous, category: row.id })}
                        to="/"
                    >
                        {category?.name}
                    </Link>
                </span>
            </th>
            <td className={AMOUNT}>{fmt.amount(row.amount)}</td>
            <LeftCell categoryId={row.id} fmt={fmt} model={model} />
        </tr>
    );
}

function KeptRow({ fmt, model, row }: { fmt: Format; model: InsightsModel; row: FlowRow }) {
    const { measures } = useIntlayer("dashboard-insights");
    const share = model.flow.income > 0 ? Math.round((row.amount / model.flow.income) * 100) : 0;
    return (
        <tr className="group/row h-[38px]">
            <th className={NAME} scope="row">
                <span className="flex min-w-0 items-center gap-[9px]">
                    <Key color={KEPT_COLOR} />
                    <span className="truncate">{measures.kept}</span>
                </span>
            </th>
            <td className={AMOUNT}>{fmt.amount(row.amount)}</td>
            <td className={`${AMOUNT} text-muted-foreground`}>{`${share}%`}</td>
        </tr>
    );
}

function FlowTable({ fmt, model, rows }: { fmt: Format; model: InsightsModel; rows: readonly FlowRow[] }) {
    const { table } = useIntlayer("dashboard-insights");
    return (
        <div className="px-[15px]">
            <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                    <tr className="text-muted-foreground h-7 text-[13px]">
                        <th className="border-border w-full border-b p-0 text-left font-normal" scope="col">
                            {table.category}
                        </th>
                        <th
                            className="border-border min-w-[90px] border-b p-0 pl-2.5 text-right font-normal"
                            scope="col"
                        >
                            {table.spent}
                        </th>
                        <th className="border-border min-w-24 border-b p-0 pl-2.5 text-right font-normal" scope="col">
                            {model.budgeted ? table.left : null}
                        </th>
                    </tr>
                </thead>
                <tbody className="before:block before:h-[5px]">
                    {rows.map((row) =>
                        row.kind === "kept" ? (
                            <KeptRow fmt={fmt} key={row.id} model={model} row={row} />
                        ) : (
                            <CategoryRow fmt={fmt} key={row.id} model={model} row={row} />
                        )
                    )}
                </tbody>
            </table>
        </div>
    );
}

export function CashFlowCard({ model }: { model: InsightsModel }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights");
    const fmt = useInsightsFormat(ledger);
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const { rows, sources, targets } = useMemo(() => flowOf(model.flow), [model.flow]);
    const { income, kept, spent } = model.flow;
    if (!incomeTracking) {
        return (
            <PhoneCard title={copy.trend.spending}>
                {spent === 0 ? (
                    <Nothing>{copy.empty.spending}</Nothing>
                ) : (
                    <div className="pt-1 pb-3">
                        <FlowTable fmt={fmt} model={model} rows={rows.filter((row) => row.kind === "category")} />
                    </div>
                )}
            </PhoneCard>
        );
    }
    if (income === 0 && spent === 0) {
        return (
            <PhoneCard title={copy.cashFlow.title}>
                <Nothing>{copy.empty.cashFlow}</Nothing>
            </PhoneCard>
        );
    }
    return (
        <PhoneCard
            aside={
                <Aside
                    label={(kept < 0 ? copy.measures.savings : copy.measures.kept).value}
                    value={fmt.whole(Math.abs(kept))}
                />
            }
            title={copy.cashFlow.title}
        >
            <div className="pt-3.5 pb-3">
                <Legend bands={sources} fmt={fmt} />
                <div className="mt-[18px] mb-[27px]">
                    <Sankey label={copy.cashFlow.title.value} sources={sources} targets={targets} />
                </div>
                <FlowTable fmt={fmt} model={model} rows={rows} />
            </div>
        </PhoneCard>
    );
}
