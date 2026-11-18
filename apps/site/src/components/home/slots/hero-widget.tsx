import type { SmallWidgetKind } from "@/components/app-ui/widgets";

import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function HeroWidget({ theme = "light", widget = "insights" }: SlotProps & { widget?: SmallWidgetKind }) {
    return (
        <Replica>
            {({ SmallWidget }, locale) => <SmallWidget fit kind={widget} locale={locale} theme={theme} />}
        </Replica>
    );
}
