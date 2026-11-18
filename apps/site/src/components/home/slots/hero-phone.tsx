import { Replica } from "../replica";
import { PhoneFit } from "./phone-fit";
import type { SlotProps } from "./placeholder";

export function HeroPhone({ theme = "light" }: SlotProps) {
    return (
        <PhoneFit dark={theme === "dark"}>
            <Replica>{({ NewEntryScreen }, locale) => <NewEntryScreen locale={locale} theme={theme} />}</Replica>
        </PhoneFit>
    );
}
