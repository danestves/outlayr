import type { MediumWidgetKind } from "@/components/app-ui/widgets";

import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function MonthWidget({ theme = "light", widget = "budget" }: SlotProps & { widget?: MediumWidgetKind }) {
    return (
        <Replica>
            {({ MediumWidget }, locale) => <MediumWidget fit kind={widget} locale={locale} theme={theme} />}
        </Replica>
    );
}
