import { Stack } from "expo-router";

import { useMaterialColors } from "@/theme/use-material-colors";

import type { SearchBar as SearchBarBase } from "./search-bar";

export type { SearchBarProps } from "./search-bar";

/** On Android `barTintColor` paints the plate and drops the underline; `tintColor` does nothing. */
export const SearchBar: typeof SearchBarBase = ({ onChangeText, onClose, placeholder }) => {
    const m3 = useMaterialColors();
    return (
        <Stack.SearchBar
            autoFocus
            barTintColor={m3.surface}
            headerIconColor={m3.onSurfaceVariant}
            hideWhenScrolling={false}
            hintTextColor={m3.onSurfaceVariant}
            onChangeText={(event) => onChangeText(event.nativeEvent.text)}
            onClose={onClose}
            placeholder={placeholder}
            shouldShowHintSearchIcon={false}
            textColor={m3.onSurface}
        />
    );
};
