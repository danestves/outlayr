import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function PaceChart({ label, theme = "dark" }: SlotProps) {
    return <SlotPlaceholder label={label} name="pace-chart" ratio="440 / 179" theme={theme} />;
}
