import { Replica } from "../replica";
import { PhoneFit } from "./phone-fit";
import type { SlotProps } from "./placeholder";

export function LogPhone({ theme = "dark" }: SlotProps) {
    return (
        <PhoneFit dark={theme === "dark"}>
            <Replica>{({ LogScreen }, locale) => <LogScreen locale={locale} theme={theme} />}</Replica>
        </PhoneFit>
    );
}
