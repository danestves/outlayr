import { PhoneFit } from "./phone-fit";
import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function HeroPhone({ label, theme = "light" }: SlotProps) {
    return (
        <PhoneFit dark={theme === "dark"}>
            <SlotPlaceholder fill label={label} name="hero-phone" theme={theme} />
        </PhoneFit>
    );
}
