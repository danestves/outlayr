import { Divider, HStack, Image, Spacer, Text as SwiftText, TextField, VStack } from "@expo/ui/swift-ui";
import type { useNativeState } from "@expo/ui/swift-ui";
import type { ViewModifier } from "@expo/ui/swift-ui/modifiers";
import {
    accessibilityAddTraits,
    accessibilityElement,
    accessibilityLabel,
    accessibilityValue,
    font,
    foregroundStyle,
    multilineTextAlignment,
    onSubmit,
    onTapGesture,
    submitLabel,
    textInputAutocapitalization,
} from "@expo/ui/swift-ui/modifiers";

import { BODY, ROW, rowLabel } from "@/components/transaction-form/style";
import { hitArea, outline } from "@/lib/swift-ui-geometry";

import type { ProfileFields } from "./use-profile-form";

interface ProfileDetailsSectionProps extends ProfileFields {
    hairline: ViewModifier[];
    mutedColor: string;
    nameState: ReturnType<typeof useNativeState<string>>;
    tintColor: string;
}

export function ProfileDetailsSection({
    currencyCode,
    currencyLabel,
    hairline,
    mutedColor,
    nameLabel,
    namePlaceholder,
    nameState,
    onCurrencyPress,
    onNameChange,
    onSubmitName,
    tintColor,
}: ProfileDetailsSectionProps) {
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
                    text={nameState}
                />
            </HStack>

            <Divider modifiers={hairline} />

            {onCurrencyPress ? (
                <>
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
                            modifiers={[font({ design: "rounded", textStyle: "footnote", weight: "semibold" })]}
                            systemName="chevron.up.chevron.down"
                        />
                    </HStack>

                    <Divider modifiers={hairline} />
                </>
            ) : null}
        </VStack>
    );
}
