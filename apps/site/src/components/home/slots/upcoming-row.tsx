import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function UpcomingRow({ entry = "Verizon", theme = "dark" }: SlotProps & { entry?: string }) {
    return (
        <Replica>
            {({ UpcomingRowFragment }, locale) => (
                <UpcomingRowFragment entry={entry} fit locale={locale} theme={theme} />
            )}
        </Replica>
    );
}
