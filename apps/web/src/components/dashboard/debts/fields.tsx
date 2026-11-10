import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";
import { Button } from "panelui-web/button";
import { Chip } from "panelui-web/chip";
import { Input } from "panelui-web/input";
import { Menu } from "panelui-web/menu";
import { Select } from "panelui-web/select";
import { useRef } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import type { AccountRow } from "@/components/dashboard/accounts/model";
import { useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile } from "@/components/ledger/tiles";
import { parseAmount } from "@/lib/account-writes";

export const FOOTER_PILL = "min-w-max! px-3.5";
export const POPUP = "app-shell z-[60]";
export const LABEL = "data-invalid:text-foreground has-[[aria-invalid=true]]:text-foreground";
const NONE = "none";

export const plainAmount = (amount: number, currency: string) => {
    const decimals = decimalsFor(currency);
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(
        amount
    );
};

export function MoneyField({
    autoFocus = false,
    big = false,
    currency,
    invalid = false,
    label,
    onText,
    text,
}: {
    autoFocus?: boolean;
    big?: boolean;
    currency: string;
    invalid?: boolean;
    label: string;
    onText: (text: string) => void;
    text: string;
}) {
    const decimals = decimalsFor(currency);
    const size = big ? "h-[52px] text-sm font-semibold" : "";
    return (
        <Input.Group className={`has-[input[aria-invalid=true]]:ring-3 ${big ? "h-[52px]" : ""}`}>
            <Input.Addon
                className={`dash-figure pe-0.5! ${big && text.trim() !== "" ? `${size} text-foreground` : `${size} text-muted-foreground`}`}
            >
                {currencyDisplayFor(currency).symbol}
            </Input.Addon>
            <Input
                aria-invalid={invalid || undefined}
                aria-label={label}
                autoFocus={autoFocus}
                className={`dash-figure ps-1 ${size}`}
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
    day,
    invalid = false,
    label,
    max,
    min,
    onDay,
}: {
    day: string;
    invalid?: boolean;
    label: string;
    max?: string;
    min?: string;
    onDay: (day: string) => void;
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
                {date.full(day)}
                <Glyph icon={Calendar03Icon} className="text-muted-foreground ml-auto" size={16} />
            </Button>
            <input
                aria-hidden
                className="pointer-events-none absolute inset-0 appearance-none opacity-0 pointer-coarse:pointer-events-auto"
                max={max}
                min={min}
                onChange={({ target: { value } }) => {
                    // Some mobile date pickers let a day outside min and max through.
                    if (value && value <= (max ?? value) && value >= (min ?? value)) {
                        onDay(value);
                    }
                }}
                ref={input}
                tabIndex={-1}
                type="date"
                value={day}
            />
        </div>
    );
}

/** An account, or None for money that moved outside every account. */
export function AccountPick({
    label,
    onPick,
    rows,
    value,
}: {
    label: string;
    onPick: (id: string | null) => void;
    rows: readonly AccountRow[];
    value: string | null;
}) {
    const { form } = useIntlayer("dashboard-debts");
    const { photos } = useDashboard();
    const picked = rows.find((row) => row.id === value);
    return (
        <Select
            items={[
                { label: form.none.value, value: NONE },
                ...rows.map((row) => ({ label: row.name, value: row.id })),
            ]}
            onValueChange={(next) => next !== null && onPick(next === NONE ? null : next)}
            value={value ?? NONE}
        >
            <Select.Trigger aria-label={label} className={picked ? "" : "text-muted-foreground"}>
                {picked ? <AccountTile account={picked.look} photos={photos} size="sm" /> : null}
                <Select.Value />
            </Select.Trigger>
            <Select.Content className={POPUP}>
                <Select.Item value={NONE}>{form.none}</Select.Item>
                {rows.map((row) => (
                    <Select.Item
                        icon={<AccountTile account={row.look} photos={photos} size="sm" />}
                        key={row.id}
                        value={row.id}
                    >
                        {row.name}
                    </Select.Item>
                ))}
            </Select.Content>
        </Select>
    );
}

export function Chips({ children }: { children: ReactNode }) {
    return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

export function Pick({
    children,
    onPress,
    pressed,
    size = "lg",
}: {
    children: ReactNode;
    onPress: () => void;
    pressed: boolean;
    size?: "lg" | "md" | "sm";
}) {
    return (
        <Chip
            className="dash-figure font-sans [&>[data-slot=chip-check]]:hidden"
            onClick={onPress}
            pressed={pressed}
            size={size}
        >
            {children}
        </Chip>
    );
}

export interface PersonChoice {
    id: string;
    name: string;
}

const NO_PEOPLE: readonly PersonChoice[] = [];

/** Typed like a name: a match picks that person, anything else becomes a new one on save. */
export function PersonField({
    invalid,
    label,
    onText,
    people,
    placeholder,
    quick = NO_PEOPLE,
    text,
}: {
    invalid: boolean;
    label: string;
    onText: (text: string) => void;
    people: readonly PersonChoice[];
    placeholder: string;
    quick?: readonly PersonChoice[];
    text: string;
}) {
    const { form } = useIntlayer("dashboard-debts");
    const picked = matchPerson(people, text);
    return (
        <>
            <Input.Group className="has-[input[aria-invalid=true]]:ring-3">
                <Input
                    aria-invalid={invalid || undefined}
                    aria-label={label}
                    autoComplete="off"
                    onChange={(event) => onText(event.target.value)}
                    placeholder={placeholder}
                    value={text}
                />
                {people.length > 0 ? (
                    <Input.Addon align="end" className="pe-1!">
                        <Menu>
                            <Menu.Trigger
                                aria-label={form.people.value}
                                render={
                                    <Button className="text-muted-foreground size-7" size="icon-sm" variant="ghost" />
                                }
                            >
                                <Glyph icon={ArrowDown01Icon} size={16} />
                            </Menu.Trigger>
                            <Menu.Content
                                align="end"
                                alignOffset={-6}
                                className={`${POPUP} ph-no-capture max-h-[280px] w-[220px] overflow-y-auto`}
                                sideOffset={8}
                            >
                                {people.map((person) => (
                                    <Menu.Item key={person.id} onClick={() => onText(person.name)}>
                                        <span className="truncate">{person.name}</span>
                                    </Menu.Item>
                                ))}
                            </Menu.Content>
                        </Menu>
                    </Input.Addon>
                ) : null}
            </Input.Group>
            {quick.length > 0 ? (
                <Chips>
                    {quick.map((person) => (
                        <Pick key={person.id} onPress={() => onText(person.name)} pressed={picked?.id === person.id}>
                            {person.name}
                        </Pick>
                    ))}
                </Chips>
            ) : null}
        </>
    );
}

export const matchPerson = (people: readonly PersonChoice[], text: string) => {
    const needle = text.trim().toLocaleLowerCase();
    return needle === "" ? null : (people.find((person) => person.name.trim().toLocaleLowerCase() === needle) ?? null);
};
