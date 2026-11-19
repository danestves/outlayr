import type { SmallWidgetKind } from "@/components/app-ui/widgets";

import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function TodayWidget({ theme = "light", widget = "log" }: SlotProps & { widget?: SmallWidgetKind }) {
    return (
        <Replica>
            {({ SmallWidget }, locale) => <SmallWidget fit kind={widget} locale={locale} theme={theme} withSaved />}
        </Replica>
    );
}
