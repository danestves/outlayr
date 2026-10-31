import { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { currencyDisplayFor } from "@outlayr/money/currency";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Icon } from "@/components/icon";
import { capture } from "@/lib/analytics";
import { formatAmount } from "@/lib/calculators";
import type { Cadence } from "@/lib/calculators";

export const LABEL = "text-muted font-mono text-xs";
export const BARE = "w-full min-w-0 bg-transparent focus-visible:outline-none";
const SELECT = `select ${BARE} cursor-pointer pr-6`;
const MAX_ROWS = 5;
const CURRENCIES = PICKABLE_CURRENCY_CODES.map((code) => ({ label: code, value: code }));

const TONES = { income: "text-income", spend: "text-spend" } as const;

export function Figure({ minor, code, tone }: { code: string; minor: number; tone?: keyof typeof TONES }) {
    return (
        <span className={`font-mono font-medium whitespace-nowrap ${tone ? TONES[tone] : ""}`}>
            {formatAmount(minor, code)}
        </span>
    );
}

export function ToolPanel({
    answer,
    children,
    label,
    preview,
    tool,
}: {
    answer: ReactNode;
    children: ReactNode;
    label: string;
    preview?: ReactNode;
    tool: string;
}) {
    const used = useRef(false);
    return (
        <form
            aria-label={label}
            className={`bg-surface grid gap-2 rounded-3xl p-2 ${preview ? "lg:grid-cols-[minmax(0,1fr)_17rem]" : ""}`}
            data-reveal="now"
            onInput={() => {
                if (!used.current) {
                    used.current = true;
                    capture("tool_used", { tool });
                }
            }}
            onSubmit={(event) => event.preventDefault()}
        >
            <div className="flex min-w-0 flex-col">
                <output className="block px-4 pt-4 pb-6 text-2xl leading-snug font-semibold tracking-tight md:px-6 md:pt-6 md:text-3xl">
                    {answer}
                </output>
                {children}
            </div>
            {preview}
        </form>
    );
}

export function Fields({ children, className }: { children: ReactNode; className: string }) {
    return (
        <div className={`bg-border grid gap-px overflow-hidden rounded-2xl ${className}`} data-fields>
            {children}
        </div>
    );
}

export function Field({ children, label }: { children: ReactNode; label: ReactNode }) {
    return (
        <label className="bg-raised outline-tint flex min-w-0 flex-col gap-2 p-4 text-xl -outline-offset-2 has-[:focus-visible]:outline-2 md:px-5">
            <span className={LABEL}>{label}</span>
            {children}
        </label>
    );
}

export function AmountInput({
    code,
    label,
    onChange,
    value,
}: {
    code: string;
    label?: string;
    onChange: (value: string) => void;
    value: string;
}) {
    return (
        <span className="flex items-baseline gap-1 font-mono">
            <span aria-hidden="true" className="text-muted">
                {currencyDisplayFor(code).symbol}
            </span>
            <input
                aria-label={label}
                autoComplete="off"
                className={BARE}
                inputMode="decimal"
                onChange={(event) => onChange(event.target.value)}
                value={value}
            />
        </span>
    );
}

export function Choice<T extends string>({
    label,
    onChange,
    options,
    value,
}: {
    label?: string;
    onChange: (value: T) => void;
    options: readonly { label: string; value: T }[];
    value: T;
}) {
    return (
        <select
            aria-label={label}
            className={SELECT}
            onChange={(event) => {
                const picked = options.find((option) => option.value === event.target.value);
                if (picked) {
                    onChange(picked.value);
                }
            }}
            value={value}
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}

export function useCadences<T extends Cadence>(cadences: readonly T[]) {
    const { labels } = useIntlayer("tools");
    return cadences.map((cadence) => ({ label: labels.cadences[cadence].value, value: cadence }));
}

export function CurrencyField({ onChange, value }: { onChange: (code: string) => void; value: string }) {
    const { labels } = useIntlayer("tools");
    return (
        <Field label={labels.currency}>
            <Choice onChange={onChange} options={CURRENCIES} value={value} />
        </Field>
    );
}

export function useRows<F extends object>(initial: () => readonly F[], blank: F) {
    const [rows, setRows] = useState(() => initial().map((fields, id) => ({ ...fields, id })));
    const nextId = useRef(rows.length);
    const pending = useRef<number | null>(null);
    return {
        add: () => {
            const id = nextId.current;
            nextId.current += 1;
            pending.current = id;
            setRows((current) => [...current, { ...blank, id }]);
        },
        focusRef: (id: number) => (node: HTMLInputElement | null) => {
            if (node && pending.current === id) {
                pending.current = null;
                node.focus();
            }
        },
        remove: (id: number) => setRows((current) => current.filter((row) => row.id !== id)),
        rows,
        update: (id: number, change: Partial<F>) =>
            setRows((current) => current.map((row) => (row.id === id ? { ...row, ...change } : row))),
    };
}

export function RowList({
    add,
    children,
    columns,
    currency,
    head,
    onAdd,
}: {
    add: ReactNode;
    children: ReactNode;
    columns: string;
    currency: ReactNode;
    head: ReactNode;
    onAdd: () => void;
}) {
    return (
        <div className="bg-raised rounded-2xl px-4 md:px-5">
            <div className={`${LABEL} ${columns} border-border hidden gap-x-4 border-b py-3 md:grid`}>{head}</div>
            <ul className="divide-border divide-y">{children}</ul>
            <div className="border-border flex flex-wrap items-center justify-between gap-4 border-t py-3">
                <button
                    className="fluid hover:bg-foreground/5 -ml-2 inline-flex cursor-pointer items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold"
                    onClick={onAdd}
                    type="button"
                >
                    <Icon name="plus" />
                    {add}
                </button>
                {currency}
            </div>
        </div>
    );
}

export function RemoveButton({
    disabled,
    label,
    onRemove,
}: {
    disabled?: boolean;
    label: string;
    onRemove: () => void;
}) {
    return (
        <button
            aria-label={label}
            className="fluid text-muted hover:text-foreground hover:bg-foreground/5 flex size-8 cursor-pointer items-center justify-center justify-self-end rounded-full disabled:invisible"
            disabled={disabled}
            onClick={onRemove}
            type="button"
        >
            <Icon name="x" />
        </button>
    );
}

export function InlineCurrency({ onChange, value }: { onChange: (code: string) => void; value: string }) {
    const { labels } = useIntlayer("tools");
    return (
        <label className="flex items-center gap-3">
            <span className={LABEL}>{labels.currency}</span>
            <span className="w-20 font-mono">
                <Choice onChange={onChange} options={CURRENCIES} value={value} />
            </span>
        </label>
    );
}

export function AppCard({
    caption,
    children,
    figure,
    title,
}: {
    caption?: ReactNode;
    children: ReactNode;
    figure: ReactNode;
    title: ReactNode;
}) {
    return (
        <figure className="bg-app-bg text-app-ink rounded-2xl p-4">
            <figcaption className="text-app-muted text-sm">{title}</figcaption>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{figure}</p>
            {caption}
            <ul className="bg-app-group divide-app-rule mt-4 divide-y rounded-xl text-sm">{children}</ul>
        </figure>
    );
}

export function AppRows({
    rows,
}: {
    rows: readonly { amount: ReactNode; done?: boolean; key: string; label: ReactNode }[];
}) {
    const { labels } = useIntlayer("tools");
    const shown = rows.length > MAX_ROWS ? rows.slice(0, MAX_ROWS - 1) : rows;
    return (
        <>
            {shown.map((row) => (
                <li
                    className={`flex justify-between gap-4 px-3 py-3 ${row.done ? "text-app-muted" : ""}`}
                    key={row.key}
                >
                    <span className="min-w-0 truncate">{row.label}</span>
                    <span className="font-mono">{row.amount}</span>
                </li>
            ))}
            {shown.length < rows.length ? (
                <li className="text-app-muted px-3 py-3">{labels.more({ count: rows.length - shown.length })}</li>
            ) : null}
        </>
    );
}
