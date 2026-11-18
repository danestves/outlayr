import { HugeiconsIcon } from "@hugeicons/react";

import { glyphShade, TILE_WASH_OPACITY, withAlpha } from "../../../../native/src/theme/shade";
import { useReplica } from "./canvas";
import { solidCategoryIcon } from "./icons";
import type { LogoName } from "./ledger";

const GLYPH_RAMP = new Map<number, number>([
    [28, 15],
    [34, 18],
    [36, 20],
    [90, 42],
]);

const LOGO_ZOOM = 1.5;

function tileRadius(size: number): number {
    if (size >= 72) {
        return 20;
    }
    if (size >= 32) {
        return 10;
    }
    return 8;
}

export interface CategoryIconTileProps {
    color: string;
    future?: boolean;
    icon: string | null;
    logo?: LogoName | null;
    radius?: number;
    size?: number;
}

export function CategoryIconTile({
    color,
    future = false,
    icon,
    logo = null,
    radius,
    size = 34,
}: CategoryIconTileProps) {
    const { theme } = useReplica();
    const corner = radius ?? tileRadius(size);
    if (logo) {
        const drawn = size * LOGO_ZOOM;
        const inset = (size - drawn) / 2;
        return (
            <div
                style={{
                    borderRadius: corner,
                    height: size,
                    opacity: future ? 0.6 : 1,
                    overflow: "hidden",
                    width: size,
                }}
            >
                <img
                    alt=""
                    src={`/media/logos/${logo}${theme === "dark" ? "-dark" : ""}.webp`}
                    style={{ height: drawn, left: inset, position: "absolute", top: inset, width: drawn }}
                />
                <span
                    style={{
                        border: `${future ? 2 : 1}px solid ${withAlpha(color, future ? 0.73 : 0.2)}`,
                        borderRadius: corner,
                        inset: 0,
                        position: "absolute",
                    }}
                />
            </div>
        );
    }
    const surface = future
        ? { border: `2px dashed ${withAlpha(color, 0.73)}` }
        : { backgroundColor: withAlpha(color, TILE_WASH_OPACITY) };
    return (
        <div
            style={{
                alignItems: "center",
                borderRadius: corner,
                height: size,
                justifyContent: "center",
                opacity: future ? 0.6 : 1,
                width: size,
                ...surface,
            }}
        >
            <HugeiconsIcon
                color={glyphShade(color, theme === "dark")}
                icon={solidCategoryIcon(icon)}
                size={GLYPH_RAMP.get(size) ?? Math.round(size * 0.52)}
            />
        </div>
    );
}
