import { isPickableCurrency } from "@outlayr/money/currency";
import { useLocalSearchParams } from "expo-router";

import { useDiscardGuard } from "@/hooks/use-discard-guard";
import { NewInstallmentPurchase } from "@/screens/installments/new-purchase";

const PLAIN_DECIMAL = /^\d+(?:\.\d+)?$/;

function single(value: string | string[] | undefined) {
    return Array.isArray(value) ? undefined : value;
}

function amountParam(value: string | undefined) {
    if (value === undefined || !PLAIN_DECIMAL.test(value)) {
        return undefined;
    }
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

function currencyParam(value: string | undefined) {
    return value !== undefined && isPickableCurrency(value) ? value : undefined;
}

export default function NewInstallmentPurchaseRoute() {
    const { leave, setDirty } = useDiscardGuard();
    const params = useLocalSearchParams<{
        accountId?: string | string[];
        amount?: string | string[];
        currency?: string | string[];
    }>();

    return (
        <NewInstallmentPurchase
            accountId={single(params.accountId)}
            amount={amountParam(single(params.amount))}
            currency={currencyParam(single(params.currency))}
            onDirtyChange={setDirty}
            onDone={leave}
        />
    );
}
