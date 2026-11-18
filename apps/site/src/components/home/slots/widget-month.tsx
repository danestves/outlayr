import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function MonthWidget({ label, theme = "light" }: SlotProps) {
    return <SlotPlaceholder label={label} name="widget-month" radius="30px" ratio="378 / 177" theme={theme} />;
}
