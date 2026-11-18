import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function AccountCardRow({ label, theme = "dark" }: SlotProps) {
    return <SlotPlaceholder label={label} name="account-card-row" ratio="400 / 68" theme={theme} />;
}
