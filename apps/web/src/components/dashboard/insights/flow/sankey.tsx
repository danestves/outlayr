import ArrowRight02Icon from "@hugeicons/core-free-icons/ArrowRight02Icon";
import { useId, useState } from "react";
import type { KeyboardEvent } from "react";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { cn } from "@/lib/utils";

import { useBox } from "../use-box";
import { NODE_WIDTH, ribbon, sankeyLayout } from "./layout";
import type { Placed, SankeyMode } from "./layout";

const RESTING = [0.2, 0.62] as const;
const UNMEASURED = { height: 680, width: 760 };
const DRAWN_ON = [0.62, 0.3] as const;
const DIMMED = [0.05, 0.1] as const;
const ACTIVE = [0.55, 0.95] as const;
const MIN_BAR = 2;
const TIP_WIDTH = 244;
const TIP_HEIGHT = 168;
const TIP_GAP = 7;
const LABEL_GAP = 12;
const NAME_LIFT = 2;
const NOTE_DROP = 14;
const HUB_NAME_LIFT = 24;
const HUB_NOTE_LIFT = 8;

export interface ChartTip {
    open?: string;
    rows: readonly { label: string; tone?: "poor"; value: string }[];
    title: string;
    value: string;
}

export interface ChartNode {
    amount: number;
    categoryId: string | null;
    /** The ribbon's own colour when it differs from the bar's. */
    ribbon?: string;
    color: string;
    id: string;
    label: string;
    name: string;
    note: string;
    tip: ChartTip;
    tone: "category" | "kept" | "savings";
}

interface Hub {
    color: string;
    label: string;
    note: string;
}

interface SankeyProps {
    active: string | null;
    drawnOn: boolean;
    hub: Hub;
    label: string;
    mode: SankeyMode;
    onActive: (id: string | null) => void;
    onOpen?: (node: ChartNode) => void;
    sources: readonly ChartNode[];
    targets: readonly ChartNode[];
}

function Gradient({ id, color, stops }: { color: string; id: string; stops: readonly [number, number] }) {
    return (
        <linearGradient id={id} x1="0" x2="1">
            <stop offset="0" style={{ stopColor: color, stopOpacity: stops[0] }} />
            <stop offset="1" style={{ stopColor: color, stopOpacity: stops[1] }} />
        </linearGradient>
    );
}

function Tip({ color, tip }: { color: string; tip: ChartTip }) {
    return (
        <div className="bg-popover border-border pointer-events-none flex flex-col rounded-xl border px-3.5 py-3 shadow-lg">
            <div className="flex items-center gap-2 text-[13px] font-medium">
                <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />
                {tip.title}
            </div>
            <div className="dash-figure mt-1.5 text-lg leading-[26px] font-semibold tracking-[-0.03em]">
                {tip.value}
            </div>
            <div className="mt-1 flex flex-col">
                {tip.rows.map((row) => (
                    <div className="text-muted-foreground flex justify-between text-[13px] leading-5" key={row.label}>
                        <span>{row.label}</span>
                        <span className={cn("dash-figure", row.tone === "poor" && "text-(--color-app-spend)")}>
                            {row.value}
                        </span>
                    </div>
                ))}
            </div>
            {tip.open ? (
                <div className="border-app-strong mt-2 flex items-center justify-between border-t pt-2 text-[13px] leading-5">
                    <span>{tip.open}</span>
                    <Glyph className="text-muted-foreground" icon={ArrowRight02Icon} size={14} />
                </div>
            ) : null}
        </div>
    );
}

type Side = "source" | "target";

/** The flow as bars and ribbons filling their panel. Hovering or focusing a bar lights its ribbon. */
export function Sankey({ active, drawnOn, hub, label, mode, onActive, onOpen, sources, targets }: SankeyProps) {
    const [ref, { height, width }] = useBox(UNMEASURED);
    const [tipFor, setTipFor] = useState<string | null>(null);
    const prefix = useId().replaceAll(":", "");
    const layout = sankeyLayout(mode, width, height, sources, targets);
    const { hub: bar, left, right } = layout;
    const dimmed = active !== null;
    const enter = (id: string) => {
        setTipFor(id);
        onActive(id);
    };
    const leave = () => {
        setTipFor(null);
        onActive(null);
    };
    const placedOf = (side: Side, node: ChartNode): Placed | undefined =>
        (side === "source" ? layout.sources : layout.targets).find((each) => each.id === node.id);
    const tipped = [...sources, ...targets].find((node) => node.id === tipFor);
    const tipSide: Side = sources.some((node) => node.id === tipFor) ? "source" : "target";
    const tipPlace = tipped ? placedOf(tipSide, tipped) : undefined;
    const tipTop = tipPlace ? Math.min(Math.max(tipPlace.y - 4, 0), Math.max(height - TIP_HEIGHT, 0)) : 0;
    const tipLeft =
        tipSide === "target" ? Math.max(bar.x - TIP_GAP - TIP_WIDTH, 0) : left + NODE_WIDTH + LABEL_GAP + TIP_GAP;
    const open = (node: ChartNode) => (event: KeyboardEvent) => {
        if (event.key === "Enter" && onOpen) {
            onOpen(node);
        }
    };
    const render = (side: Side, node: ChartNode, index: number) => {
        const place = placedOf(side, node);
        if (!place) {
            return null;
        }
        const source = side === "source";
        const on = active === node.id;
        const stops = (() => {
            if (on) {
                return ACTIVE;
            }
            if (dimmed) {
                return DIMMED;
            }
            return source && drawnOn ? DRAWN_ON : RESTING;
        })();
        const gradient = `${prefix}${side}${index}`;
        const x0 = source ? left + NODE_WIDTH : bar.x + NODE_WIDTH;
        const x1 = source ? bar.x : right;
        const path = source
            ? ribbon(x0, place.y, x1, place.hubY, place.height)
            : ribbon(x0, place.hubY, x1, place.y, place.height);
        const centre = place.y + place.height / 2;
        const textX = source ? left - LABEL_GAP : right + NODE_WIDTH + 10;
        const anchor = source ? "end" : "start";
        const openable = !source && onOpen !== undefined && node.tone === "category";
        const text = dimmed && !on ? "fill-muted-foreground" : "fill-foreground";
        const named = node.tone === "savings" && !dimmed ? "fill-(--color-app-spend)" : text;
        return (
            <g
                aria-label={`${node.name}, ${node.note}`}
                className="group cursor-default outline-none data-[open=true]:cursor-pointer"
                data-open={openable}
                key={node.id}
                onBlur={leave}
                onClick={openable ? () => onOpen(node) : undefined}
                onFocus={() => enter(node.id)}
                onKeyDown={openable ? open(node) : undefined}
                onPointerEnter={() => enter(node.id)}
                onPointerLeave={leave}
                role={openable ? "link" : "img"}
                tabIndex={0}
            >
                <defs>
                    <Gradient color={node.ribbon ?? node.color} id={gradient} stops={stops} />
                </defs>
                <path
                    d={path}
                    fill={`url(#${gradient})`}
                    stroke={on ? "var(--color-foreground)" : "none"}
                    strokeOpacity={0.5}
                />
                <rect
                    className="group-focus-visible:stroke-foreground transition-opacity duration-150 group-focus-visible:stroke-2"
                    fill={node.color}
                    height={Math.max(place.height, MIN_BAR)}
                    opacity={dimmed && !on ? 0.4 : 1}
                    rx={3}
                    width={NODE_WIDTH}
                    x={source ? left : right}
                    y={place.y}
                />
                <text
                    className={cn(
                        "font-sans text-[13px] transition-colors duration-150",
                        named,
                        on ? "font-semibold" : "font-medium"
                    )}
                    style={{ textAnchor: anchor }}
                    x={textX}
                    y={centre - NAME_LIFT}
                >
                    {node.name}
                </text>
                <text
                    className="dash-figure fill-muted-foreground text-xs transition-opacity duration-150"
                    opacity={dimmed && !on ? 0.6 : 1}
                    style={{ textAnchor: anchor }}
                    x={textX}
                    y={centre + NOTE_DROP}
                >
                    {node.note}
                </text>
            </g>
        );
    };
    return (
        <div className="absolute top-0 bottom-[27px] left-5 w-[760px] max-w-[calc(100%-38px)]" ref={ref}>
            {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the bars inside are focusable, so it is a group. */}
            <svg aria-label={label} className="block" height={height} role="group" width={width}>
                {sources.map((node, index) => render("source", node, index))}
                {targets.map((node, index) => render("target", node, index))}
                <rect fill={hub.color} height={bar.height} rx={3} width={NODE_WIDTH} x={bar.x} y={bar.y} />
                <text
                    className="fill-foreground font-sans text-[13px] font-medium"
                    style={{ textAnchor: "middle" }}
                    x={bar.x + NODE_WIDTH / 2}
                    y={bar.y - HUB_NAME_LIFT}
                >
                    {hub.label}
                </text>
                <text
                    className="dash-figure fill-muted-foreground text-xs"
                    style={{ textAnchor: "middle" }}
                    x={bar.x + NODE_WIDTH / 2}
                    y={bar.y - HUB_NOTE_LIFT}
                >
                    {hub.note}
                </text>
            </svg>
            {tipped ? (
                <div className="absolute z-10" style={{ left: tipLeft, top: tipTop, width: TIP_WIDTH }}>
                    <Tip color={tipped.color} tip={tipped.tip} />
                </div>
            ) : null}
        </div>
    );
}
