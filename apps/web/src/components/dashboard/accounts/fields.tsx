import { Popover } from "@base-ui/react/popover";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import ArrowUp01Icon from "@hugeicons/core-free-icons/ArrowUp01Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Input } from "panelui-web/input";
import { Label } from "panelui-web/label";
import { useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDateFormat } from "@/components/dashboard/home/format";
import { parseAmount } from "@/lib/account-writes";
import { money } from "@/lib/ledger";

import { Glyph } from "./glyph";

export const amountText = (amount: number, currency: string) => money(amount, currency);

// The catalog title-cases every name, and the picker reads as a sentence: "US dollar", "Hong Kong dollar".
const currencyName = (code: string) => {
    const { name } = currencyDisplayFor(code);
    const last = name.lastIndexOf(" ") + 1;
    return last === 0 ? name : name.slice(0, last) + name.slice(last).toLowerCase();
};

/** One line of a drawer: the label on the left and a control with no box on the right. */
export const QUIET_ROW = "grid! min-h-11 grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-3 border-b py-1";

// Base UI's trap only places focus when the dialog opens, and the check dialog swaps this field in later.
export const focusNode = (node: HTMLInputElement | null) => node?.select();

/** Formats on blur and leaves typing alone, so a half-typed "12." is not rewritten under the caret. */
export function AmountInput({
    autoFocus = false,
    currency,
    label,
    negative,
    onNegative,
    onText,
    sign,
    size,
    text,
    unit,
}: {
    autoFocus?: boolean;
    currency: string;
    label?: string;
    negative?: boolean;
    onNegative?: (negative: boolean) => void;
    onText: (text: string) => void;
    sign?: string;
    size?: "lg" | "md" | "sm";
    text: string;
    unit?: string;
}) {
    return (
        <Input.Group size={size}>
            {onNegative ? (
                <Input.Addon>
                    <Button
                        aria-pressed={negative}
                        className="dash-sg dash-figure"
                        onClick={() => onNegative(!negative)}
                        size="icon-sm"
                        variant="ghost"
                    >
                        {negative ? "-" : "+"}
                    </Button>
                </Input.Addon>
            ) : null}
            {sign ? <Input.Addon className="dash-figure text-foreground pe-1.5!">{sign}</Input.Addon> : null}
            <Input
                aria-label={label}
                className={onNegative ? "dash-figure ps-0.5" : "dash-figure"}
                inputMode="decimal"
                onBlur={() => {
                    if (text.trim() !== "") {
                        onText(amountText(parseAmount(text, decimalsFor(currency)), currency));
                    }
                }}
                onChange={(event) => onText(event.target.value)}
                placeholder={amountText(0, currency)}
                ref={autoFocus ? focusNode : undefined}
                value={text}
            />
            {unit ? (
                <Input.Addon align="end" className="dash-figure text-xs">
                    {unit}
                </Input.Addon>
            ) : null}
        </Input.Group>
    );
}

/** A popover, not a Select: the list runs to every currency, so it needs the search Select does not have. */
export function CurrencyField({
    inUse,
    label,
    onPick,
    quiet = false,
    value,
}: {
    inUse: readonly string[];
    label: ReactNode;
    onPick: (code: string) => void;
    quiet?: boolean;
    value: string;
}) {
    const { flows } = useIntlayer("dashboard-accounts");
    const id = useId();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const groups = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const matches = (code: string) =>
            needle === "" || `${code} ${currencyName(code)}`.toLowerCase().includes(needle);
        return {
            all: PICKABLE_CURRENCY_CODES.filter((code) => !inUse.includes(code) && matches(code)),
            yours: inUse.filter(matches),
        };
    }, [inUse, query]);
    const row = (code: string) => (
        <Button
            aria-pressed={code === value}
            className="dash-pr justify-start font-normal"
            key={code}
            onClick={() => {
                onPick(code);
                setOpen(false);
                setQuery("");
            }}
            variant="ghost"
        >
            <span className="dash-figure">{code}</span>
            <span className="truncate">{currencyName(code)}</span>
            {code === value ? <Glyph icon={Tick02Icon} className="text-app-tint ml-auto flex-none" size={16} /> : null}
        </Button>
    );
    const heading = "text-muted-foreground px-2 pt-2.5 pb-1 text-xs leading-4";
    return (
        <Popover.Root onOpenChange={setOpen} open={open}>
            <div className={quiet ? QUIET_ROW : "flex flex-col gap-2"}>
                <Label className={quiet ? "text-muted-foreground font-normal" : undefined} htmlFor={id}>
                    {label}
                </Label>
                <Popover.Trigger
                    id={id}
                    render={
                        <Button
                            className={
                                quiet
                                    ? "-me-2 ml-auto px-2 font-normal"
                                    : "data-popup-open:border-ring data-popup-open:ring-ring/30 w-full justify-start px-3 font-normal data-popup-open:ring-[3px]"
                            }
                            variant={quiet ? "ghost" : "outline"}
                        />
                    }
                >
                    <span className="dash-figure">{value}</span>
                    {quiet ? null : <span className="text-muted-foreground truncate">{currencyName(value)}</span>}
                    <Glyph
                        icon={open ? ArrowUp01Icon : ArrowDown01Icon}
                        className={`text-muted-foreground flex-none ${quiet ? "" : "ml-auto"}`}
                        size={16}
                    />
                </Popover.Trigger>
            </div>
            <Popover.Portal>
                <Popover.Positioner align="start" alignOffset={-8} className="z-[60]" sideOffset={6}>
                    <Popover.Popup className="app-shell dash-po ph-no-capture flex max-h-[440px] w-[290px] flex-col">
                        <Input.Group className="flex-none">
                            <Input.Addon>
                                <Glyph icon={Search01Icon} size={16} />
                            </Input.Addon>
                            <Input
                                aria-label={flows.currencySearch.value}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={flows.currencySearch.value}
                                value={query}
                            />
                        </Input.Group>
                        <div className="min-h-0 overflow-y-auto">
                            {groups.yours.length > 0 ? <div className={heading}>{flows.currencyYours}</div> : null}
                            {groups.yours.map(row)}
                            {groups.all.length > 0 ? <div className={heading}>{flows.currencyAll}</div> : null}
                            {groups.all.map(row)}
                        </div>
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}

export function FlowDialog({ children, head, label }: { children: ReactNode; head?: ReactNode; label: ReactNode }) {
    return (
        <>
            <Dialog.Header>
                <div className="flex items-center gap-2">
                    {head}
                    <Dialog.Title>{label}</Dialog.Title>
                </div>
            </Dialog.Header>
            {children}
        </>
    );
}

export function Fact({ children, label }: { children: ReactNode; label: ReactNode }) {
    return (
        <div className="flex h-9 items-center gap-2 border-b text-[13px] last:border-0">
            <span className="text-muted-foreground flex min-w-0 items-center gap-2 [&>svg]:flex-none">{label}</span>
            <span className="dash-figure ml-auto">{children}</span>
        </div>
    );
}

export const plainAmount = (amount: number, currency: string) => {
    const decimals = decimalsFor(currency);
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(
        amount
    );
};

export function MoneyField({
    autoFocus = false,
    className = "",
    currency,
    invalid = false,
    label,
    onText,
    text,
}: {
    autoFocus?: boolean;
    className?: string;
    currency: string;
    invalid?: boolean;
    label: string;
    onText: (text: string) => void;
    text: string;
}) {
    const decimals = decimalsFor(currency);
    return (
        <Input.Group className={`has-[input[aria-invalid=true]]:ring-3 ${className}`}>
            <Input.Addon className="dash-figure text-muted-foreground pe-2!">
                {currencyDisplayFor(currency).symbol}
            </Input.Addon>
            <Input
                aria-invalid={invalid || undefined}
                aria-label={label}
                autoFocus={autoFocus}
                className="dash-figure ps-1"
                inputMode="decimal"
                onBlur={() => {
                    if (text.trim() !== "") {
                        onText(plainAmount(parseAmount(text, decimals), currency));
                    }
                }}
                onChange={(event) => onText(event.target.value)}
                placeholder={plainAmount(0, currency)}
                value={text}
            />
        </Input.Group>
    );
}

export function DayField({
    invalid = false,
    label,
    max,
    min,
    onDay,
    day,
    trailing = false,
}: {
    day: string;
    invalid?: boolean;
    label: string;
    max?: string;
    min?: string;
    onDay: (day: string) => void;
    trailing?: boolean;
}) {
    const date = useDateFormat();
    const input = useRef<HTMLInputElement>(null);
    return (
        <div className="relative flex w-full items-center">
            <Button
                aria-invalid={invalid || undefined}
                aria-label={label}
                className="dash-figure aria-invalid:border-destructive aria-invalid:ring-destructive/20 w-full justify-start gap-2 px-3 font-normal aria-invalid:ring-3"
                onClick={() => input.current?.showPicker()}
                type="button"
                variant="outline"
            >
                {trailing ? null : <Glyph icon={Calendar03Icon} className="text-muted-foreground" size={15} />}
                {date.full(day)}
                {trailing ? <Glyph icon={Calendar03Icon} className="text-muted-foreground ms-auto" size={15} /> : null}
            </Button>
            <input
                aria-hidden
                className="pointer-events-none absolute inset-0 appearance-none opacity-0 pointer-coarse:pointer-events-auto"
                max={max}
                min={min}
                onChange={(event) => event.target.value && onDay(event.target.value)}
                ref={input}
                tabIndex={-1}
                type="date"
                value={day}
            />
        </div>
    );
}
