import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Tabs } from "panelui-web/tabs";
import { createContext, use, useState } from "react";
import type { ReactNode, Ref } from "react";
import { createPortal } from "react-dom";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { periodKeyIn, periodKindOf, shiftPeriodKey } from "@/lib/dashboard-series-period";
import type { Period, PeriodKind } from "@/lib/dashboard-series-period";

import { useInsightsFormat } from "./format";

const TABS = [
    { id: "overview", to: "/insights" },
    { id: "breakdown", to: "/insights/breakdown" },
    { id: "cashFlow", to: "/insights/cash-flow" },
    { id: "reports", to: "/insights/reports" },
    { id: "recap", to: "/insights/recap" },
    { id: "year", to: "/insights/year" },
] as const;

const KINDS = ["week", "month", "year"] as const satisfies readonly PeriodKind[];

const TAB =
    "text-muted-foreground hover:text-foreground data-[status=active]:text-foreground relative flex h-[63px] shrink-0 items-center px-3 text-sm font-medium outline-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-t-xs focus-visible:after:bg-ring data-[status=active]:after:bg-foreground";

const SLOT = "ml-auto flex min-h-[63px] items-center gap-2";

function BarFrame({ children, slotRef }: { children?: ReactNode; slotRef?: Ref<HTMLDivElement> }) {
    const { nav } = useIntlayer("dashboard");
    const { sections, tabs } = useIntlayer("dashboard-insights-bar");
    return (
        <header className="border-border -mx-4 flex min-h-16 flex-wrap items-center gap-x-5 border-b px-4 sm:-mx-6 sm:px-6">
            <h1 className="text-lg leading-6 font-semibold tracking-[-0.02em] max-md:hidden">{nav.insights}</h1>
            <nav
                aria-label={sections.value}
                className="flex min-w-0 [scrollbar-width:none] gap-1 overflow-x-auto max-md:order-last max-md:-mx-3 max-md:w-full"
            >
                {TABS.map(({ id, to }) => (
                    <Link
                        activeOptions={{ exact: id === "overview", includeSearch: false }}
                        className={TAB}
                        key={id}
                        search={(prev) => ({ accounts: prev.accounts, period: prev.period })}
                        to={to}
                    >
                        {tabs[id]}
                    </Link>
                ))}
            </nav>
            {slotRef ? <div className={SLOT} inert ref={slotRef} /> : null}
            {children ? <div className={SLOT}>{children}</div> : null}
        </header>
    );
}

const HeldSlot = createContext<HTMLElement | null | undefined>(undefined);

/** The page header every Insights tab shares: title, the six tabs and whatever that tab steers with. */
export function InsightsBar({ children }: { children?: ReactNode }) {
    const held = use(HeldSlot);
    if (held === undefined) {
        return <BarFrame>{children}</BarFrame>;
    }
    return held === null ? null : createPortal(children, held);
}

/**
 * Draws the bar above `children` and sends the controls of any bar inside them to it.
 * A pending screen wraps its skeleton in this, so the chrome stays readable while the body loads.
 */
export function HeldBar({ children }: { children: ReactNode }) {
    const [slot, setSlot] = useState<HTMLElement | null>(null);
    return (
        <>
            <BarFrame slotRef={setSlot} />
            <HeldSlot value={slot}>{children}</HeldSlot>
        </>
    );
}

/** Steps the span back and forward. It never reaches past the span holding today. */
export function PeriodStepper({ span }: { span: Period }) {
    const { ledger, setFilters } = useDashboard();
    const { next, previous } = useIntlayer("dashboard-insights-bar");
    const fmt = useInsightsFormat(ledger);
    const kind = periodKindOf(span.key) ?? "month";
    const current = periodKeyIn(kind, ledger.today, ledger);
    const earliest = ledger.rows.reduce((first, row) => (row.day < first ? row.day : first), ledger.today);
    const step = (steps: number) => setFilters({ period: shiftPeriodKey(span.key, steps) });
    return (
        <div className="mr-1 flex items-center gap-2">
            <Button
                aria-label={previous.value}
                disabled={span.from <= earliest}
                onClick={() => step(-1)}
                className="size-8"
                size="icon-sm"
                variant="outline"
            >
                <Glyph icon={ArrowLeft01Icon} size={16} />
            </Button>
            <span className="dash-figure text-[13px] font-medium whitespace-nowrap">{fmt.spanName(span)}</span>
            <Button
                aria-label={next.value}
                disabled={span.key >= current}
                onClick={() => step(1)}
                className="size-8"
                size="icon-sm"
                variant="outline"
            >
                <Glyph icon={ArrowRight01Icon} size={16} />
            </Button>
        </div>
    );
}

/** Week, month or year. The new span is the one holding the last day of the old one that has happened. */
export function KindSwitch({ span }: { span: Period }) {
    const { ledger, setFilters } = useDashboard();
    const { kinds } = useIntlayer("dashboard-insights-bar");
    const anchor = span.to < ledger.today ? span.to : ledger.today;
    return (
        <Tabs
            onValueChange={(kind: PeriodKind) => setFilters({ period: periodKeyIn(kind, anchor, ledger) })}
            value={periodKindOf(span.key) ?? "month"}
            variant="segmented"
        >
            <Tabs.List aria-label={kinds.label.value}>
                {KINDS.map((kind) => (
                    <Tabs.Trigger key={kind} value={kind}>
                        {kinds[kind]}
                    </Tabs.Trigger>
                ))}
            </Tabs.List>
        </Tabs>
    );
}

export function PeriodControls() {
    const { span } = useDashboard().filters;
    return (
        <>
            <PeriodStepper span={span} />
            <KindSwitch span={span} />
        </>
    );
}
