import { use } from "react";

import { AmountsHiddenContext } from "@/components/amount-text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { formatSignedAmount } from "@/domain/account-display";
import { formatAmount, maskedAmount } from "@/domain/money";
import { useLanguage } from "@/i18n/context";

export function useMoney(code: string) {
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    const { showCents } = useDisplaySettings().state;
    const mask = maskedAmount(code);
    return {
        balance: (amount: number) => (hidden ? mask : formatSignedAmount(amount, code, showCents, language)),
        exact: (amount: number) => (hidden ? mask : formatAmount(amount, code, showCents, language)),
        net: (amount: number) =>
            hidden ? mask : `${amount < 0 ? "-" : "+"}${formatAmount(Math.abs(amount), code, showCents, language)}`,
        rounded: (amount: number) => (hidden ? mask : formatAmount(amount, code, false, language)),
    };
}

export type Money = ReturnType<typeof useMoney>;
