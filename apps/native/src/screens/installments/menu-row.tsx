import { MenuView } from "@expo/ui/community/menu";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { View } from "react-native";

import { Text } from "@/components/text";
import { useColors } from "@/theme/use-colors";

interface MenuRowProps<Id extends string> {
    label: string;
    onPick: (id: Id) => void;
    options: readonly { id: Id; title: string }[];
    selected: Id | null;
    value: string;
}

/** The hosted menu sizes to its content, so the row passes the parent's width. */
export function MenuRow<Id extends string>({ label, onPick, options, selected, value }: MenuRowProps<Id>) {
    const colors = useColors();
    const [width, setWidth] = useState<number | null>(null);
    const row = (
        <View
            accessibilityLabel={label}
            accessibilityRole="button"
            accessibilityValue={{ text: value }}
            className="border-border flex-row items-center gap-3 border-b py-3.5"
            style={width === null ? undefined : { width }}
        >
            <Text className="text-body text-foreground flex-1">{label}</Text>
            <Text className="text-body text-muted" numberOfLines={1}>
                {value}
            </Text>
            <SymbolView
                name="chevron.up.chevron.down"
                size={13}
                tintColor={colors.subtle}
                type="monochrome"
                weight="semibold"
            />
        </View>
    );
    return (
        <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
            {width === null ? (
                row
            ) : (
                <MenuView
                    actions={options.map((option) => ({
                        id: option.id,
                        state: option.id === selected ? "on" : "off",
                        title: option.title,
                    }))}
                    onPressAction={({ nativeEvent }) => {
                        const picked = options.find((option) => option.id === nativeEvent.event);
                        if (picked) {
                            onPick(picked.id);
                        }
                    }}
                    shouldOpenOnLongPress={false}
                    style={{ width }}
                >
                    {row}
                </MenuView>
            )}
        </View>
    );
}
