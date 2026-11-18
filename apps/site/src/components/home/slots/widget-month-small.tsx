import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function MonthWidgetSmall({ label, theme = "light" }: SlotProps) {
    return <SlotPlaceholder label={label} name="widget-month-small" radius="25px" ratio="1 / 1" theme={theme} />;
}
