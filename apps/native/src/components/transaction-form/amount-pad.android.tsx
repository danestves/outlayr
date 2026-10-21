import ArrowDown01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowDown01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable } from "react-native";

import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import { AmountNumpad } from "../amount-numpad";
import { Text } from "../text";
import type { TransactionFormAmountPad as TransactionFormAmountPadBase } from "./amount-pad";
import { TransactionStage } from "./stage/stage";

const PRESSED_ALPHA = 0.1;

export const TransactionFormAmountPad: typeof TransactionFormAmountPadBase = ({
    backLabel,
    code,
    footer,
    forward,
    label,
    minorUnits,
    mode,
    onBack,
    onChange,
    onCodePress,
    stepKey,
    value,
}) => {
    const t = useTranslation();
    const m3 = useMaterialColors();
    const largeText = useAccessibilityTextSize();
    const currency = onCodePress ? (
        <Pressable
            accessibilityLabel={t("transaction.amount.changeCurrency")}
            accessibilityRole="button"
            accessibilityValue={{ text: code }}
            android_ripple={{ color: withAlpha(m3.onSurface, PRESSED_ALPHA) }}
            className="border-m3-outline h-8 flex-row items-center gap-1 overflow-hidden rounded-lg border pr-2 pl-3"
            onPress={onCodePress}
        >
            <Text className="font-sans-medium text-caption text-m3-on-surface-variant">{code}</Text>
            <HugeiconsIcon color={m3.onSurfaceVariant} icon={ArrowDown01Icon} size={18} />
        </Pressable>
    ) : (
        <Text className="font-sans-medium text-caption text-m3-on-surface-variant">{code}</Text>
    );

    const body = (
        <AmountNumpad
            code={code}
            minorUnits={minorUnits}
            mode={mode}
            onChange={onChange}
            showDisplay={false}
            value={value}
        />
    );
    const shared =
        onCodePress && !largeText
            ? { footer, forward, right: currency, stepKey }
            : { footer, forward, right: currency, stepKey, title: label };

    return onBack && backLabel ? (
        <TransactionStage {...shared} backLabel={backLabel} onBack={onBack}>
            {body}
        </TransactionStage>
    ) : (
        <TransactionStage {...shared}>{body}</TransactionStage>
    );
};
