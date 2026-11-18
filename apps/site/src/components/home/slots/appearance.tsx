import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function AppearanceRow({ label, theme = "dark" }: SlotProps) {
    return <SlotPlaceholder label={label} name="appearance" radius="14px" ratio="400 / 64.5" theme={theme} />;
}
