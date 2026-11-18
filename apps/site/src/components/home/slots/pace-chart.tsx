import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function PaceChart({ theme = "dark" }: SlotProps) {
    return (
        <Replica>
            {({ PaceChartFragment }, locale) => (
                <PaceChartFragment fit locale={locale} slot="pace-chart" theme={theme} />
            )}
        </Replica>
    );
}
