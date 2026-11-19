import type { MediumWidgetKind } from "@/components/app-ui/widgets";

import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function TodayListWidget({ theme = "light", widget = "ledger" }: SlotProps & { widget?: MediumWidgetKind }) {
    return (
        <Replica>
            {({ MediumWidget }, locale) => <MediumWidget fit kind={widget} locale={locale} theme={theme} withSaved />}
        </Replica>
    );
}
