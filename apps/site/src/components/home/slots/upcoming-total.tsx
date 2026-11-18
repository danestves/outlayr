import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function UpcomingTotal({ label, theme = "dark" }: SlotProps) {
    return <SlotPlaceholder label={label} name="upcoming-total" ratio="440 / 68" theme={theme} />;
}
