import type { CurrencyBucket } from "@outlayr/money/currency-totals";

import { DayTotal, MeasureCellAmount } from "@/components/amount-text";

interface OutTotalCellProps {
    fallbackCurrency: string;
    showCents: boolean;
    totals: readonly CurrencyBucket[];
}

// Several currencies get `DayTotal` so the strip never adds a USD row to an MXN one.
export function OutTotalCell({ totals, fallbackCurrency, showCents }: OutTotalCellProps) {
    if (totals.length > 1) {
        return <DayTotal showCents={showCents} sizeClass="text-body" totals={totals} />;
    }
    return (
        <MeasureCellAmount
            code={totals[0]?.currencyCode ?? fallbackCurrency}
            income={false}
            magnitude={Math.abs(totals[0]?.amount ?? 0)}
            positive={false}
            showCents={showCents}
        />
    );
}
