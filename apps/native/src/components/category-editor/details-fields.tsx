import type { Ref } from "react";
import { View } from "react-native";
import type { TextInputInstance } from "react-native";

import { OutlinedDropdownField } from "@/components/material/outlined-dropdown-field";
import { OutlinedTextField } from "@/components/material/outlined-field";

import type { CategoryFields } from "./use-category-form";

type CategoryType = "expense" | "income";

interface CategoryDetailsFieldsProps extends CategoryFields {
    name: string;
    nameFieldRef?: Ref<TextInputInstance>;
}

export function CategoryDetailsFields({
    caption,
    failure,
    expenseLabel,
    income,
    incomeLabel,
    name,
    nameFieldRef,
    nameLabel,
    namePlaceholder,
    onIncomeChange,
    onNameChange,
    onSubmitName,
    typeLabel,
    typePickerVisible,
}: CategoryDetailsFieldsProps) {
    return (
        <View className="gap-4">
            {/* The failure takes the caption's slot, directly below the name field. */}
            <OutlinedTextField
                autoCapitalize="sentences"
                error={failure != null}
                label={nameLabel}
                onChangeText={onNameChange}
                onSubmitEditing={onSubmitName}
                placeholder={namePlaceholder}
                ref={nameFieldRef}
                returnKeyType="done"
                supportingText={failure ?? caption}
                value={name}
            />

            {typePickerVisible ? (
                <OutlinedDropdownField<CategoryType>
                    label={typeLabel}
                    onChange={(next) => onIncomeChange(next === "income")}
                    options={[
                        { label: expenseLabel, value: "expense" },
                        { label: incomeLabel, value: "income" },
                    ]}
                    value={income ? "income" : "expense"}
                />
            ) : null}
        </View>
    );
}
