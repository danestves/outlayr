import type { Ref } from "react";
import { Pressable, View } from "react-native";
import type { TextInputInstance } from "react-native";

import { OutlinedSelectField, OutlinedTextField } from "@/components/material/outlined-field";
import { SwitchRow } from "@/components/material/switch-row";
import { Text } from "@/components/text";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

const SIGN_TARGET = 48;
const PRESSED_ALPHA = 0.1;

interface AccountDetailsFieldsProps {
    balanceEditA11y: string;
    balanceLabel: string;
    balanceSignA11y: string;
    /** Already formatted for the active language and currency, without its sign. */
    balanceValue: string;
    currencyCode: string;
    currencyLabel: string;
    kindLabel: string;
    liability: boolean;
    name: string;
    nameFieldRef?: Ref<TextInputInstance>;
    nameLabel: string;
    namePlaceholder: string;
    negative: boolean;
    onBalancePress: () => void;
    onCurrencyPress: () => void;
    onNameChange: (name: string) => void;
    onSubmitName: () => void;
    /** Omitted for a person, which hides the row. */
    onToggleLiability?: (next: boolean) => void;
    onToggleSign: () => void;
}

export function AccountDetailsFields({
    balanceEditA11y,
    balanceLabel,
    balanceSignA11y,
    balanceValue,
    currencyCode,
    currencyLabel,
    kindLabel,
    liability,
    name,
    nameFieldRef,
    nameLabel,
    namePlaceholder,
    negative,
    onBalancePress,
    onCurrencyPress,
    onNameChange,
    onSubmitName,
    onToggleLiability,
    onToggleSign,
}: AccountDetailsFieldsProps) {
    const m3 = useMaterialColors();
    return (
        <View className="gap-4">
            <OutlinedTextField
                autoCapitalize="words"
                label={nameLabel}
                onChangeText={onNameChange}
                onSubmitEditing={onSubmitName}
                placeholder={namePlaceholder}
                ref={nameFieldRef}
                returnKeyType="done"
                value={name}
            />

            <OutlinedSelectField
                accessibilityValue={currencyCode}
                label={currencyLabel}
                onPress={onCurrencyPress}
                value={
                    <Text className="text-body font-sans" style={{ color: m3.onSurface }}>
                        {currencyCode}
                    </Text>
                }
            />

            {/* The only thing that tells a card from an overdrawn current account. */}
            {onToggleLiability ? <SwitchRow label={kindLabel} onChange={onToggleLiability} value={liability} /> : null}

            <OutlinedSelectField
                accessibilityHint={balanceEditA11y}
                accessibilityValue={`${negative ? "−" : "+"}${balanceValue}`}
                dropdown={false}
                label={balanceLabel}
                leading={
                    <Pressable
                        accessibilityLabel={balanceSignA11y}
                        accessibilityRole="button"
                        android_ripple={{ borderless: true, color: withAlpha(m3.onSurface, PRESSED_ALPHA) }}
                        className="items-center justify-center"
                        onPress={onToggleSign}
                        style={{ height: SIGN_TARGET, width: SIGN_TARGET }}
                    >
                        <Text
                            className="text-body font-mono"
                            style={{ color: negative ? m3.onSurface : m3.onSurfaceVariant }}
                        >
                            {negative ? "−" : "+"}
                        </Text>
                    </Pressable>
                }
                onPress={onBalancePress}
                value={
                    <Text className="text-body font-mono" numberOfLines={1} style={{ color: m3.onSurface }}>
                        {balanceValue}
                    </Text>
                }
            />
        </View>
    );
}
