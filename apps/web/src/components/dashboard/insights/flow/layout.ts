export const NODE_WIDTH = 12;
export const RIGHT_LABEL = 132;
const HUB_AT = 330 / 760;
const BOTTOM = { drill: 20, flow: 8 } as const;
/** What the hub's name and note need above it. */
const HUB_HEAD = 38;
/** How many bars the right side keeps before the smallest fold into one, so every label has room. */
const MOST_TARGETS = 12;
const SETTINGS = {
    drill: { gap: 32, left: 86, top: 20 },
    flow: { gap: 20, left: 112, top: 6 },
} as const;

export type SankeyMode = keyof typeof SETTINGS;

export interface Placed {
    /** Where its ribbon meets the hub. */
    hubY: number;
    height: number;
    id: string;
    y: number;
}

export interface SankeyLayout {
    hub: { height: number; x: number; y: number };
    left: number;
    right: number;
    sources: Placed[];
    targets: Placed[];
}

interface Sized {
    amount: number;
    id: string;
}

const sum = (nodes: readonly Sized[]) => nodes.reduce((all, node) => all + node.amount, 0);

/** Sources stacked on the left and centred on the hub, targets down the right from the top, the hub between them. */
export function sankeyLayout(
    mode: SankeyMode,
    width: number,
    height: number,
    sources: readonly Sized[],
    targets: readonly Sized[]
): SankeyLayout {
    const { gap, left, top } = SETTINGS[mode];
    const room = height - top - BOTTOM[mode];
    const whole = Math.max(sum(sources), sum(targets));
    const spare = Math.max(gap * Math.max(targets.length - 1, 0), 2 * (HUB_HEAD - top));
    const scale = whole > 0 ? Math.max(room - spare, 0) / whole : 0;
    const hubHeight = whole * scale;
    const hubY = top + (room - hubHeight) / 2;
    const hubX = Math.round(width * HUB_AT);
    const stacked = sum(sources) * scale + gap * Math.max(sources.length - 1, 0);
    let sourceY = top + (room - stacked) / 2;
    let attach = hubY;
    const placedSources = sources.map((node): Placed => {
        const placed = { height: node.amount * scale, hubY: attach, id: node.id, y: sourceY };
        sourceY += placed.height + gap;
        attach += placed.height;
        return placed;
    });
    let targetY = top;
    attach = hubY;
    const placedTargets = targets.map((node): Placed => {
        const placed = { height: node.amount * scale, hubY: attach, id: node.id, y: targetY };
        targetY += placed.height + gap;
        attach += placed.height;
        return placed;
    });
    return {
        hub: { height: hubHeight, x: hubX, y: hubY },
        left,
        right: width - RIGHT_LABEL,
        sources: placedSources,
        targets: placedTargets,
    };
}

/** The largest targets as they are and the rest as one. A lone leftover stays itself. */
export function foldTail<Node extends { amount: number }>(nodes: readonly Node[], other: (amount: number) => Node) {
    if (nodes.length <= MOST_TARGETS + 1) {
        return [...nodes];
    }
    const rest = nodes.slice(MOST_TARGETS).reduce((all, node) => all + node.amount, 0);
    return [...nodes.slice(0, MOST_TARGETS), other(rest)];
}

/** A ribbon between two bars as a closed path, easing from one height to the other across the gap. */
export function ribbon(x0: number, y0: number, x1: number, y1: number, height: number) {
    const middle = (x0 + x1) / 2;
    return `M${x0} ${y0}C${middle} ${y0} ${middle} ${y1} ${x1} ${y1}L${x1} ${y1 + height}C${middle} ${y1 + height} ${middle} ${y0 + height} ${x0} ${y0 + height}Z`;
}
