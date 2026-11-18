import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function UpcomingTotal({ theme = "dark" }: SlotProps) {
    return (
        <Replica>
            {({ UpcomingTotalFragment }, locale) => <UpcomingTotalFragment fit locale={locale} theme={theme} />}
        </Replica>
    );
}
