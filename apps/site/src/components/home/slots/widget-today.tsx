import type { SmallWidgetKind } from "@/components/app-ui/widgets";

import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function TodayWidget({ theme = "light", widget = "log" }: SlotProps & { widget?: SmallWidgetKind }) {
    return (
        <Replica>
            {({ SmallWidget, SAVED }, locale) => (
                <SmallWidget extra={SAVED} fit kind={widget} locale={locale} theme={theme} />
            )}
        </Replica>
    );
}
