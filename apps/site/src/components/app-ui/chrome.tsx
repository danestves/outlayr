import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CSSProperties, ReactNode } from "react";

import budgetsSelected from "../../../../native/assets/tab-symbols/budgets-selected.svg?url";
import budgets from "../../../../native/assets/tab-symbols/budgets.svg?url";
import insightsSelected from "../../../../native/assets/tab-symbols/insights-selected.svg?url";
import insights from "../../../../native/assets/tab-symbols/insights.svg?url";
import logSelected from "../../../../native/assets/tab-symbols/log-selected.svg?url";
import log from "../../../../native/assets/tab-symbols/log.svg?url";
import settingsSelected from "../../../../native/assets/tab-symbols/settings-selected.svg?url";
import settings from "../../../../native/assets/tab-symbols/settings.svg?url";
import filter from "../../../../native/assets/toolbar-symbols/filter.svg?url";
import search from "../../../../native/assets/toolbar-symbols/search.svg?url";
import { useReplica } from "./canvas";
import type { AppKey } from "./strings";
import { fontAscent, systemTrak, textLineHeight } from "./type";

export const TOOLBAR_SYMBOLS = { filter, search } as const;

type CustomStyle = CSSProperties & Record<`--${string}`, string>;

export function SymbolMask({ color, size, src }: { color: string; size: number; src: string }) {
    const mask = `url("${src}") center / contain no-repeat`;
    return <div style={{ backgroundColor: color, height: size, mask, WebkitMask: mask, width: size }} />;
}

export function SystemText({
    children,
    size,
    style,
    weight,
}: {
    children: ReactNode;
    size: number;
    style?: CSSProperties;
    weight: number;
}) {
    const text: CustomStyle = {
        "--app-trak": systemTrak(size),
        fontFamily: "var(--font-system)",
        fontSize: size,
        fontWeight: weight,
        lineHeight: `${textLineHeight(size)}px`,
        paddingBottom: 0,
        whiteSpace: "nowrap",
        ...style,
    };
    return <span style={text}>{children}</span>;
}

export const GLASS_EDGE =
    "0 0 0 0.67px var(--glass-edge), 0 2px 8px var(--glass-shadow), inset 0 0 0 0.67px var(--glass-rim)";

export function GlassCircle({
    children,
    left,
    size,
    top,
}: {
    children: ReactNode;
    left: number;
    size: number;
    top: number;
}) {
    return (
        <div
            style={{
                alignItems: "center",
                background: "var(--glass-fill)",
                borderRadius: size / 2,
                boxShadow: GLASS_EDGE,
                height: size,
                justifyContent: "center",
                left,
                position: "absolute",
                top,
                width: size,
            }}
        >
            {children}
        </div>
    );
}

const BAR_BUTTON = { iconSize: 22, size: 44, top: 62 } as const;
const BAR_BUTTON_LEFT = { end: 342, start: 16 } as const;
const TITLE = { baseline: 90.3, size: 17, weight: 590 } as const;

export function NavHeader({ end, start, title }: { end: string; start: string; title: AppKey }) {
    const { t } = useReplica();
    return (
        <>
            <GlassCircle left={BAR_BUTTON_LEFT.start} size={BAR_BUTTON.size} top={BAR_BUTTON.top}>
                <SymbolMask color="var(--glass-ink)" size={BAR_BUTTON.iconSize} src={start} />
            </GlassCircle>
            <div
                className="absolute inset-x-0 items-center"
                style={{ color: "var(--title-ink)", top: TITLE.baseline - fontAscent(TITLE.size) }}
            >
                <SystemText size={TITLE.size} weight={TITLE.weight}>
                    {t(title)}
                </SystemText>
            </div>
            <GlassCircle left={BAR_BUTTON_LEFT.end} size={BAR_BUTTON.size} top={BAR_BUTTON.top}>
                <SymbolMask color="var(--glass-ink)" size={BAR_BUTTON.iconSize} src={end} />
            </GlassCircle>
        </>
    );
}

const TABS = [
    { icon: log, label: "nav.tab.log", selectedIcon: logSelected },
    { icon: insights, label: "nav.tab.insights", selectedIcon: insightsSelected },
    { icon: budgets, label: "nav.tab.balances", selectedIcon: budgetsSelected },
    { icon: settings, label: "nav.tab.settings", selectedIcon: settingsSelected },
] as const satisfies readonly { icon: string; label: AppKey; selectedIcon: string }[];

export type TabName = "log" | "insights" | "balances" | "settings";
const TAB_ORDER = ["log", "insights", "balances", "settings"] as const satisfies readonly TabName[];

const BAR = { height: 63, left: 20, top: 790.5, width: 362 } as const;
const ITEMS = { left: 29.6, pitch: 85.72 } as const;
const PILL = { height: 54, inset: 4.5, width: 95.2 } as const;
const TAB_ICON = { size: 24, top: 803 } as const;
const TAB_LABEL = { baseline: 839.67, size: 10 } as const;
const BADGE = { diameter: 19.67, offsetX: 15, size: 13, top: 796.97 } as const;

export function TabBar({ badges, selected }: { badges?: Partial<Record<TabName, number>>; selected: TabName }) {
    const { t } = useReplica();
    const selectedIndex = TAB_ORDER.indexOf(selected);
    const pillLeft = ITEMS.left + ITEMS.pitch * (selectedIndex + 0.5) - PILL.width / 2;
    return (
        <>
            <div
                style={{
                    background: "var(--glass-fill)",
                    borderRadius: BAR.height / 2,
                    boxShadow: GLASS_EDGE,
                    height: BAR.height,
                    left: BAR.left,
                    position: "absolute",
                    top: BAR.top,
                    width: BAR.width,
                }}
            />
            <div
                style={{
                    background: "var(--tab-pill)",
                    borderRadius: PILL.height / 2,
                    height: PILL.height,
                    left: pillLeft,
                    position: "absolute",
                    top: BAR.top + PILL.inset,
                    width: PILL.width,
                }}
            />
            {TABS.map((tab, index) => {
                const name = TAB_ORDER[index] ?? "log";
                const active = index === selectedIndex;
                const center = ITEMS.left + ITEMS.pitch * (index + 0.5);
                const ink = active ? "var(--tab-selected)" : "var(--tab-ink)";
                const badge = badges?.[name];
                return (
                    <div key={tab.label}>
                        <div className="absolute" style={{ left: center - TAB_ICON.size / 2, top: TAB_ICON.top }}>
                            <SymbolMask color={ink} size={TAB_ICON.size} src={active ? tab.selectedIcon : tab.icon} />
                        </div>
                        <div
                            className="absolute items-center"
                            style={{
                                color: ink,
                                left: center - ITEMS.pitch / 2,
                                top: TAB_LABEL.baseline - fontAscent(TAB_LABEL.size),
                                width: ITEMS.pitch,
                            }}
                        >
                            <SystemText size={TAB_LABEL.size} weight={active ? 590 : 400}>
                                {t(tab.label)}
                            </SystemText>
                        </div>
                        {badge ? (
                            <div
                                className="absolute items-center justify-center"
                                style={{
                                    background: "var(--badge)",
                                    borderRadius: BADGE.diameter / 2,
                                    color: "#fff",
                                    height: BADGE.diameter,
                                    left: center + BADGE.offsetX - BADGE.diameter / 2,
                                    minWidth: BADGE.diameter,
                                    top: BADGE.top,
                                }}
                            >
                                <SystemText size={BADGE.size} weight={400}>
                                    {badge}
                                </SystemText>
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </>
    );
}

const FAB = { icon: 26, left: 318, size: 64, stroke: 2.2, top: 711 } as const;

export function Fab() {
    return (
        <GlassCircle left={FAB.left} size={FAB.size} top={FAB.top}>
            <div className="text-tint">
                <HugeiconsIcon icon={PlusSignIcon} size={FAB.icon} strokeWidth={FAB.stroke} />
            </div>
        </GlassCircle>
    );
}
