import { Stack } from "expo-router";

export interface SearchBarProps {
    onChangeText: (text: string) => void;
    onClose: () => void;
    placeholder: string;
}

export function SearchBar({ onChangeText, onClose, placeholder }: SearchBarProps) {
    return (
        <Stack.SearchBar
            autoFocus
            hideWhenScrolling={false}
            // Cancel closes the whole search; Android has none, so backing out of the field closes it.
            onCancelButtonPress={onClose}
            onClose={onClose}
            onChangeText={(event) => onChangeText(event.nativeEvent.text)}
            placeholder={placeholder}
        />
    );
}
