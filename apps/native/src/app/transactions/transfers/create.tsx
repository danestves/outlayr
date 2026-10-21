import { isPickableCurrency } from "@outlayr/money/currency";
import { useLocalSearchParams } from "expo-router";

import { CloseToolbar } from "@/components/close-toolbar";
import { ScreenHeader } from "@/components/screen-header";
import TransferEditor from "@/components/transfer-editor";
import { AMOUNT_CEILING } from "@/domain/numpad";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import { useTranslation } from "@/i18n/context";

export default function TransferCreateScreen() {
    const { leave, setDirty } = useDiscardGuard();
    const t = useTranslation();
    const params = useLocalSearchParams<{
        amount?: string;
        currency?: string;
        /** Epoch milliseconds. */
        date?: string;
        fromAccountId?: string;
        /** "1" when the voice draft named a source the ledger could not place. */
        fromUnresolved?: string;
        note?: string;
        toAccountId?: string;
        toUnresolved?: string;
    }>();
    const amount = Number(params.amount);
    const date = new Date(Number(params.date));
    const currencyKnown = params.currency === undefined || isPickableCurrency(params.currency);
    const seed = {
        amount: currencyKnown && amount > 0 && amount < AMOUNT_CEILING ? amount : undefined,
        currency: currencyKnown ? params.currency : undefined,
        date: date.getTime() > 0 ? date : undefined,
        fromAccountId: params.fromAccountId,
        fromUnresolved: params.fromUnresolved === "1",
        note: params.note,
        toAccountId: params.toAccountId,
        toUnresolved: params.toUnresolved === "1",
    };

    return (
        <>
            <ScreenHeader title={t("transfers.title")} />
            <CloseToolbar placement="left" />

            <TransferEditor onDirtyChange={setDirty} onDone={leave} seed={seed} />
        </>
    );
}
