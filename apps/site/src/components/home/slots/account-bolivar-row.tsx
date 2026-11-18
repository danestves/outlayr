import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function AccountBolivarRow({ label, theme = "dark" }: SlotProps) {
    return <SlotPlaceholder label={label} name="account-bolivar-row" ratio="400 / 68" theme={theme} />;
}
