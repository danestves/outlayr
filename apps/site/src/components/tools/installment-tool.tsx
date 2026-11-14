import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { formatAmount, installmentCost, parseAmount, parsePercent } from "@/lib/calculators";

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
    PercentInput,
    ToolPanel,
    useCadences,
} from "./tool-kit";

const SLUG = "installment-calculator";
const CADENCES = ["week", "twoWeeks", "month"] as const;
const MAX_PAYMENTS = 600;
const MAX_PERCENT = 9999;
const MAX_DISCOUNT = 100;
const MAX_INFLATION = 1000;

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
    const [discount, setDiscount] = useState("");
    const [inflation, setInflation] = useState("");

    const plan = {
        cadence: every,
        cashDiscountPercent: parsePercent(discount, MAX_DISCOUNT),
        count: Math.min(MAX_PAYMENTS, Math.max(1, Number.parseInt(count, 10) || 1)),
        down: parseAmount(down, code),
        monthlyInflationPercent: parsePercent(inflation, MAX_INFLATION),
        payment: parseAmount(payment, code),
        price: parseAmount(price, code),
    };
    const { annualRate, answer: kind, cash, extra, present, total, verdict } = installmentCost(plan);
    const weeks = every === "twoWeeks" ? 2 : 1;
    const end = every === "month" ? labels.at.month({ n: plan.count }) : labels.at.week({ n: plan.count * weeks });

    const amount = <Figure code={code} minor={Math.abs(extra)} tone={extra > 0 ? "spend" : "income"} />;
    const totalPrice = <Figure code={code} minor={total} />;
    let answer: ReactNode = page.answer.same({ end, total: totalPrice });
    if (kind === "more") {
        const rate = <span className="font-mono font-medium">{formatRate(annualRate ?? 0)}</span>;
        answer = page.answer.more({ amount, end, rate, total: totalPrice });
    } else if (kind === "covered") {
        answer = page.answer.covered({ amount });
    } else if (kind === "less") {
        answer = page.answer.less({ amount, end, total: totalPrice });
    } else if (kind !== "same") {
        answer = page.answer[kind];
    }
    if (verdict !== null && (plan.cashDiscountPercent > 0 || plan.monthlyInflationPercent > 0)) {
        const cashPrice = <Figure code={code} minor={cash} />;
        const worth = <Figure code={code} minor={present} />;
        const gap = (
            <Figure
                code={code}
                minor={Math.abs(cash - present)}
                tone={verdict === "installments" ? "income" : "spend"}
            />
        );
        const lead =
            verdict === "same"
                ? page.answer.verdict.same({ cash: cashPrice, present: worth })
                : page.answer.verdict[verdict]({ amount: gap, cash: cashPrice, present: worth });
        answer = (
            <>
                {lead} {answer}
            </>
        );
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
            label={page.title.value}
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
            <Fields className="mt-2 grid-cols-2">
                <Field label={page.fields.discount}>
                    <PercentInput onChange={setDiscount} value={discount} />
                </Field>
                <Field label={page.fields.inflation}>
                    <PercentInput onChange={setInflation} value={inflation} />
                </Field>
            </Fields>
        </ToolPanel>
    );
}
