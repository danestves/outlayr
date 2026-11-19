import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function UpcomingRow({ theme = "dark" }: SlotProps) {
    return (
        <Replica>
            {({ UpcomingRowFragment }, locale) => <UpcomingRowFragment fit locale={locale} theme={theme} />}
        </Replica>
    );
}
