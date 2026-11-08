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
import { Menu } from "panelui-web/menu";
import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile } from "@/components/ledger/tiles";

import { useAccountFlows } from "./flows";
import type { AccountRow, AccountSort, CheckedAge } from "./model";
import { checkedAge } from "./model";

export type Tone = "flat" | "good" | "poor";

export const toneOf = (value: number, goodWhenUp = true): Tone => {
    if (value === 0) {
        return "flat";
    }
    return value > 0 === goodWhenUp ? "good" : "poor";
};

export function Trend({ children, tone }: { children: ReactNode; tone: Tone }) {
    return (
        <span className="dash-trend" data-tone={tone}>
            {children}
        </span>
    );
}

const EDGE = 2;

/** A min-to-max line with no axes, drawn at its exact pixel size. */
export function Spark({
    color,
    height,
    values,
    width,
}: {
    color: string;
    height: number;
    values: readonly number[];
    width: number;
}) {
    if (values.length < 2) {
        return null;
    }
    const top = Math.max(...values);
    const bottom = Math.min(...values);
    const path = values
        .map((value, index) => {
            const x = (index / (values.length - 1)) * width;
            const y = height - EDGE - ((value - bottom) / (top - bottom || 1)) * (height - EDGE * 2);
            return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join("");
    return (
        <svg aria-hidden className="block overflow-visible" height={height} width={width}>
            <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
        </svg>
    );
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
        <div className="min-w-0">
            <div className="text-muted-foreground flex items-center gap-2 text-[13px] font-medium">
                {Icon ? (
                    <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-[10px]"
                        style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
                    >
                        <Icon size={14} />
                    </span>
                ) : null}
                <span className="truncate">{label}</span>
            </div>
            <div
                className={`dash-figure truncate text-2xl leading-8 font-semibold tracking-[-0.04em] ${quiet ? "text-muted-foreground mt-1" : "mt-2"} ${tone}`}
            >
                {value}
            </div>
            {quiet ? null : <div className="mt-1 flex h-7 items-center justify-between gap-2">{children}</div>}
        </div>
    );
}

export function KpiBand({ children, columns }: { children: ReactNode; columns: number }) {
    return (
        <section
            className="bg-app-group border-border grid gap-y-5 rounded-3xl border p-5 max-lg:grid-cols-2! max-lg:*:odd:pr-3 max-lg:*:even:border-l max-lg:*:even:pl-3 max-sm:grid-cols-1! max-sm:*:border-0! max-sm:*:px-0! lg:*:not-first:border-l lg:*:not-first:pl-5 lg:*:not-last:pr-5"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
            {children}
        </section>
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

export function PhoneItem({ children, className = "" }: { children: ReactNode; className?: string }) {
    const { phoneHint } = useIntlayer("dashboard-home").setup;
    return (
        <Menu.Item className={`dash-menu-item ${className}`} disabled title={phoneHint.value}>
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
                className="text-muted-foreground hover:text-foreground -mr-1 inline-flex size-7 items-center justify-center rounded-lg align-middle"
            >
                <RiMore2Fill size={17} />
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell dash-menu ph-no-capture w-[200px]" sideOffset={4}>
                <Menu.Item
                    className="dash-menu-item"
                    onClick={() => navigate({ params: { accountId: row.id }, to: "/app/accounts/$accountId" })}
                >
                    <RiArrowRightUpLine size={16} />
                    {actions.open}
                </Menu.Item>
                <Menu.Item className="dash-menu-item" onClick={() => open({ accountId: row.id, kind: "edit" })}>
                    <RiPencilLine size={16} />
                    {actions.edit}
                </Menu.Item>
                <Menu.Item className="dash-menu-item" onClick={() => open({ accountId: row.id, kind: "check" })}>
                    <RiCheckboxCircleLine size={16} />
                    {actions.check}
                </Menu.Item>
                <Menu.Item className="dash-menu-item" onClick={() => open({ accountId: row.id, kind: "archive" })}>
                    <RiArchiveLine size={16} />
                    {flows.archive}
                </Menu.Item>
                <div className="dash-menu-rule" />
                <Menu.Item
                    className="dash-menu-item text-app-spend [&>svg]:text-app-spend!"
                    onClick={() => open({ accountId: row.id, kind: "delete" })}
                >
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
            <Menu.Item className="dash-menu-item" onClick={() => onSort(value)}>
                <Glyph size={16} />
                {label}
                <RiCheckLine className={`text-app-tint! ml-auto ${sort === value ? "" : "invisible"}`} size={16} />
            </Menu.Item>
        );
    };
    return (
        <Menu>
            <Menu.Trigger className="dash-ob h-9 gap-1.5 rounded-[10px] px-3 [&>svg]:size-4">
                <Icon />
                {sort === "order" ? actions.yourOrder : actions.byBalance}
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell dash-menu ph-no-capture w-[188px]" sideOffset={4}>
                {choice("order", RiSortDesc, actions.yourOrder)}
                {choice("balance", RiSortAsc, actions.byBalance)}
                <div className="dash-menu-rule" />
                <Menu.Item className="dash-menu-item" onClick={() => navigate({ to: "/app/accounts/reorder" })}>
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
        <fieldset className="bg-app-group inline-flex rounded-[10px] p-[3px]">
            {options.map((option) => (
                <button
                    aria-pressed={option.value === value}
                    className="dash-seg"
                    data-on={option.value === value}
                    key={option.value}
                    onClick={() => onPick(option.value)}
                    type="button"
                >
                    {option.label}
                </button>
            ))}
        </fieldset>
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
