import Archive02Icon from "@hugeicons/core-free-icons/Archive02Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import DragDropVerticalIcon from "@hugeicons/core-free-icons/DragDropVerticalIcon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import PencilEdit01Icon from "@hugeicons/core-free-icons/PencilEdit01Icon";
import Sorting05Icon from "@hugeicons/core-free-icons/Sorting05Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import type { IconSvgElement } from "@hugeicons/react";
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
import { Glyph } from "./glyph";
import type { AccountRow, AccountSort, CheckedAge } from "./model";
import { checkedAge } from "./model";

/** `children` is the change as written, since Kpi.Trend only speaks percentages on its own. */
export function Trend({
    children,
    className = "",
    goodWhenUp = true,
    value,
}: {
    children: string;
    className?: string;
    goodWhenUp?: boolean;
    value: number;
}) {
    return (
        <Kpi.Trend
            aria-label={children}
            className={`dash-figure ${className}`}
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
    return (
        <Kpi.Progress
            className={`[&_[role=progressbar]]:bg-muted [--pu-color:var(--foreground)] ${className}`}
            maxValue={max}
            value={value}
        />
    );
}

/** `quiet` is the empty band: label and a muted zero, no footer. */
export function KpiCell({
    children,
    color,
    icon,
    label,
    loose = false,
    quiet = false,
    tone = "",
    value,
}: {
    children?: ReactNode;
    color: string;
    icon?: IconSvgElement;
    label: ReactNode;
    loose?: boolean;
    quiet?: boolean;
    /** A text colour class for the figure. */
    tone?: string;
    value: string;
}) {
    return (
        <Kpi className="gap-0">
            <Kpi.Header>
                {icon ? (
                    <Kpi.Icon style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}>
                        <Glyph icon={icon} size={16} />
                    </Kpi.Icon>
                ) : null}
                <Kpi.Title>{label}</Kpi.Title>
            </Kpi.Header>
            <Kpi.Value
                className={`dash-figure ${icon || loose ? "mt-2" : "mt-1"} truncate ${loose ? "leading-[30px]" : "leading-8"} font-semibold tracking-[-0.04em] ${quiet ? "text-muted-foreground" : ""} ${tone}`}
            >
                {value}
            </Kpi.Value>
            {quiet ? null : (
                <Kpi.Footer className={`${icon ? "h-7" : "h-5"} ${loose ? "mt-2" : "mt-1"} justify-between`}>
                    {children}
                </Kpi.Footer>
            )}
        </Kpi>
    );
}

export function KpiBand({ children }: { children: ReactNode }) {
    return (
        <Kpi.Group
            className={`rounded-3xl lg:grid lg:auto-cols-fr lg:grid-flow-col lg:*:not-first:ps-4! ${TWO_BY_TWO} ${STACKED}`}
            surface
        >
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
    size,
    variant = "outline",
}: {
    children: ReactNode;
    className?: string;
    size?: "sm";
    variant?: "default" | "outline" | "secondary";
}) {
    const { phoneHint } = useIntlayer("dashboard-home").setup;
    return (
        <Button aria-disabled className={className} size={size} title={phoneHint.value} variant={variant}>
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
                render={<Button className="text-muted-foreground -mx-2" size="icon-sm" variant="ghost" />}
            >
                <Glyph icon={MoreVerticalIcon} size={17} />
            </Menu.Trigger>
            <Menu.Content align="end" alignOffset={-4} className="app-shell ph-no-capture w-[200px]" sideOffset={4}>
                <Menu.Item onClick={() => navigate({ params: { accountId: row.id }, to: "/app/accounts/$accountId" })}>
                    <Glyph icon={ArrowUpRight01Icon} size={16} />
                    {actions.open}
                </Menu.Item>
                <Menu.Item onClick={() => open({ accountId: row.id, kind: "edit" })}>
                    <Glyph icon={PencilEdit01Icon} size={16} />
                    {actions.edit}
                </Menu.Item>
                <Menu.Item onClick={() => open({ accountId: row.id, kind: "check" })}>
                    <Glyph icon={CheckmarkCircle02Icon} size={16} />
                    {actions.check}
                </Menu.Item>
                <Menu.Separator />
                <Menu.Item onClick={() => open({ accountId: row.id, kind: "archive" })}>
                    <Glyph icon={Archive02Icon} size={16} />
                    {flows.archive}
                </Menu.Item>
                <Menu.Item variant="destructive" onClick={() => open({ accountId: row.id, kind: "delete" })}>
                    <Glyph icon={Delete02Icon} size={16} />
                    {actions.delete}
                </Menu.Item>
            </Menu.Content>
        </Menu>
    );
}

export function SortMenu({ onSort, sort }: { onSort: (sort: AccountSort) => void; sort: AccountSort }) {
    const { actions } = useIntlayer("dashboard-accounts");
    const navigate = useNavigate();
    const choice = (value: AccountSort, icon: IconSvgElement, label: ReactNode) => (
        <Menu.Item onClick={() => onSort(value)}>
            <Glyph icon={icon} size={16} />
            {label}
            <Glyph
                icon={Tick02Icon}
                className={`text-app-tint! ml-auto ${sort === value ? "" : "invisible"}`}
                size={16}
            />
        </Menu.Item>
    );
    return (
        <Menu>
            <Menu.Trigger render={<Button variant="outline" />}>
                <Glyph icon={Sorting05Icon} className="text-muted-foreground" size={16} />
                {sort === "order" ? actions.yourOrder : actions.byBalance}
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell ph-no-capture w-[188px]" sideOffset={4}>
                {choice("order", Sorting05Icon, actions.yourOrder)}
                {choice("balance", Sorting05Icon, actions.byBalance)}
                <Menu.Separator />
                <Menu.Item onClick={() => navigate({ to: "/app/accounts/reorder" })}>
                    <Glyph icon={DragDropVerticalIcon} size={16} />
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
            <Tabs.List>
                {options.map((option) => (
                    <Tabs.Trigger key={option.value} value={option.value}>
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
