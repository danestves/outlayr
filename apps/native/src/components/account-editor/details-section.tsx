import {
    Button,
    Divider,
    HStack,
    Image,
    Picker,
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
    pickerStyle,
    submitLabel,
    tag,
    textInputAutocapitalization,
    tint,
} from "@expo/ui/swift-ui/modifiers";
import type { RefObject } from "react";

import { BODY, ROW, rowLabel } from "@/components/transaction-form/style";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { hitArea, outline } from "@/lib/swift-ui-geometry";

import type { AccountFields, CardFields } from "./use-account-form";

const SIGN_FONT = font({
    design: "rounded",
    textStyle: "body",
    weight: "medium",
});
const SIGN_HIT = 44;
const BALANCE_MIN_SCALE = 0.5;
const MONTH_DAYS = Array.from({ length: 31 }, (_, index) => index + 1);
const UNSET = "unset";

interface AccountEditorDetailsSectionProps extends AccountFields {
    hairline: ViewModifier[];
    mutedColor: string;
    nameFieldRef: RefObject<TextFieldRef | null>;
    nameState: ReturnType<typeof useNativeState<string>>;
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
    card,
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

            {card ? <CardRows card={card} hairline={hairline} mutedColor={mutedColor} tintColor={tintColor} /> : null}
        </VStack>
    );
}

interface CardRowsProps {
    card: CardFields;
    hairline: ViewModifier[];
    mutedColor: string;
    tintColor: string;
}

function CardRows({ card, hairline, mutedColor, tintColor }: CardRowsProps) {
    const limitValue = card.limitValue ?? card.notSetLabel;
    return (
        <>
            <HStack
                modifiers={[
                    ...ROW,
                    hitArea(outline.rectangle()),
                    onTapGesture(card.onLimitPress),
                    accessibilityElement("combine"),
                    accessibilityAddTraits(["isButton"]),
                    accessibilityLabel(card.limitLabel),
                    accessibilityValue(limitValue),
                ]}
            >
                <SwiftText modifiers={[BODY, rowLabel]}>{card.limitLabel}</SwiftText>
                <Spacer />
                <SwiftText modifiers={[BODY, foregroundStyle(card.limitValue ? tintColor : mutedColor), lineLimit(1)]}>
                    {limitValue}
                </SwiftText>
            </HStack>

            <Divider modifiers={hairline} />

            <DayRow
                card={card}
                label={card.statementDayLabel}
                onChange={card.onStatementDayChange}
                tintColor={tintColor}
                value={card.statementDay}
            />

            <Divider modifiers={hairline} />

            <DayRow
                card={card}
                label={card.paymentDayLabel}
                onChange={card.onPaymentDayChange}
                tintColor={tintColor}
                value={card.paymentDay}
            />

            <Divider modifiers={hairline} />
        </>
    );
}

interface DayRowProps {
    card: CardFields;
    label: string;
    onChange: (day: number | null) => void;
    tintColor: string;
    value: number | null;
}

function DayRow({ card, label, onChange, tintColor, value }: DayRowProps) {
    return (
        <HStack modifiers={ROW}>
            <SwiftText modifiers={[BODY, rowLabel]}>{label}</SwiftText>
            <Spacer />
            <Picker
                label={label}
                modifiers={[pickerStyle("menu"), tint(tintColor)]}
                onSelectionChange={(next) => onChange(next === UNSET ? null : Number(next))}
                selection={value === null ? UNSET : String(value)}
            >
                <SwiftText modifiers={[tag(UNSET)]}>{card.notSetLabel}</SwiftText>
                {MONTH_DAYS.map((day) => (
                    <SwiftText key={day} modifiers={[tag(String(day))]}>
                        {card.dayLabel(day)}
                    </SwiftText>
                ))}
            </Picker>
        </HStack>
    );
}
