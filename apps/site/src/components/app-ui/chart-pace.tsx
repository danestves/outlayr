const HEIGHT = 160;
const TOP = 18;
const AXIS_Y = 150;
const LABEL_W = 44;
const DASH = "4 4";
const TICKS = { gap: 8, height: 14 } as const;
const PAINT = { axis: 1, dot: 4, line: 2.5, projection: 2 } as const;
const LABEL_GAP = { forecast: 16, today: 6, todayInset: 8 } as const;
const NEAR_END = 0.8;

export interface PaceTick {
    day: number;
    label: string;
}

interface PaceLineChartProps {
    cumulative: readonly number[];
    days: number;
    forecast: number;
    forecastLabel: string;
    ticks: readonly PaceTick[];
    todayLabel: string;
    width: number;
}

function MonoText({ children, color }: { children: string; color: string }) {
    return (
        <span className="text-micro font-mono whitespace-nowrap" style={{ color }}>
            {children}
        </span>
    );
}

function tickAlign(left: number, width: number): "center" | "flex-end" | "flex-start" {
    if (left === 0) {
        return "flex-start";
    }
    return left === width - LABEL_W ? "flex-end" : "center";
}

export function PaceLineChart({
    cumulative,
    days,
    forecast,
    forecastLabel,
    ticks,
    todayLabel,
    width,
}: PaceLineChartProps) {
    const spent = cumulative.at(-1) ?? 0;
    const top = Math.max(1, forecast, spent);
    const x = (day: number) => (day / days) * width;
    const y = (value: number) => AXIS_Y - (value / top) * (AXIS_Y - TOP);
    const todayX = x(cumulative.length);
    const todayY = y(spent);
    const line = [`M 0 ${AXIS_Y}`, ...cumulative.map((value, index) => `L ${x(index + 1)} ${y(value)}`)].join(" ");
    const todaySide =
        todayX > width * NEAR_END
            ? { right: width - todayX + LABEL_GAP.todayInset }
            : { left: todayX + LABEL_GAP.todayInset };
    return (
        <div>
            <div style={{ height: HEIGHT }}>
                <svg height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} width={width}>
                    <path d={`M 0 ${AXIS_Y} L ${width} ${AXIS_Y}`} stroke="var(--border)" strokeWidth={PAINT.axis} />
                    <path
                        d={`M ${todayX} ${todayY} L ${width} ${y(forecast)}`}
                        fill="none"
                        stroke="var(--muted)"
                        strokeDasharray={DASH}
                        strokeLinecap="round"
                        strokeWidth={PAINT.projection}
                    />
                    <path
                        d={line}
                        fill="none"
                        stroke="var(--foreground)"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={PAINT.line}
                    />
                    <circle cx={todayX} cy={todayY} fill="var(--foreground)" r={PAINT.dot} />
                </svg>
                <div className="absolute" style={{ right: 0, top: Math.max(0, y(forecast) - LABEL_GAP.forecast) }}>
                    <MonoText color="var(--muted)">{forecastLabel}</MonoText>
                </div>
                <div className="absolute" style={{ top: todayY + LABEL_GAP.today, ...todaySide }}>
                    <MonoText color="var(--muted)">{todayLabel.toUpperCase()}</MonoText>
                </div>
            </div>
            <div style={{ height: TICKS.height, marginTop: TICKS.gap }}>
                {ticks.map((tick) => {
                    const left = Math.min(Math.max(0, x(tick.day + 0.5) - LABEL_W / 2), width - LABEL_W);
                    return (
                        <div
                            className="absolute"
                            key={tick.day}
                            style={{ alignItems: tickAlign(left, width), left, width: LABEL_W }}
                        >
                            <MonoText color="var(--muted)">{tick.label}</MonoText>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
