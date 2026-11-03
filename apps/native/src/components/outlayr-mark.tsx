import Svg, { Path } from "react-native-svg";
import { useCSSVariable } from "uniwind";

import { BRAND_MARK_PATHS, BRAND_MARK_VIEWBOX } from "@/domain/brand-mark";

const VIEW_BOX = `0 0 ${BRAND_MARK_VIEWBOX.width} ${BRAND_MARK_VIEWBOX.height}`;

export function OutlayrMark({ color, size = 92 }: { color?: string; size?: number }) {
    // SAFETY: declared in global.css for both schemes, so it always resolves.
    const ink = useCSSVariable("--color-fr-ink") as string;
    return (
        <Svg height={size} viewBox={VIEW_BOX} width={size}>
            {BRAND_MARK_PATHS.map((path) => (
                <Path d={path} fill={color ?? ink} key={path} />
            ))}
        </Svg>
    );
}
