import { PhoneFit } from "./phone-fit";
import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function InsightsPhone({ label, theme = "dark" }: SlotProps) {
    return (
        <PhoneFit dark={theme === "dark"}>
            <SlotPlaceholder fill label={label} name="insights-phone" theme={theme} />
        </PhoneFit>
    );
}
