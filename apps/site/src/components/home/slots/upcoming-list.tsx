import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function UpcomingList({ label, theme = "dark" }: SlotProps) {
    return <SlotPlaceholder label={label} name="upcoming-list" ratio="432 / 378" theme={theme} />;
}
