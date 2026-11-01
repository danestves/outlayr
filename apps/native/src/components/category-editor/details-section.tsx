import { Divider, HStack, Picker, Spacer, Text as SwiftText, TextField, VStack } from "@expo/ui/swift-ui";
import type { TextFieldRef, useNativeState } from "@expo/ui/swift-ui";
import type { ViewModifier } from "@expo/ui/swift-ui/modifiers";
import {
    foregroundStyle,
    multilineTextAlignment,
    onSubmit,
    padding,
    pickerStyle,
    submitLabel,
    tag,
    textInputAutocapitalization,
    tint as tintModifier,
} from "@expo/ui/swift-ui/modifiers";
import type { RefObject } from "react";

import { BODY, CAPTION, ROW, rowLabel } from "@/components/transaction-form/style";

import type { CategoryFields } from "./use-category-form";

interface CategoryEditorDetailsSectionProps extends CategoryFields {
    dangerColor: string;
    hairline: ViewModifier[];
    mutedColor: string;
    nameFieldRef: RefObject<TextFieldRef | null>;
    nameState: ReturnType<typeof useNativeState<string>>;
    tintColor: string;
}

// Every `Text` names `BODY`: outside a `Form` nothing applies the rounded face.
export function CategoryEditorDetailsSection({
    caption,
    dangerColor,
    failure,
    expenseLabel,
    hairline,
    income,
    incomeLabel,
    mutedColor,
    nameFieldRef,
    nameLabel,
    namePlaceholder,
    nameState,
    onIncomeChange,
    onNameChange,
    onSubmitName,
    tintColor,
    typeLabel,
    typePickerVisible,
}: CategoryEditorDetailsSectionProps) {
    const footer = failure ?? caption;
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
                        textInputAutocapitalization("sentences"),
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

            {typePickerVisible ? (
                <VStack spacing={0}>
                    <HStack modifiers={ROW}>
                        <SwiftText modifiers={[BODY, rowLabel]}>{typeLabel}</SwiftText>
                        <Spacer />
                        <Picker
                            label=""
                            modifiers={[pickerStyle("menu"), tintModifier(tintColor)]}
                            onSelectionChange={(value) => onIncomeChange(value === "income")}
                            selection={income ? "income" : "expense"}
                        >
                            <SwiftText modifiers={[tag("expense")]}>{expenseLabel}</SwiftText>
                            <SwiftText modifiers={[tag("income")]}>{incomeLabel}</SwiftText>
                        </Picker>
                    </HStack>

                    <Divider modifiers={hairline} />
                </VStack>
            ) : null}

            {footer ? (
                <SwiftText
                    modifiers={[CAPTION, foregroundStyle(failure ? dangerColor : mutedColor), padding({ top: 10 })]}
                >
                    {footer}
                </SwiftText>
            ) : null}
        </VStack>
    );
}
