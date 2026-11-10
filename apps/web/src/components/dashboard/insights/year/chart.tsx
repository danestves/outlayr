import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { KeyboardEvent } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { cn } from "@/lib/utils";

import { useInsightsFormat } from "../format";
import { useBox } from "../use-box";
import type { YearMonth } from "./model";

const HEIGHT = 352;
const BOTTOM = 24;
const LEFT = 34;
const TOP = 8;
const TICKS = 3;
const GAP_SHARE = 0.66;
const LABEL_FIT = 22;
const LABEL_DROP = 17;
const TIP_WIDTH = 188;
const TIP_HEIGHT = 96;
const PAD = 20;
const UNMEASURED = { height: 0, width: 768 };
const NICE = [1, 1.5, 2, 3, 5, 10] as const;
const THOUSAND = 1000;
const tenths = (value: number) => (value < THOUSAND ? String(Math.round(value)) : `${(value / THOUSAND).toFixed(1)}k`);

/** The smallest 1, 2 or 5 times a power of ten that three steps of it cover the tallest bar with some air. */
function stepFor(peak: number) {
    const raw = Math.max(peak * 1.1, 1) / TICKS;
    const power = 10 ** Math.floor(Math.log10(raw));
    const unit = NICE.find((each) => each * power >= raw) ?? NICE.at(-1) ?? 1;
    return unit * power;
}

interface Props {
    average: number | null;
    months: readonly YearMonth[];
}

/** One bar a month, tinted when the budgets were overrun. A bar opens its month; empty months stay outlines. */
export function MonthChart({ average, months }: Props) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights-year");
    const fmt = useInsightsFormat(ledger);
    const navigate = useNavigate();
    const [ref, box] = useBox(UNMEASURED);
    const width = box.width - 2 * PAD;
    const [lit, setLit] = useState<number | null>(null);
    const peak = months.reduce((top, month) => Math.max(top, month.spent), 0);
    const step = stepFor(peak);
    const ceiling = step * TICKS;
    const floor = HEIGHT - BOTTOM;
    const y = (value: number) => floor - (value / ceiling) * (floor - TOP);
    const gap = (width - LEFT) / months.length;
    const barWidth = gap * GAP_SHARE;
    const open = (month: YearMonth) =>
        navigate({
            search: (prev) => ({ accounts: prev.accounts, period: month.key }),
            to: "/app/insights",
        });
    const move = (event: KeyboardEvent<SVGGElement>, month: YearMonth) => {
        if (event.key === "Enter") {
            open(month);
            return;
        }
        const shift = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
        if (shift === undefined) {
            return;
        }
        event.preventDefault();
        const bars = [...(event.currentTarget.parentElement?.querySelectorAll<SVGGElement>("[data-bar]") ?? [])];
        bars[bars.indexOf(event.currentTarget) + shift]?.focus();
    };
    const tipped = lit === null ? undefined : months[lit];
    const tipLeft = Math.min(Math.max(LEFT + (lit ?? 0) * gap + gap / 2 - TIP_WIDTH / 2, 0), width - TIP_WIDTH);
    const tipTop = tipped ? Math.max(y(tipped.spent) - TIP_HEIGHT - 8, 0) : 0;
    return (
        <div className="relative px-5 pb-[18px]" ref={ref}>
            {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the bars inside are focusable, so it is a group. */}
            <svg aria-label={copy.chartLabel.value} className="block" height={HEIGHT} role="group" width={width}>
                {Array.from({ length: TICKS + 1 }, (_, index) => index * step).map((value) => (
                    <g key={value}>
                        <path d={`M${LEFT} ${y(value)}H${width}`} style={{ stroke: "var(--color-border)" }} />
                        <text className="dash-figure fill-muted-foreground text-[11px]" x={0} y={y(value) + 4}>
                            {value === 0 ? "0" : fmt.axis(value)}
                        </text>
                    </g>
                ))}
                {months.map((month, index) => {
                    const x = LEFT + index * gap + (gap - barWidth) / 2;
                    const top = y(month.spent);
                    const centre = x + barWidth / 2;
                    const over = month.over === true;
                    const inside = floor - top >= LABEL_FIT;
                    const label = fmt.month(month.key);
                    if (!month.active) {
                        return (
                            <g key={month.key}>
                                <rect
                                    height={floor - y(step)}
                                    rx={4}
                                    style={{
                                        fill: "var(--color-foreground)",
                                        fillOpacity: 0.02,
                                        stroke: "var(--color-app-strong)",
                                    }}
                                    strokeDasharray="3 4"
                                    width={barWidth - 1}
                                    x={x + 0.5}
                                    y={y(step)}
                                />
                                <text
                                    className="dash-figure fill-app-ghost text-[11px]"
                                    style={{ textAnchor: "middle" }}
                                    x={centre}
                                    y={HEIGHT - 5}
                                >
                                    {label}
                                </text>
                            </g>
                        );
                    }
                    return (
                        <g
                            aria-label={`${label}, ${fmt.amount(month.spent)}`}
                            className="cursor-pointer outline-none"
                            data-bar
                            key={month.key}
                            onBlur={() => setLit(null)}
                            onClick={() => open(month)}
                            onFocus={() => setLit(index)}
                            onKeyDown={(event) => move(event, month)}
                            onPointerEnter={() => setLit(index)}
                            onPointerLeave={() => setLit(null)}
                            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an SVG group cannot be an anchor that opens by script.
                            role="link"
                            tabIndex={0}
                        >
                            <rect fill="transparent" height={floor} width={gap} x={x - (gap - barWidth) / 2} y={0} />
                            <rect
                                className={cn(
                                    "transition-opacity duration-150",
                                    over ? "fill-(--color-app-tint)" : "fill-app-strong"
                                )}
                                height={Math.max(floor - top, 0)}
                                opacity={lit !== null && lit !== index ? 0.55 : 1}
                                rx={4}
                                width={barWidth}
                                x={x}
                                y={top}
                            />
                            <text
                                className={cn("dash-figure text-[11px]", over ? "fill-black" : "fill-foreground")}
                                style={{ textAnchor: "middle" }}
                                x={centre}
                                y={top + (inside ? LABEL_DROP : -6)}
                            >
                                {tenths(month.spent)}
                            </text>
                            <text
                                className="dash-figure fill-muted-foreground text-[11px]"
                                style={{ textAnchor: "middle" }}
                                x={centre}
                                y={HEIGHT - 5}
                            >
                                {label}
                            </text>
                        </g>
                    );
                })}
                {average === null || average <= 0 ? null : (
                    <path
                        d={`M${LEFT} ${y(average)}H${width}`}
                        pointerEvents="none"
                        strokeDasharray="3 4"
                        style={{ stroke: "var(--color-foreground)", strokeOpacity: 0.5 }}
                    />
                )}
            </svg>
            {tipped ? (
                <div
                    className="bg-popover border-border pointer-events-none absolute z-10 flex flex-col rounded-xl border px-3.5 py-3 shadow-lg"
                    style={{ left: tipLeft + PAD, top: tipTop, width: TIP_WIDTH }}
                >
                    <span className="text-[13px] font-medium">{fmt.longMonth(`${tipped.key}-15`)}</span>
                    <span className="dash-figure mt-1 text-lg leading-[26px] font-semibold tracking-[-0.03em]">
                        {fmt.amount(tipped.spent)}
                    </span>
                    {tipped.budget === null ? null : (
                        <span className="text-muted-foreground mt-1 flex justify-between text-[13px] leading-5">
                            <span>{copy.tip.budget}</span>
                            <span className={cn("dash-figure", tipped.over && "text-(--color-app-spend)")}>
                                {fmt.whole(tipped.budget.spent)} / {fmt.whole(tipped.budget.limit)}
                            </span>
                        </span>
                    )}
                </div>
            ) : null}
        </div>
    );
}
