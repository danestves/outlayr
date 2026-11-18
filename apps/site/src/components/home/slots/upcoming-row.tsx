import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function UpcomingRow({ label, theme = "dark" }: SlotProps) {
    return <SlotPlaceholder label={label} name="upcoming-row" ratio="432 / 63" theme={theme} />;
}
