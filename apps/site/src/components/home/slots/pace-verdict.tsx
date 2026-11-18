import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function PaceVerdict({ theme = "dark" }: SlotProps) {
    return (
        <Replica>
            {({ PaceVerdictFragment }, locale) => <PaceVerdictFragment fit locale={locale} theme={theme} />}
        </Replica>
    );
}
