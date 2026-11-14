import type { SankeyLink, SankeyNode } from "panelui-web/sankey-chart";

export const HUB_COLOR = "var(--color-foreground)";
export const KEPT_COLOR = "color-mix(in oklab, var(--color-foreground) 32%, var(--color-card))";
export const OTHER_COLOR = "var(--color-muted-foreground)";
export const SAVINGS_COLOR = "var(--color-app-spend)";

export const FLOW_HEIGHT = 184;
export const SOURCE_GAP = 5;
export const TARGET_GAP = 6.5;

const SHOWN = 4;
const OUT_PREFIX = "out:";

export type BandKind = "category" | "kept" | "other" | "savings";

export interface Band {
    amount: number;
    color: string;
    id: string;
    kind: BandKind;
    /** A category's own name; the other kinds are named by the screen. */
    name: string | null;
}

export interface FlowRow {
    amount: number;
    id: string;
    kind: "category" | "kept";
}

interface FlowInput {
    links: readonly SankeyLink[];
    nodes: readonly SankeyNode[];
}

/** The largest bands as they are, the rest as one. A lone leftover stays itself. */
function folded(bands: readonly Band[]): Band[] {
    if (bands.length <= SHOWN + 1) {
        return [...bands];
    }
    const rest = bands.slice(SHOWN).reduce((sum, band) => sum + band.amount, 0);
    return [...bands.slice(0, SHOWN), { amount: rest, color: OTHER_COLOR, id: "other", kind: "other", name: null }];
}

/** What flows into the hub and out of it, as the phone draws it: a few bands a side, and every category as a row. */
export function flowOf({ links, nodes }: FlowInput) {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const flowing = links.filter((link) => link.value > 0);
    const banded = (id: string, amount: number): Band => {
        const node = byId.get(id);
        return { amount, color: node?.color ?? OTHER_COLOR, id, kind: "category", name: node?.label ?? null };
    };
    const sources = flowing
        .filter((link) => link.target === "hub")
        .map((link): Band =>
            link.source === "savings"
                ? { amount: link.value, color: SAVINGS_COLOR, id: "savings", kind: "savings", name: null }
                : banded(link.source, link.value)
        );
    const spending = flowing
        .filter((link) => link.target.startsWith(OUT_PREFIX))
        .map((link) => banded(link.target, link.value));
    const kept = flowing
        .filter((link) => link.target === "kept")
        .map((link): Band => ({ amount: link.value, color: KEPT_COLOR, id: "kept", kind: "kept", name: null }));
    const rows = [...spending, ...kept].map((band): FlowRow => ({
        amount: band.amount,
        id: band.kind === "kept" ? band.id : band.id.slice(OUT_PREFIX.length),
        kind: band.kind === "kept" ? "kept" : "category",
    }));
    return { rows, sources: folded(sources), targets: [...folded(spending), ...kept] };
}

interface Span {
    height: number;
    y: number;
}

export interface PlacedBand extends Band {
    /** Its bar at the chart's edge, with gaps between bars. */
    edge: Span;
    /** Where its ribbon meets the hub, stacked without gaps. */
    hub: Span;
}

/** Bars down one edge of the chart and their ends on the hub, which runs the full height. */
export function placed(bands: readonly Band[], gap: number): PlacedBand[] {
    const whole = bands.reduce((sum, band) => sum + band.amount, 0);
    if (whole <= 0) {
        return [];
    }
    const room = FLOW_HEIGHT - gap * (bands.length - 1);
    let edge = 0;
    let hub = 0;
    return bands.map((band) => {
        const share = band.amount / whole;
        const at = { ...band, edge: { height: share * room, y: edge }, hub: { height: share * FLOW_HEIGHT, y: hub } };
        edge += at.edge.height + gap;
        hub += at.hub.height;
        return at;
    });
}

/** A ribbon across a 100-wide box, easing from one span to the other. */
export function ribbon(from: Span, to: Span) {
    const [a, b, c, d] = [from.y, to.y, to.y + to.height, from.y + from.height];
    return `M0 ${a}C50 ${a} 50 ${b} 100 ${b}L100 ${c}C50 ${c} 50 ${d} 0 ${d}Z`;
}
