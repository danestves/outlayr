import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";
import { Button } from "panelui-web/button";
import { Exchange } from "panelui-web/exchange";
import type { ExchangeCurrency, ExchangeSide, ExchangeValue } from "panelui-web/exchange";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { formatRate } from "@/components/dashboard/settings/currency-rates";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { parseAmount } from "@/lib/account-writes";
import { useExchangeLocale } from "@/lib/exchange-locale";
import { marketRate, repriced, swapped, withArrived, withSent } from "@/lib/transfer-create";
import type { NewTransferValues } from "@/lib/transfer-create";

import { Pick, Slot } from "./entry-form";
import type { PickOption } from "./entry-form";

interface Leg {
    currency: string;
    detail: ReactNode;
    error?: ReactNode;
    id: string | null;
    onPick: (id: string) => void;
}

export function TransferAmounts({
    arrived,
    from,
    onArrived,
    onSent,
    onSwap,
    options,
    sent,
    side,
    to,
}: {
    arrived: number | null;
    from: Leg;
    onArrived: (text: string) => void;
    onSent: (text: string) => void;
    onSwap: () => void;
    options: readonly PickOption[];
    sent: number | null;
    side: ExchangeSide;
    to: Leg;
}) {
    const { labels, locale } = useExchangeLocale();
    const { detail } = useIntlayer("dashboard-transactions");
    const { flows } = useIntlayer("dashboard-accounts");
    const convert = (amount: number, currency: string) => {
        if (!sent || !arrived) {
            return Number.NaN;
        }
        return currency === from.currency ? (amount * arrived) / sent : (amount * sent) / arrived;
    };
    const currencies = [from.currency, to.currency].map((code): ExchangeCurrency => {
        const display = currencyDisplayFor(code);
        return { code, decimals: decimalsFor(code), name: display.name, symbol: display.symbol };
    });
    const held = (which: ExchangeSide) => ((which === "from" ? sent : arrived) ?? 0) > 0;
    const other = side === "from" ? "to" : "from";
    const shown = held(side) || !held(other) ? side : other;
    const update = (next: Required<ExchangeValue>) => {
        if (next.from !== from.currency) {
            onSwap();
            return;
        }
        const currency = next.side === "from" ? from.currency : to.currency;
        const text = next.amount === null ? "" : next.amount.toFixed(decimalsFor(currency));
        (next.side === "from" ? onSent : onArrived)(text);
    };
    const label = (leg: Leg, name: ReactNode) => (
        <span className="flex min-w-0 flex-col gap-1 [&_[data-slot=select-trigger]]:-ms-2 [&_[data-slot=select-trigger]]:me-0 [&_[data-slot=select-value]]:block! [&_[data-slot=select-value]]:truncate">
            <span className="sr-only">{name}</span>
            <Pick onPick={leg.onPick} options={options} quiet value={leg.id} />
            {leg.error ? (
                <span className="text-destructive text-[13px]" role="alert">
                    {leg.error}
                </span>
            ) : null}
        </span>
    );
    return (
        <Exchange
            className="w-full"
            convert={convert}
            currencies={currencies}
            labels={labels}
            locale={locale}
            onValueChange={update}
            value={{ amount: shown === "from" ? sent : arrived, from: from.currency, side: shown, to: to.currency }}
        >
            <Exchange.Field detail={from.detail} label={label(from, detail.from)} side="from" />
            <Exchange.Swap aria-label={flows.swap.value} />
            <Exchange.Field detail={to.detail} label={label(to, detail.to)} side="to" />
        </Exchange>
    );
}

export function TransferExchange({
    from,
    onChange,
    options,
    to,
    values,
}: {
    from: Omit<Leg, "id">;
    onChange: (next: NewTransferValues) => void;
    options: readonly PickOption[];
    to: Omit<Leg, "id">;
    values: NewTransferValues;
}) {
    const { ledger } = useDashboard();
    const { locale } = useExchangeLocale();
    const { detail } = useIntlayer("dashboard-transactions");
    const { flows } = useIntlayer("dashboard-accounts");
    const sent = parseAmount(values.sentText, decimalsFor(from.currency));
    const arrived = parseAmount(values.arrivedText, decimalsFor(to.currency));
    const priced = sent > 0 && arrived > 0;
    const official = marketRate(ledger, from.currency, to.currency, values.dateText);
    const unitIsFrom = arrived >= sent;
    const perUnit = (rate: number) =>
        detail.perUnit({
            currency: unitIsFrom ? from.currency : to.currency,
            rate: formatRate(unitIsFrom ? rate : 1 / rate, locale),
        }).value;
    return (
        <>
            <TransferAmounts
                arrived={values.arrivedText.trim() === "" ? null : arrived}
                from={{ ...from, id: values.fromId }}
                onArrived={(text) => onChange(withArrived(ledger, values, text))}
                onSent={(text) => onChange(withSent(ledger, values, text))}
                onSwap={() => onChange(swapped(ledger, values))}
                options={options}
                sent={values.sentText.trim() === "" ? null : sent}
                side={values.arrivedByHand ? "to" : "from"}
                to={{ ...to, id: values.toId }}
            />
            {priced ? (
                <Slot label={detail.rate} quiet={false}>
                    <div className="flex min-h-9 items-center justify-between gap-3">
                        <span className="dash-figure flex min-w-0 flex-wrap gap-x-2 text-sm">
                            <span className="whitespace-nowrap">{perUnit(arrived / sent)}</span>
                            {values.arrivedByHand && official !== null ? (
                                <span className="text-muted-foreground whitespace-nowrap">
                                    {flows.officialRate({ rate: perUnit(official) })}
                                </span>
                            ) : null}
                        </span>
                        {values.arrivedByHand && official !== null ? (
                            <Button
                                className="shrink-0"
                                onClick={() => onChange(repriced(ledger, { ...values, arrivedByHand: false }))}
                                size="sm"
                                type="button"
                                variant="ghost"
                            >
                                {flows.useOfficialRate}
                            </Button>
                        ) : null}
                    </div>
                </Slot>
            ) : null}
        </>
    );
}
