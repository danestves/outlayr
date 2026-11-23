import { isPickableCurrency } from "@outlayr/money/currency";
import { useLocalSearchParams } from "expo-router";

import { MAX_NAME_LENGTH } from "@/components/transaction-form/stage/step-merchant";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import { NewInstallmentPurchase } from "@/screens/installments/new-purchase";

const PLAIN_DECIMAL = /^\d+(?:\.\d+)?$/;
const EPOCH_MS = /^-?\d+$/;
const DAY_MS = 86_400_000;
// A link can carry any day; one far from today leaves no room to schedule every payment.
const PURCHASE_SPAN_MS = 50 * 366 * DAY_MS;

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

function nameParam(value: string | undefined) {
    const name = value?.trim() ?? "";
    return name === "" ? undefined : name.slice(0, MAX_NAME_LENGTH);
}

function dayParam(value: string | undefined) {
    if (value === undefined || !EPOCH_MS.test(value)) {
        return undefined;
    }
    const ms = Number(value);
    return Math.abs(ms - Date.now()) <= PURCHASE_SPAN_MS ? new Date(ms) : undefined;
}

export default function NewInstallmentPurchaseRoute() {
    const { leave, setDirty } = useDiscardGuard();
    const params = useLocalSearchParams<{
        accountId?: string | string[];
        amount?: string | string[];
        categoryId?: string | string[];
        currency?: string | string[];
        day?: string | string[];
        name?: string | string[];
    }>();

    return (
        <NewInstallmentPurchase
            accountId={single(params.accountId)}
            amount={amountParam(single(params.amount))}
            categoryId={single(params.categoryId)}
            currency={currencyParam(single(params.currency))}
            day={dayParam(single(params.day))}
            name={nameParam(single(params.name))}
            onDirtyChange={setDirty}
            onDone={leave}
        />
    );
}
