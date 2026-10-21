export interface DropdownOption<T extends string> {
    value: T;
    label: string;
}

export interface OutlinedDropdownFieldProps<T extends string> {
    label: string;
    options: readonly DropdownOption<T>[];
    value: T;
    onChange: (next: T) => void;
    ground?: string;
}

// iOS has no Compose (`MaterialHost` throws there), so this renders nothing; iOS forms use a SwiftUI menu `Picker`.
export function OutlinedDropdownField<T extends string>(_props: OutlinedDropdownFieldProps<T>) {
    return null;
}
