import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function TodayWidget({ label, theme = "light" }: SlotProps) {
    return <SlotPlaceholder label={label} name="widget-today" radius="30px" ratio="1 / 1" theme={theme} />;
}
