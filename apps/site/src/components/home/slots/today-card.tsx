import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function TodayCard({ label, theme = "light" }: SlotProps) {
    return <SlotPlaceholder label={label} name="today-card" radius="28px" ratio="360 / 258" theme={theme} />;
}
