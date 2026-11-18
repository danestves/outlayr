import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function HeroWidget({ label, theme = "light" }: SlotProps) {
    return <SlotPlaceholder label={label} name="hero-widget" radius="12%" ratio="1 / 1" theme={theme} />;
}
