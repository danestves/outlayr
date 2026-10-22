import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { formatAmount, parseAmount, subscriptionCost } from "@/lib/calculators";

import {
    AmountInput,
    AppCard,
    AppRows,
    BARE,
    Choice,
    Figure,
    InlineCurrency,
    RemoveButton,
    RowList,
    ToolPanel,
    useCadences,
    useRows,
} from "./tool-kit";

const SLUG = "subscription-cost-calculator";
const CADENCES = ["week", "month", "quarter", "year"] as const;
const EXAMPLES = [
    { every: "month", price: "15.49" },
    { every: "month", price: "11.99" },
    { every: "month", price: "2.99" },
    { every: "month", price: "40" },
    { every: "year", price: "99" },
] as const;
const COLUMNS = "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2rem] md:grid-cols-[minmax(0,1fr)_6rem_6rem_6rem_2rem]";

type Every = (typeof CADENCES)[number];

export function SubscriptionTool() {
    const { labels, pages } = useIntlayer("tools");
    const page = pages[SLUG];
    const cadences = useCadences(CADENCES);
    const [code, setCode] = useState("USD");
    const { add, focusRef, remove, rows, update } = useRows<{ every: Every; name: string; price: string }>(
        () => EXAMPLES.map((example, index) => ({ ...example, name: page.examples[index]?.value ?? "" })),
        { every: "month", name: "", price: "" }
    );

    const { monthly, total, yearly } = subscriptionCost(
        rows.map((row) => ({ amount: parseAmount(row.price, code), cadence: row.every }))
    );
    const nameOf = (name: string) => name.trim() || page.fields.name.value;
    const ranked = rows
        .map((row, index) => ({ name: nameOf(row.name), id: row.id, yearly: yearly[index] ?? 0 }))
        .sort((a, b) => b.yearly - a.yearly);

    return (
        <ToolPanel
            answer={
                total > 0
                    ? page.answer({
                          monthly: <Figure code={code} minor={monthly} />,
                          yearly: <Figure code={code} minor={total} />,
                      })
                    : page.empty
            }
            preview={
                <AppCard
                    figure={
                        <>
                            {formatAmount(monthly, code)}{" "}
                            <span className="text-app-muted text-base font-normal">{page.preview.month}</span>
                        </>
                    }
                    title={page.preview.title}
                >
                    <AppRows
                        rows={ranked.map((row) => ({
                            amount: formatAmount(Math.round(row.yearly / 12), code),
                            key: String(row.id),
                            label: row.name,
                        }))}
                    />
                </AppCard>
            }
            tool={SLUG}
        >
            <RowList
                add={page.add}
                columns={COLUMNS}
                currency={<InlineCurrency onChange={setCode} value={code} />}
                head={
                    <>
                        <span>{page.fields.name}</span>
                        <span>{page.fields.price}</span>
                        <span>{labels.every}</span>
                        <span className="text-right">{page.fields.year}</span>
                    </>
                }
                onAdd={add}
            >
                {rows.map((row, index) => (
                    <li className={`grid items-center gap-x-4 gap-y-2 py-3 ${COLUMNS}`} key={row.id}>
                        <input
                            aria-label={page.fields.name.value}
                            autoComplete="off"
                            className={`${BARE} max-md:col-span-3`}
                            onChange={(event) => update(row.id, { name: event.target.value })}
                            placeholder={page.fields.name.value}
                            ref={focusRef(row.id)}
                            value={row.name}
                        />
                        <AmountInput
                            code={code}
                            label={page.fields.price.value}
                            onChange={(price) => update(row.id, { price })}
                            value={row.price}
                        />
                        <Choice
                            label={labels.every.value}
                            onChange={(every) => update(row.id, { every })}
                            options={cadences}
                            value={row.every}
                        />
                        <span className="text-muted hidden text-right font-mono md:block">
                            {formatAmount(yearly[index] ?? 0, code)}
                        </span>
                        <RemoveButton
                            label={`${labels.remove.value} ${nameOf(row.name)}`}
                            onRemove={() => remove(row.id)}
                        />
                    </li>
                ))}
            </RowList>
        </ToolPanel>
    );
}
