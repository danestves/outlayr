import type { SankeyLink, SankeyNode } from "@/components/charts/sankey-chart";

export const HUB_COLOR = "var(--color-foreground)";
export const KEPT_COLOR = "color-mix(in oklab, var(--color-foreground) 18%, var(--color-background))";

const INCOME_OPACITY = [0.7, 0.9] as const;
const SPEND_OPACITY = [0.35, 1] as const;

export interface FlowNames {
    hub: string;
    savings: string;
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

const OUT_PREFIX = "out:";

function styled(node: SankeyNode, names: FlowNames): SankeyNode {
    if (node.id === "hub") {
        return { ...node, color: HUB_COLOR, label: names.hub };
    }
    if (node.id === "savings") {
        return { ...node, bar: false, color: KEPT_COLOR, label: names.savings };
    }
    if (node.id === "kept") {
        return { ...node, color: KEPT_COLOR };
    }
    return node.id.startsWith(OUT_PREFIX) ? node : { ...node, bar: false };
}

export function flowOf({ links, nodes }: FlowInput, names: FlowNames) {
    const ordered = [...nodes.filter((node) => node.id !== "kept"), ...nodes.filter((node) => node.id === "kept")];
    const position = new Map(ordered.map((node, index) => [node.id, index]));
    const sorted = links
        .toSorted((a, b) => (position.get(a.target) ?? 0) - (position.get(b.target) ?? 0))
        .map((link): SankeyLink => {
            if (link.target === "kept") {
                return { ...link, color: KEPT_COLOR, opacity: SPEND_OPACITY };
            }
            return { ...link, opacity: link.target === "hub" ? INCOME_OPACITY : SPEND_OPACITY };
        });
    const rows = sorted.flatMap((link): FlowRow[] => {
        if (link.value <= 0) {
            return [];
        }
        if (link.target === "kept") {
            return [{ amount: link.value, id: "kept", kind: "kept" }];
        }
        return link.target.startsWith(OUT_PREFIX)
            ? [{ amount: link.value, id: link.target.slice(OUT_PREFIX.length), kind: "category" }]
            : [];
    });
    return { links: sorted, nodes: ordered.map((node) => styled(node, names)), rows };
}
