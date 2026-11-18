import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function AccountsList({ label, theme = "dark" }: SlotProps) {
    return <SlotPlaceholder label={label} name="accounts-list" ratio="400 / 476" theme={theme} />;
}
