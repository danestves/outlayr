import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function NewEntryCard({ label, theme = "light" }: SlotProps) {
    return (
        <SlotPlaceholder
            label={label}
            name="new-entry"
            phoneRatio="358 / 237"
            radius="28px"
            ratio="450 / 202"
            theme={theme}
        />
    );
}
