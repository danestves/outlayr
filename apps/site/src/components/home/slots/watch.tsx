import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function WatchFace({ label, theme = "light" }: SlotProps) {
    return <SlotPlaceholder label={label} name="watch" radius="22%" ratio="600 / 960" theme={theme} />;
}
