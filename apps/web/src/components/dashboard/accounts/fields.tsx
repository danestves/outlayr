import { Popover } from "@base-ui/react/popover";
import { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";
import { RiArrowDownSLine, RiCheckLine, RiCloseLine, RiSearch2Line } from "@remixicon/react";
import { Dialog } from "panelui-web/dialog";
import { useMemo, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { useIntlayer } from "react-intlayer";

import { parseAmount } from "@/lib/account-writes";
import { money } from "@/lib/ledger";

export const amountText = (amount: number, currency: string) => money(amount, currency);

// Base UI's trap only places focus when the dialog opens, and the check dialog swaps this field in later.
const focusNode = (node: HTMLInputElement | null) => node?.select();

/** Formats on blur and leaves typing alone, so a half-typed "12." is not rewritten under the caret. */
export function AmountInput({
    autoFocus = false,
    currency,
    id,
    invalid = false,
    negative,
    onNegative,
    onText,
    text,
}: {
    autoFocus?: boolean;
    currency: string;
    id: string;
    invalid?: boolean;
    negative?: boolean;
    onNegative?: (negative: boolean) => void;
    onText: (text: string) => void;
    text: string;
}) {
    return (
        <div className="dash-fi" data-invalid={invalid ? "true" : undefined}>
            {onNegative ? (
                <button
                    aria-pressed={negative}
                    className="dash-sg dash-figure"
                    onClick={() => onNegative(!negative)}
                    type="button"
                >
                    {negative ? "-" : "+"}
                </button>
            ) : null}
            <input
                className="dash-figure"
                id={id}
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
        </div>
    );
}

export function CurrencyField({
    id,
    inUse,
    onPick,
    value,
}: {
    id: string;
    inUse: readonly string[];
    onPick: (code: string) => void;
    value: string;
}) {
    const { flows } = useIntlayer("dashboard-accounts");
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const groups = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const matches = (code: string) =>
            needle === "" || `${code} ${currencyDisplayFor(code).name}`.toLowerCase().includes(needle);
        return {
            all: PICKABLE_CURRENCY_CODES.filter((code) => !inUse.includes(code) && matches(code)),
            yours: inUse.filter(matches),
        };
    }, [inUse, query]);
    const row = (code: string) => (
        <button
            aria-pressed={code === value}
            className="dash-pr"
            key={code}
            onClick={() => {
                onPick(code);
                setOpen(false);
                setQuery("");
            }}
            type="button"
        >
            <span className="dash-figure">{code}</span>
            <span className="truncate">{currencyDisplayFor(code).name}</span>
            {code === value ? <RiCheckLine className="text-app-tint ml-auto flex-none" size={16} /> : null}
        </button>
    );
    const heading = "text-muted-foreground px-2 pt-2.5 pb-1 text-xs leading-4";
    return (
        <Popover.Root onOpenChange={setOpen} open={open}>
            <Popover.Trigger className="dash-fi" id={id} type="button">
                <span className="dash-figure">{value}</span>
                <span className="text-muted-foreground truncate">{currencyDisplayFor(value).name}</span>
                <RiArrowDownSLine className="text-muted-foreground ml-auto flex-none" size={16} />
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Positioner align="start" className="z-[60]" sideOffset={6}>
                    <Popover.Popup className="app-shell dash-po ph-no-capture flex max-h-[440px] w-[290px] flex-col">
                        <div className="dash-fi flex-none">
                            <RiSearch2Line className="text-muted-foreground flex-none" size={16} />
                            <input
                                aria-label={flows.currencySearch.value}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={flows.currencySearch.value}
                                value={query}
                            />
                        </div>
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

export function FlowDialog({
    children,
    confirm = false,
    head,
    initialFocus,
    label,
    onClose,
    wide = false,
}: {
    children: ReactNode;
    confirm?: boolean;
    head?: ReactNode;
    initialFocus?: RefObject<HTMLInputElement | null>;
    label: ReactNode;
    onClose: () => void;
    wide?: boolean;
}) {
    const { flows } = useIntlayer("dashboard-accounts");
    const narrow = confirm ? "confirm" : undefined;
    return (
        <Dialog onOpenChange={(open) => (open ? undefined : onClose())} open>
            <Dialog.Content
                className="app-shell dash-dialog ph-no-capture"
                data-size={wide ? "wide" : narrow}
                showClose={false}
                variant="plain"
                // Content forwards the rest to Base UI's Popup, though its props only declare the div's.
                {...{ initialFocus }}
            >
                <div className="dash-dh">
                    {head}
                    <Dialog.Title className="text-[15px] leading-5 font-semibold tracking-normal">{label}</Dialog.Title>
                    <button aria-label={flows.close.value} onClick={onClose} type="button">
                        <RiCloseLine size={18} />
                    </button>
                </div>
                {children}
            </Dialog.Content>
        </Dialog>
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
