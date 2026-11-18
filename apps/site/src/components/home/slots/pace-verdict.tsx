import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function PaceVerdict({ label, theme = "dark" }: SlotProps) {
    return <SlotPlaceholder label={label} name="pace-verdict" ratio="440 / 70" theme={theme} />;
}
