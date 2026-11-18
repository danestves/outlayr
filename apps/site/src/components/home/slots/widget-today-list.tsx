import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function TodayListWidget({ label, theme = "light" }: SlotProps) {
    return <SlotPlaceholder label={label} name="widget-today-list" radius="30px" ratio="378 / 177" theme={theme} />;
}
