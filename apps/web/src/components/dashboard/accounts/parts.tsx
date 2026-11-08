import type { RemixiconComponentType } from "@remixicon/react";
import {
    RiArchiveLine,
    RiArrowRightUpLine,
    RiCheckboxCircleLine,
    RiCheckLine,
    RiDeleteBin6Line,
    RiDragMove2Line,
    RiMore2Fill,
    RiPencilLine,
    RiSortAsc,
    RiSortDesc,
} from "@remixicon/react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Kpi } from "panelui-web/kpi";
import type { KpiColor } from "panelui-web/kpi";
import { Menu } from "panelui-web/menu";
import { Tabs } from "panelui-web/tabs";
import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { STACKED, TWO_BY_TWO } from "@/components/dashboard/home/kpi-group";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile } from "@/components/ledger/tiles";

import { useAccountFlows } from "./flows";
import type { AccountRow, AccountSort, CheckedAge } from "./model";
import { checkedAge } from "./model";

/** `children` is the change as written, since Kpi.Trend only speaks percentages on its own. */
export function Trend({
    children,
    goodWhenUp = true,
    value,
}: {
    children: string;
    goodWhenUp?: boolean;
    value: number;
}) {
    return (
        <Kpi.Trend
            aria-label={children}
            className="dash-figure"
            format={() => children}
            goodDirection={goodWhenUp ? "up" : "down"}
            value={value}
            variant="badge"
        />
    );
}

// The client renderer drops preserveAspectRatio from JSX, so it is set on the node.
export const stretch = (node: SVGSVGElement | null) => node?.setAttribute("preserveAspectRatio", "none");

export function Spark({
    className,
    color,
    height,
    values,
}: {
    className: string;
    color?: KpiColor;
    height: number;
    values: readonly number[];
}) {
    if (values.length < 2) {
        return null;
    }
    return (
        <Kpi.Chart
            aria-hidden
            className={`${className} [&_path]:[vector-effect:non-scaling-stroke] ${color ? "" : "[--pu-color:var(--muted-foreground)]"}`}
            color={color}
            data={[...values]}
            height={height}
            ref={stretch}
            strokeWidth={1.5}
        />
    );
}

/** A bar in the ink colour: how far along, with no good or bad reading of it. */
export function Meter({ className = "", max, value }: { className?: string; max: number; value: number }) {
    return <Kpi.Progress className={`[--pu-color:var(--foreground)] ${className}`} maxValue={max} value={value} />;
}

/** `quiet` is the empty band: label and a muted zero, no footer. */
export function KpiCell({
    children,
    color,
    icon: Icon,
    label,
    quiet = false,
    tone = "",
    value,
}: {
    children?: ReactNode;
    color: string;
    icon?: RemixiconComponentType;
    label: ReactNode;
    quiet?: boolean;
    /** A text colour class for the figure. */
    tone?: string;
    value: string;
}) {
    return (
        <Kpi>
            <Kpi.Header>
                {Icon ? (
                    <Kpi.Icon style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}>
                        <Icon />
                    </Kpi.Icon>
                ) : null}
                <Kpi.Title>{label}</Kpi.Title>
            </Kpi.Header>
            <Kpi.Value
                className={`dash-figure truncate leading-8 font-semibold tracking-[-0.04em] ${quiet ? "text-muted-foreground" : ""} ${tone}`}
            >
                {value}
            </Kpi.Value>
            {quiet ? null : <Kpi.Footer className="h-7 justify-between">{children}</Kpi.Footer>}
        </Kpi>
    );
}

export function KpiBand({ children }: { children: ReactNode }) {
    return (
        <Kpi.Group className={`rounded-2xl ${TWO_BY_TWO} ${STACKED}`} surface>
            {children}
        </Kpi.Group>
    );
}

export function useCheckedText() {
    const { check } = useIntlayer("dashboard-accounts");
    return (age: CheckedAge) => {
        switch (age.state) {
            case "never": {
                return check.never.value;
            }
            case "today": {
                return check.today.value;
            }
            case "yesterday": {
                return check.yesterday.value;
            }
            case "daysAgo": {
                return check.daysAgo({ count: age.days }).value;
            }
            default: {
                return check.stale({ count: age.days }).value;
            }
        }
    };
}

export function AccountCell({ note, row }: { note?: ReactNode; row: AccountRow }) {
    const { ledger, photos } = useDashboard();
    const checked = useCheckedText();
    const age = checkedAge(row.checkedAt, ledger);
    return (
        <div className="flex min-w-0 items-center gap-2.5">
            <AccountTile account={row.look} photos={photos} size="lg" />
            <div className="min-w-0">
                <b className="block truncate text-sm leading-[18px] font-medium">{row.name}</b>
                <small className="text-muted-foreground block truncate text-xs leading-4">
                    {note ?? (
                        <>
                            {row.currency} ·{" "}
                            <span className={age.state === "stale" ? "text-app-tint" : ""}>{checked(age)}</span>
                        </>
                    )}
                </small>
            </div>
        </div>
    );
}

export function PhoneAction({
    children,
    className,
    variant = "outline",
}: {
    children: ReactNode;
    className?: string;
    variant?: "default" | "outline";
}) {
    const { phoneHint } = useIntlayer("dashboard-home").setup;
    return (
        <Button aria-disabled className={className} title={phoneHint.value} variant={variant}>
            {children}
        </Button>
    );
}

export function PhoneItem({ children, className = "" }: { children: ReactNode; className?: string }) {
    const { phoneHint } = useIntlayer("dashboard-home").setup;
    return (
        <Menu.Item className={className} disabled title={phoneHint.value}>
            {children}
        </Menu.Item>
    );
}

export function RowMenu({ row }: { row: AccountRow }) {
    const { actions, flows } = useIntlayer("dashboard-accounts");
    const { open } = useAccountFlows();
    const navigate = useNavigate();
    return (
        <Menu>
            <Menu.Trigger
                aria-label={actions.more({ name: row.name }).value}
                render={<Button className="text-muted-foreground -mr-1" size="icon-sm" variant="ghost" />}
            >
                <RiMore2Fill size={17} />
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell ph-no-capture w-[200px]" sideOffset={4}>
                <Menu.Item onClick={() => navigate({ params: { accountId: row.id }, to: "/app/accounts/$accountId" })}>
                    <RiArrowRightUpLine size={16} />
                    {actions.open}
                </Menu.Item>
                <Menu.Item onClick={() => open({ accountId: row.id, kind: "edit" })}>
                    <RiPencilLine size={16} />
                    {actions.edit}
                </Menu.Item>
                <Menu.Item onClick={() => open({ accountId: row.id, kind: "check" })}>
                    <RiCheckboxCircleLine size={16} />
                    {actions.check}
                </Menu.Item>
                <Menu.Item onClick={() => open({ accountId: row.id, kind: "archive" })}>
                    <RiArchiveLine size={16} />
                    {flows.archive}
                </Menu.Item>
                <Menu.Separator />
                <Menu.Item variant="destructive" onClick={() => open({ accountId: row.id, kind: "delete" })}>
                    <RiDeleteBin6Line size={16} />
                    {actions.delete}
                </Menu.Item>
            </Menu.Content>
        </Menu>
    );
}

export function SortMenu({ onSort, sort }: { onSort: (sort: AccountSort) => void; sort: AccountSort }) {
    const { actions } = useIntlayer("dashboard-accounts");
    const navigate = useNavigate();
    const Icon = sort === "order" ? RiSortDesc : RiSortAsc;
    const choice = (value: AccountSort, icon: RemixiconComponentType, label: ReactNode) => {
        const Glyph = icon;
        return (
            <Menu.Item onClick={() => onSort(value)}>
                <Glyph size={16} />
                {label}
                <RiCheckLine className={`text-app-tint! ml-auto ${sort === value ? "" : "invisible"}`} size={16} />
            </Menu.Item>
        );
    };
    return (
        <Menu>
            <Menu.Trigger render={<Button variant="outline" />}>
                <Icon />
                {sort === "order" ? actions.yourOrder : actions.byBalance}
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell ph-no-capture w-[188px]" sideOffset={4}>
                {choice("order", RiSortDesc, actions.yourOrder)}
                {choice("balance", RiSortAsc, actions.byBalance)}
                <Menu.Separator />
                <Menu.Item onClick={() => navigate({ to: "/app/accounts/reorder" })}>
                    <RiDragMove2Line size={16} />
                    {actions.reorder}
                </Menu.Item>
            </Menu.Content>
        </Menu>
    );
}

export function Segments<Value extends string>({
    onPick,
    options,
    value,
}: {
    onPick: (value: Value) => void;
    options: readonly { label: ReactNode; value: Value }[];
    value: Value;
}) {
    return (
        <Tabs
            onValueChange={(next) => {
                const picked = options.find((option) => option.value === next);
                if (picked) {
                    onPick(picked.value);
                }
            }}
            value={value}
        >
            <Tabs.List className="bg-background/40 rounded-[9px] p-0.5">
                {options.map((option) => (
                    <Tabs.Trigger
                        className="h-[26px] rounded-[7px] px-2.5 text-[13px]"
                        key={option.value}
                        value={option.value}
                    >
                        {option.label}
                    </Tabs.Trigger>
                ))}
            </Tabs.List>
        </Tabs>
    );
}

const PHONE = "(max-width: 639px)";

function onPhoneChange(onChange: () => void) {
    const query = window.matchMedia(PHONE);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
}

const PHONE_CHART = 1.6;

/** Wide charts flatten to a sliver on a phone, so they take a taller ratio there. */
export function useChartRatio(wide: number) {
    const phone = useSyncExternalStore(
        onPhoneChange,
        () => window.matchMedia(PHONE).matches,
        () => false
    );
    return phone ? PHONE_CHART : wide;
}
