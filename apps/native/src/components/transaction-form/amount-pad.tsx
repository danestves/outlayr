import ArrowDown01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowDown01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";

import { GlassButton } from "@/components/glass-button";
import type { NumpadKey, NumpadMode } from "@/domain/numpad";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import { AmountNumpad } from "../amount-numpad";
import { Text } from "../text";
import { TransactionStage } from "./stage/stage";
import type { StageFooter } from "./stage/stage";

interface TransactionFormAmountPadProps {
    backLabel?: string;
    code: string;
    footer?: StageFooter;
    forward?: boolean;
    label: string;
    minorUnits: number;
    mode?: NumpadMode;
    onBack?: () => void;
    onChange: (next: string, key: NumpadKey) => void;
    onCodePress?: () => void;
    stepKey: string;
    value: string;
}

// Docked as a stage body, not a `BottomSheet native`: a second platform sheet insets the form, drops it from the
// accessibility tree on every amount tap, and stops the form taking a detent of its own.
export function TransactionFormAmountPad({
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
}: TransactionFormAmountPadProps) {
    const t = useTranslation();
    const colors = useColors();
    const largeText = useAccessibilityTextSize();
    // 500 is the heaviest mono weight `_layout.tsx` loads.
    const codeText = <Text className="text-callout text-foreground tracking-eyebrow font-mono-medium">{code}</Text>;
    // Not the stage's `rightAction`: that draws a tinted sans label, and the code must stay mono to read as the unit.
    const currency = onCodePress ? (
        <GlassButton
            accessibilityLabel={t("transaction.amount.changeCurrency")}
            accessibilityValue={{ text: code }}
            className="min-h-[42px] rounded-full pr-3 pl-4"
            onPress={onCodePress}
        >
            {codeText}
            <HugeiconsIcon color={colors.muted} icon={ArrowDown01Icon} size={16} />
        </GlassButton>
    ) : (
        codeText
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

    // Branched, not spread: a spread optional pair does not narrow to the stage's `onBack`/`backLabel` union.
    return onBack && backLabel ? (
        <TransactionStage {...shared} backLabel={backLabel} onBack={onBack}>
            {body}
        </TransactionStage>
    ) : (
        <TransactionStage {...shared}>{body}</TransactionStage>
    );
}
