import { useLocalSearchParams } from "expo-router";

import { CloseToolbar } from "@/components/close-toolbar";
import { ScreenHeader } from "@/components/screen-header";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import { useTranslation } from "@/i18n/context";
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

export default function NewInstallmentPurchaseRoute() {
    const { leave, setDirty } = useDiscardGuard();
    const t = useTranslation();
    const params = useLocalSearchParams<{ accountId?: string | string[]; amount?: string | string[] }>();

    return (
        <>
            <ScreenHeader title={t("accounts.add.installments")} />
            <CloseToolbar placement="left" />
            <NewInstallmentPurchase
                accountId={single(params.accountId)}
                amount={amountParam(single(params.amount))}
                onDirtyChange={setDirty}
                onDone={leave}
            />
        </>
    );
}
