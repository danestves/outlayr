import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { formatAmount, installmentCost, parseAmount } from "@/lib/calculators";

import {
    AmountInput,
    AppCard,
    AppRows,
    BARE,
    Choice,
    CurrencyField,
    Field,
    Fields,
    Figure,
    ToolPanel,
    useCadences,
} from "./tool-kit";

const SLUG = "installment-calculator";
const CADENCES = ["week", "twoWeeks", "month"] as const;
const MAX_PAYMENTS = 600;
const MAX_PERCENT = 9999;

type Every = (typeof CADENCES)[number];

function formatRate(rate: number): string {
    const percent = rate * 100;
    if (percent > MAX_PERCENT) {
        return `>${MAX_PERCENT}%`;
    }
    const shown = Number(percent.toFixed(percent < 100 ? 1 : 0));
    return shown === 0 && percent > 0 ? "<0.1%" : `${shown}%`;
}

export function InstallmentTool() {
    const { labels, pages } = useIntlayer("tools");
    const page = pages[SLUG];
    const cadences = useCadences(CADENCES);
    const [code, setCode] = useState("USD");
    const [price, setPrice] = useState("400");
    const [down, setDown] = useState("100");
    const [count, setCount] = useState("3");
    const [payment, setPayment] = useState("105");
    const [every, setEvery] = useState<Every>("twoWeeks");

    const plan = {
        cadence: every,
        count: Math.min(MAX_PAYMENTS, Math.max(1, Number.parseInt(count, 10) || 1)),
        down: parseAmount(down, code),
        payment: parseAmount(payment, code),
        price: parseAmount(price, code),
    };
    const { annualRate, extra, total } = installmentCost(plan);
    const weeks = every === "twoWeeks" ? 2 : 1;
    const end = every === "month" ? labels.at.month({ n: plan.count }) : labels.at.week({ n: plan.count * weeks });

    let answer: ReactNode = page.answer.same({ end });
    if (extra > 0 && annualRate !== null) {
        const rate = <span className="font-mono font-medium">{formatRate(annualRate)}</span>;
        answer = page.answer.more({ amount: <Figure code={code} minor={extra} tone="spend" />, end, rate });
    } else if (extra > 0) {
        answer = page.answer.covered({ amount: <Figure code={code} minor={extra} tone="spend" /> });
    } else if (extra < 0) {
        answer = page.answer.less({ amount: <Figure code={code} minor={-extra} tone="income" />, end });
    }

    const rows = [
        ...(plan.down > 0
            ? [{ amount: formatAmount(plan.down, code), done: true, key: "today", label: labels.row.today }]
            : []),
        ...Array.from({ length: plan.count }, (_, index) => ({
            amount: formatAmount(plan.payment, code),
            key: String(index + 1),
            label: every === "month" ? labels.row.month({ n: index + 1 }) : labels.row.week({ n: (index + 1) * weeks }),
        })),
    ];

    return (
        <ToolPanel
            answer={answer}
            preview={
                <AppCard
                    caption={
                        <>
                            <div className="bg-app-track mt-4 h-2 overflow-hidden rounded-full">
                                <div
                                    className="bg-app-tint fluid h-full origin-left"
                                    style={{ transform: `scaleX(${total > 0 ? plan.down / total : 0})` }}
                                />
                            </div>
                            <p className="text-app-muted mt-2 text-sm">
                                {page.preview.paid({ count: rows.length, paid: plan.down > 0 ? 1 : 0 })}
                            </p>
                        </>
                    }
                    figure={formatAmount(total - plan.down, code)}
                    title={page.preview.left}
                >
                    <AppRows rows={rows} />
                </AppCard>
            }
            tool={SLUG}
        >
            <Fields className="grid-cols-2 md:grid-cols-3">
                <Field label={page.fields.price}>
                    <AmountInput code={code} onChange={setPrice} value={price} />
                </Field>
                <Field label={page.fields.down}>
                    <AmountInput code={code} onChange={setDown} value={down} />
                </Field>
                <CurrencyField onChange={setCode} value={code} />
                <Field label={page.fields.count}>
                    <input
                        autoComplete="off"
                        className={`${BARE} font-mono`}
                        inputMode="numeric"
                        onChange={(event) => setCount(event.target.value)}
                        value={count}
                    />
                </Field>
                <Field label={page.fields.payment}>
                    <AmountInput code={code} onChange={setPayment} value={payment} />
                </Field>
                <Field label={labels.every}>
                    <Choice onChange={setEvery} options={cadences} value={every} />
                </Field>
            </Fields>
        </ToolPanel>
    );
}
