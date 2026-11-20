import { Switch } from "panelui-web/switch";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { focusAmount } from "@/components/dashboard/transactions/entry-form";
import { MoneyField } from "@/components/ui/money-field";

export function SignedMoney({
    amount,
    autoFocus = false,
    className,
    currency,
    label,
    negative,
    onAmount,
    onNegative,
}: {
    amount: number | null;
    autoFocus?: boolean;
    className?: string;
    currency: string;
    label: ReactNode;
    negative: boolean;
    onAmount: (amount: number | null) => void;
    onNegative: (negative: boolean) => void;
}) {
    const { flows } = useIntlayer("dashboard-accounts");
    return (
        <MoneyField
            className={`max-w-none ${className ?? ""}`}
            codes={[currency]}
            detail={
                <label className="text-app-caption flex items-center gap-2">
                    <Switch checked={negative} onCheckedChange={onNegative} size="xs" />
                    {flows.negativeBalance}
                </label>
            }
            label={label}
            onValueChange={(next) => onAmount(next.amount)}
            ref={autoFocus ? focusAmount : undefined}
            value={{ amount, code: currency }}
        />
    );
}
