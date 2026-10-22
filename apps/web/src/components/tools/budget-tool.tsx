import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { BUDGET_SPLITS, PER_YEAR, formatAmount, parseAmount, splitBudget } from "@/lib/calculators";
import type { BudgetSplit } from "@/lib/calculators";

import { AmountInput, Choice, CurrencyField, Field, Fields, Figure, LABEL, ToolPanel, useCadences } from "./tool-kit";

const SLUG = "50-30-20-budget-calculator";
const CADENCES = ["week", "twoWeeks", "month", "year"] as const;
const SPLITS = ["50-30-20", "60-20-20", "70-20-10"] as const satisfies readonly BudgetSplit[];
const SPLIT_OPTIONS = SPLITS.map((split) => ({ label: split.replaceAll("-", "/"), value: split }));
const CELL = "py-4 pl-4 text-right font-mono whitespace-nowrap";

type Every = (typeof CADENCES)[number];

export function BudgetTool() {
    const { labels, pages } = useIntlayer("tools");
    const page = pages[SLUG];
    const cadences = useCadences(CADENCES);
    const [code, setCode] = useState("USD");
    const [income, setIncome] = useState("3000");
    const [every, setEvery] = useState<Every>("month");
    const [split, setSplit] = useState<BudgetSplit>("50-30-20");

    const yearly = parseAmount(income, code) * PER_YEAR[every];
    const month = splitBudget(Math.round(yearly / 12), split);
    const year = splitBudget(yearly, split);
    const figure = (index: number) => <Figure code={code} minor={month[index] ?? 0} />;

    return (
        <>
            <ToolPanel answer={page.answer({ needs: figure(0), savings: figure(2), wants: figure(1) })} tool={SLUG}>
                <Fields className="grid-cols-2 md:grid-cols-4">
                    <Field label={page.fields.income}>
                        <AmountInput code={code} onChange={setIncome} value={income} />
                    </Field>
                    <Field label={labels.every}>
                        <Choice onChange={setEvery} options={cadences} value={every} />
                    </Field>
                    <Field label={page.fields.split}>
                        <Choice onChange={setSplit} options={SPLIT_OPTIONS} value={split} />
                    </Field>
                    <CurrencyField onChange={setCode} value={code} />
                </Fields>
            </ToolPanel>
            <table className="mt-8 w-full" data-reveal>
                <thead>
                    <tr className="border-border border-b">
                        <th className="py-3 text-left" scope="col">
                            <span className="sr-only">{page.fields.split}</span>
                        </th>
                        <th className={`${LABEL} py-3 pl-4 text-right font-normal`} scope="col">
                            {page.columns.share}
                        </th>
                        <th className={`${LABEL} py-3 pl-4 text-right font-normal`} scope="col">
                            {page.columns.month}
                        </th>
                        <th className={`${LABEL} hidden py-3 pl-4 text-right font-normal sm:table-cell`} scope="col">
                            {page.columns.year}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {page.buckets.map((bucket, index) => (
                        <tr className="border-border border-b align-top" key={bucket.name.value}>
                            <th className="py-4 text-left font-normal" scope="row">
                                <span className="font-semibold">{bucket.name}</span>
                                <span className="text-muted mt-1 block text-sm">{bucket.text}</span>
                            </th>
                            <td className={CELL}>{BUDGET_SPLITS[split][index]}%</td>
                            <td className={CELL}>{formatAmount(month[index] ?? 0, code)}</td>
                            <td className={`${CELL} hidden sm:table-cell`}>{formatAmount(year[index] ?? 0, code)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}
