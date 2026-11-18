import { PhoneFit } from "./phone-fit";
import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function LogPhone({ label, theme = "dark" }: SlotProps) {
    return (
        <PhoneFit dark={theme === "dark"}>
            <SlotPlaceholder fill label={label} name="log-phone" theme={theme} />
        </PhoneFit>
    );
}
