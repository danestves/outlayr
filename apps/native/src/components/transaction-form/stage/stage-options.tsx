import type { ReactNode } from "react";
import { View } from "react-native";

import { StageOption } from "./stage-option";

export interface StageOptionItem<Id extends string> {
    accessibilityLabel?: string;
    id: Id;
    label: string;
    leading?: ReactNode;
    trailing?: ReactNode;
}

interface StageOptionRowProps<Id extends string> {
    onSelect: (id: Id) => void;
    options: readonly StageOptionItem<Id>[];
    selectedId?: Id | null;
}

export function StageOptionRow<Id extends string>({ onSelect, options, selectedId }: StageOptionRowProps<Id>) {
    return (
        <View className="flex-row flex-wrap gap-2">
            {options.map((option) => (
                <StageOption
                    accessibilityLabel={option.accessibilityLabel}
                    key={option.id}
                    label={option.label}
                    leading={option.leading}
                    onPress={() => onSelect(option.id)}
                    selected={option.id === selectedId}
                    trailing={option.trailing}
                />
            ))}
        </View>
    );
}
