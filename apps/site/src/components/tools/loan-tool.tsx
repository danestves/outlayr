import { decimalsFor } from "@outlayr/money/currency";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { formatAmount, loanSchedule, parseAmount, parsePercent } from "@/lib/calculators";

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
    LABEL,
    PercentInput,
    ToolPanel,
} from "./tool-kit";

const SLUG = "loan-calculator";
const MAX_MONTHS = 600;
const MAX_RATE = 999;
const MAX_FEE = 100;
const SHOWN_MONTHS = 4;
const UNITS = ["months", "years"] as const;
const COLUMNS = "grid grid-cols-[2rem_repeat(3,minmax(0,1fr))] gap-x-3 text-right [&>:first-child]:text-left";

type Unit = (typeof UNITS)[number];

export function LoanTool() {
    const { labels, pages } = useIntlayer("tools");
    const page = pages[SLUG];
    const [code, setCode] = useState("USD");
    const [amount, setAmount] = useState("10000");
    const [rate, setRate] = useState("18");
    const [term, setTerm] = useState("36");
    const [unit, setUnit] = useState<Unit>("months");
    const [fee, setFee] = useState("");
    const [open, setOpen] = useState(false);

    const principal = parseAmount(amount, code);
    const count = Math.max(0, Number.parseInt(term, 10) || 0);
    const months = Math.min(MAX_MONTHS, unit === "years" ? count * 12 : count);
    const { interest, payment, schedule, total } = loanSchedule({
        amount: principal,
        annualPercent: parsePercent(rate, MAX_RATE),
        months,
    });
    const upfront = Math.round((principal * parsePercent(fee, MAX_FEE)) / 100);
    const paid = total + upfront;
    const number = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: decimalsFor(code),
        minimumFractionDigits: decimalsFor(code),
    });

    const span = months === 1 ? page.term.one : page.term.other({ n: months });
    let answer: ReactNode = page.answer.empty;
    if (payment > 0) {
        const each = <Figure code={code} minor={payment} />;
        const sum = <Figure code={code} minor={paid} />;
        answer =
            paid > principal
                ? page.answer.cost({
                      extra: <Figure code={code} minor={paid - principal} tone="spend" />,
                      payment: each,
                      span,
                      total: sum,
                  })
                : page.answer.free({ payment: each, span, total: sum });
    }

    const last = schedule.at(-1);
    const rows = schedule.map((row, index) => ({
        amount: formatAmount(row.payment, code),
        key: String(index),
        label: labels.row.month({ n: index + 1 }),
    }));
    const shown = (open ? schedule : schedule.slice(0, SHOWN_MONTHS)).map((row, index) => ({
        ...row,
        month: index + 1,
    }));

    return (
        <ToolPanel
            answer={answer}
            label={page.title.value}
            preview={
                <AppCard
                    caption={
                        <>
                            <div className="bg-app-track mt-4 h-2 overflow-hidden rounded-full">
                                <div
                                    className="bg-app-tint fluid h-full origin-left"
                                    style={{ transform: `scaleX(${total > 0 ? interest / total : 0})` }}
                                />
                            </div>
                            <p className="text-app-muted mt-2 text-sm">
                                {page.preview.split({
                                    interest: formatAmount(interest, code),
                                    principal: formatAmount(Math.max(0, principal), code),
                                })}
                            </p>
                        </>
                    }
                    figure={formatAmount(payment, code)}
                    title={page.preview.payment}
                >
                    <AppRows rows={rows} />
                </AppCard>
            }
            tool={SLUG}
        >
            <Fields className="grid-cols-2 md:grid-cols-3 [&>:last-child]:col-span-2">
                <Field label={page.fields.amount}>
                    <AmountInput code={code} onChange={setAmount} value={amount} />
                </Field>
                <CurrencyField onChange={setCode} value={code} />
                <Field label={page.fields.rate}>
                    <PercentInput onChange={setRate} value={rate} />
                </Field>
                <Field label={page.fields.term}>
                    <span className="flex items-baseline gap-2 font-mono">
                        <input
                            autoComplete="off"
                            className={BARE}
                            inputMode="numeric"
                            onChange={(event) => setTerm(event.target.value)}
                            value={term}
                        />
                        <span className="w-24 shrink-0 text-base">
                            <Choice
                                label={page.fields.unit.value}
                                onChange={setUnit}
                                options={UNITS.map((value) => ({ label: page.units[value].value, value }))}
                                value={unit}
                            />
                        </span>
                    </span>
                </Field>
                <Field label={page.fields.fee}>
                    <span className="flex items-baseline justify-between gap-2">
                        <span className="max-w-32 min-w-0 flex-1">
                            <PercentInput onChange={setFee} value={fee} />
                        </span>
                        {upfront > 0 ? (
                            <span className="text-muted shrink-0 font-mono text-sm">{formatAmount(upfront, code)}</span>
                        ) : null}
                    </span>
                </Field>
            </Fields>
            {schedule.length > 0 ? (
                <div className="bg-raised mt-2 rounded-2xl px-4 md:px-5">
                    <div className={`${LABEL} ${COLUMNS} border-border border-b py-3`}>
                        <span>{page.table.month}</span>
                        <span>{page.table.interest}</span>
                        <span>{page.table.principal}</span>
                        <span>{page.table.balance}</span>
                    </div>
                    <ol className="py-1 font-mono text-xs md:text-sm">
                        {shown.map((row) => (
                            <li className={`${COLUMNS} py-2`} key={row.month}>
                                <span>{row.month}</span>
                                <span>{number.format(row.interest / 10 ** decimalsFor(code))}</span>
                                <span>{number.format(row.principal / 10 ** decimalsFor(code))}</span>
                                <span>{number.format(row.balance / 10 ** decimalsFor(code))}</span>
                            </li>
                        ))}
                    </ol>
                    <div className="border-border flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t py-3 text-sm">
                        {schedule.length > SHOWN_MONTHS ? (
                            <button
                                aria-expanded={open}
                                className="fluid hover:bg-foreground/5 -ml-2 cursor-pointer rounded-full px-2 py-1 font-semibold"
                                onClick={() => setOpen(!open)}
                                type="button"
                            >
                                {open ? page.table.less : page.table.all({ count: schedule.length })}
                            </button>
                        ) : null}
                        {last && last.payment !== payment ? (
                            <span className="text-muted">
                                {page.table.last({ amount: formatAmount(last.payment, code) })}
                            </span>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </ToolPanel>
    );
}
