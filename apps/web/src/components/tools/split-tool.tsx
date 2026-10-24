import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { formatAmount, parseAmount, settleUp } from "@/lib/calculators";

import {
    AmountInput,
    BARE,
    Figure,
    InlineCurrency,
    LABEL,
    RemoveButton,
    RowList,
    ToolPanel,
    useRows,
} from "./tool-kit";

const SLUG = "split-expenses-calculator";
const PAID = ["120", "45", "0"];
const MIN_PEOPLE = 2;
const COLUMNS = "grid-cols-[minmax(0,1fr)_7rem_2rem] md:grid-cols-[minmax(0,1fr)_8rem_8rem_2rem]";
const HEAD = `${LABEL} py-3 font-normal`;

function toneOf(balance: number) {
    if (balance > 0) {
        return "text-income";
    }
    return balance < 0 ? "text-spend" : "text-muted";
}

export function SplitTool() {
    const { labels, pages } = useIntlayer("tools");
    const page = pages[SLUG];
    const [code, setCode] = useState("USD");
    const { add, focusRef, remove, rows, update } = useRows<{ name: string; paid: string }>(
        () => page.examples.map((name, index) => ({ name: name.value, paid: PAID[index] ?? "" })),
        { name: "", paid: "" }
    );

    const paid = rows.map((row) => parseAmount(row.paid, code));
    const { share, total, transfers } = settleUp(paid);
    const nameOf = (index: number) => rows[index]?.name.trim() || `${page.fields.name.value} ${index + 1}`;

    return (
        <>
            <ToolPanel
                label={page.title.value}
                answer={page.answer({
                    count: String(rows.length),
                    share: <Figure code={code} minor={Math.round(total / Math.max(1, rows.length))} />,
                    total: <Figure code={code} minor={total} />,
                })}
                tool={SLUG}
            >
                <RowList
                    add={page.add}
                    columns={COLUMNS}
                    currency={<InlineCurrency onChange={setCode} value={code} />}
                    head={
                        <>
                            <span>{page.fields.name}</span>
                            <span>{page.fields.paid}</span>
                            <span className="text-right">{page.columns.balance}</span>
                        </>
                    }
                    onAdd={add}
                >
                    {rows.map((row, index) => {
                        const balance = (paid[index] ?? 0) - (share[index] ?? 0);
                        return (
                            <li className={`grid items-center gap-x-4 py-3 ${COLUMNS}`} key={row.id}>
                                <input
                                    aria-label={page.fields.name.value}
                                    autoComplete="off"
                                    className={BARE}
                                    onChange={(event) => update(row.id, { name: event.target.value })}
                                    placeholder={`${page.fields.name.value} ${index + 1}`}
                                    ref={focusRef(row.id)}
                                    value={row.name}
                                />
                                <AmountInput
                                    code={code}
                                    label={page.fields.paid.value}
                                    onChange={(value) => update(row.id, { paid: value })}
                                    value={row.paid}
                                />
                                <span className={`hidden text-right font-mono md:block ${toneOf(balance)}`}>
                                    {balance > 0 ? "+" : ""}
                                    {formatAmount(balance, code)}
                                </span>
                                <RemoveButton
                                    disabled={rows.length <= MIN_PEOPLE}
                                    label={`${labels.remove.value} ${nameOf(index)}`}
                                    onRemove={() => remove(row.id)}
                                />
                            </li>
                        );
                    })}
                </RowList>
            </ToolPanel>
            <div className="mt-8" data-reveal>
                {transfers.length === 0 ? (
                    <p className="text-muted text-lg">{page.settled}</p>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-border border-b">
                                <th className={`${HEAD} pr-4 text-left`} scope="col">
                                    {page.columns.from}
                                </th>
                                <th className={`${HEAD} pr-4 text-left`} scope="col">
                                    {page.columns.to}
                                </th>
                                <th className={`${HEAD} text-right`} scope="col">
                                    {page.columns.amount}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {transfers.map((transfer) => (
                                <tr className="border-border border-b" key={`${transfer.from}:${transfer.to}`}>
                                    <td className="py-4 pr-4">{nameOf(transfer.from)}</td>
                                    <td className="py-4 pr-4">{nameOf(transfer.to)}</td>
                                    <td className="py-4 text-right font-mono whitespace-nowrap">
                                        {formatAmount(transfer.amount, code)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}
