import { stretch } from "@/components/dashboard/accounts/parts";

import { FLOW_HEIGHT, HUB_COLOR, SOURCE_GAP, TARGET_GAP, placed, ribbon } from "../flow";
import type { Band, PlacedBand } from "../flow";

const half = (color: string) => `color-mix(in oklab, ${color} 50%, transparent)`;

function Bars({ bands, className }: { bands: readonly PlacedBand[]; className: string }) {
    return (
        <span className={`relative shrink-0 ${className}`}>
            {bands.map((band) => (
                <span
                    className="absolute inset-x-0 rounded-[inherit]"
                    key={band.id}
                    style={{ background: band.color, height: band.edge.height, top: band.edge.y }}
                />
            ))}
        </span>
    );
}

function Ribbons({ bands, grow, into }: { bands: readonly PlacedBand[]; grow: number; into: boolean }) {
    return (
        <span className="relative min-w-0 basis-0" style={{ flexGrow: grow }}>
            <svg className="absolute inset-0 size-full" ref={stretch} viewBox={`0 0 100 ${FLOW_HEIGHT}`}>
                {bands.map((band) => (
                    <path
                        d={into ? ribbon(band.edge, band.hub) : ribbon(band.hub, band.edge)}
                        fill={half(band.color)}
                        key={band.id}
                    />
                ))}
            </svg>
        </span>
    );
}

interface SankeyProps {
    label: string;
    sources: readonly Band[];
    targets: readonly Band[];
}

/** Money in at the left, the hub, money out at the right. The legend and the table name the bands. */
export function Sankey({ label, sources, targets }: SankeyProps) {
    const left = placed(sources, SOURCE_GAP);
    const right = placed(targets, TARGET_GAP);
    return (
        <div
            aria-label={label}
            className="mr-3 ml-3.5 flex"
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an img element cannot hold the drawn chart, so the container is named by role.
            role="img"
            style={{ height: FLOW_HEIGHT }}
        >
            <Bars bands={left} className="w-2.5 rounded-xs" />
            <Ribbons bands={left} grow={116} into />
            <span className="w-[2.5px] shrink-0" style={{ background: HUB_COLOR }} />
            <Ribbons bands={right} grow={179.5} into={false} />
            <Bars bands={right} className="w-1.5 rounded-[1.5px]" />
        </div>
    );
}
