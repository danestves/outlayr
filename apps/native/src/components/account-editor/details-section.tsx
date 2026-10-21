import {
    Button,
    Divider,
    HStack,
    Image,
    Spacer,
    Text as SwiftText,
    TextField,
    Toggle,
    VStack,
} from "@expo/ui/swift-ui";
import type { TextFieldRef, useNativeState } from "@expo/ui/swift-ui";
import type { ViewModifier } from "@expo/ui/swift-ui/modifiers";
import {
    accessibilityAddTraits,
    accessibilityElement,
    accessibilityHidden,
    accessibilityLabel,
    accessibilityValue,
    buttonStyle,
    font,
    foregroundStyle,
    frame,
    labelsHidden,
    lineLimit,
    minimumScaleFactor,
    multilineTextAlignment,
    onSubmit,
    onTapGesture,
    submitLabel,
    textInputAutocapitalization,
    tint,
} from "@expo/ui/swift-ui/modifiers";
import type { RefObject } from "react";

import { BODY, ROW, rowLabel } from "@/components/transaction-form/style";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { hitArea, outline } from "@/lib/swift-ui-geometry";

const SIGN_FONT = font({
    design: "rounded",
    textStyle: "body",
    weight: "medium",
});
const SIGN_HIT = 44;
const BALANCE_MIN_SCALE = 0.5;

interface AccountEditorDetailsSectionProps {
    balanceEditA11y: string;
    balanceLabel: string;
    balanceSignA11y: string;
    balanceValue: string;
    currencyCode: string;
    currencyLabel: string;
    hairline: ViewModifier[];
    kindLabel: string;
    liability: boolean;
    mutedColor: string;
    nameFieldRef: RefObject<TextFieldRef | null>;
    nameLabel: string;
    namePlaceholder: string;
    nameState: ReturnType<typeof useNativeState<string>>;
    negative: boolean;
    onBalancePress: () => void;
    onCurrencyPress: () => void;
    onNameChange: (name: string) => void;
    onSubmitName: () => void;
    /** Omitted for a person, which hides the row. */
    onToggleLiability?: (next: boolean) => void;
    onToggleSign: () => void;
    tintColor: string;
}

// Every `Text` names `BODY`: outside a `Form` nothing applies the rounded face, so a bare label gets the system font.
export function AccountEditorDetailsSection({
    currencyCode,
    currencyLabel,
    balanceLabel,
    balanceSignA11y,
    balanceEditA11y,
    balanceValue,
    hairline,
    mutedColor,
    nameFieldRef,
    nameLabel,
    namePlaceholder,
    nameState,
    kindLabel,
    liability,
    negative,
    onBalancePress,
    onCurrencyPress,
    onNameChange,
    onSubmitName,
    onToggleLiability,
    onToggleSign,
    tintColor,
}: AccountEditorDetailsSectionProps) {
    const stacked = useAccessibilityTextSize();
    const balanceControls = (
        <>
            <Button modifiers={[buttonStyle("plain"), accessibilityLabel(balanceSignA11y)]} onPress={onToggleSign}>
                <SwiftText
                    modifiers={[
                        SIGN_FONT,
                        foregroundStyle(negative ? tintColor : mutedColor),
                        frame({ height: SIGN_HIT, width: SIGN_HIT }),
                        hitArea(outline.rectangle()),
                    ]}
                >
                    {negative ? "−" : "+"}
                </SwiftText>
            </Button>
            <Button modifiers={[buttonStyle("plain"), accessibilityLabel(balanceEditA11y)]} onPress={onBalancePress}>
                <SwiftText
                    modifiers={[BODY, foregroundStyle(tintColor), lineLimit(1), minimumScaleFactor(BALANCE_MIN_SCALE)]}
                >
                    {balanceValue}
                </SwiftText>
            </Button>
        </>
    );
    return (
        <VStack spacing={0}>
            <Divider modifiers={hairline} />

            <HStack modifiers={ROW}>
                <SwiftText modifiers={[BODY, rowLabel]}>{nameLabel}</SwiftText>
                <Spacer />
                <TextField
                    modifiers={[
                        BODY,
                        foregroundStyle(tintColor),
                        multilineTextAlignment("trailing"),
                        textInputAutocapitalization("words"),
                        submitLabel("done"),
                        onSubmit(onSubmitName),
                    ]}
                    onTextChange={onNameChange}
                    placeholder={namePlaceholder}
                    ref={nameFieldRef}
                    text={nameState}
                />
            </HStack>

            <Divider modifiers={hairline} />

            <HStack
                modifiers={[
                    ...ROW,
                    hitArea(outline.rectangle()),
                    onTapGesture(onCurrencyPress),
                    accessibilityElement("combine"),
                    accessibilityAddTraits(["isButton"]),
                    accessibilityLabel(currencyLabel),
                    accessibilityValue(currencyCode),
                ]}
            >
                <SwiftText modifiers={[BODY, rowLabel]}>{currencyLabel}</SwiftText>
                <Spacer />
                <SwiftText modifiers={[BODY, foregroundStyle(tintColor)]}>{currencyCode}</SwiftText>
                <Image
                    color={mutedColor}
                    modifiers={[
                        font({
                            design: "rounded",
                            textStyle: "footnote",
                            weight: "semibold",
                        }),
                    ]}
                    systemName="chevron.up.chevron.down"
                />
            </HStack>

            <Divider modifiers={hairline} />

            {/* The only thing that tells a card from an overdrawn current account. */}
            {onToggleLiability ? (
                <>
                    <HStack modifiers={ROW}>
                        <SwiftText modifiers={[BODY, rowLabel, accessibilityHidden()]}>{kindLabel}</SwiftText>
                        <Spacer />
                        <Toggle
                            isOn={liability}
                            label={kindLabel}
                            modifiers={[tint(tintColor), labelsHidden()]}
                            onIsOnChange={onToggleLiability}
                        />
                    </HStack>

                    <Divider modifiers={hairline} />
                </>
            ) : null}

            {stacked ? (
                <HStack modifiers={ROW}>
                    <VStack alignment="leading" spacing={0}>
                        <SwiftText modifiers={[BODY, rowLabel]}>{balanceLabel}</SwiftText>
                        <HStack>{balanceControls}</HStack>
                    </VStack>
                    <Spacer />
                </HStack>
            ) : (
                <HStack modifiers={ROW}>
                    <SwiftText modifiers={[BODY, rowLabel]}>{balanceLabel}</SwiftText>
                    <Spacer />
                    {balanceControls}
                </HStack>
            )}

            <Divider modifiers={hairline} />
        </VStack>
    );
}
