import { Replica } from "../replica";
import { PhoneFit } from "./phone-fit";
import type { SlotProps } from "./placeholder";

export function InsightsPhone({ theme = "dark" }: SlotProps) {
    return (
        <PhoneFit dark={theme === "dark"}>
            <Replica>{({ InsightsScreen }, locale) => <InsightsScreen locale={locale} theme={theme} />}</Replica>
        </PhoneFit>
    );
}
