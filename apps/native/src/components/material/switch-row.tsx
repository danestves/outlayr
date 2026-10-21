export interface SwitchRowProps {
    label: string;
    value: boolean;
    onChange: (next: boolean) => void;
}

// iOS has no Compose (`MaterialHost` throws there), so this renders nothing; iOS forms use a SwiftUI `Toggle`.
export function SwitchRow(_props: SwitchRowProps) {
    return null;
}
