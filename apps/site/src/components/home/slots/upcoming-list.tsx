import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function UpcomingList({ theme = "dark" }: SlotProps) {
    return (
        <Replica>
            {({ UpcomingListFragment }, locale) => <UpcomingListFragment fit locale={locale} theme={theme} />}
        </Replica>
    );
}
