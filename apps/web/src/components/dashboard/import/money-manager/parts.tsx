import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { Button } from "panelui-web/button";
import { Kpi } from "panelui-web/kpi";
import { Menu } from "panelui-web/menu";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { KpiBand } from "@/components/dashboard/accounts/parts";

export function MmBar({ children, onBack, title }: { children?: ReactNode; onBack?: () => void; title: ReactNode }) {
    const { bar } = useIntlayer("dashboard-import-mm");
    return (
        <div className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 py-3">
            {onBack ? (
                <Button aria-label={bar.back.value} onClick={onBack} size="icon" variant="ghost">
                    <Glyph icon={ArrowLeft01Icon} size={16} />
                </Button>
            ) : null}
            <h1 className="text-lg leading-6 font-semibold tracking-[-0.02em]">{title}</h1>
            <div className="ml-auto flex items-center gap-2">{children}</div>
        </div>
    );
}

export function Tile({ icon }: { icon: Parameters<typeof Glyph>[0]["icon"] }) {
    return (
        <span className="bg-app-fill text-muted-foreground flex size-9 flex-none items-center justify-center rounded-lg">
            <Glyph icon={icon} size={18} />
        </span>
    );
}

export function ValueRow({ label, value }: { label: ReactNode; value: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs leading-4">
            <span className="text-muted-foreground">{label}</span>
            <span className="dash-figure">{value}</span>
        </div>
    );
}

/** A line that opens another screen; `tone` colors the detail when something needs attention. */
export function NavRow({
    detail,
    leading,
    onClick,
    title,
    tone = "",
}: {
    detail?: ReactNode;
    leading?: ReactNode;
    onClick?: () => void;
    title: ReactNode;
    tone?: string;
}) {
    const body = (
        <>
            {leading}
            <span className="min-w-0 flex-1">
                <b className="block truncate text-sm leading-5 font-medium">{title}</b>
                {detail ? (
                    <small className={`block truncate text-xs leading-4 ${tone || "text-muted-foreground"}`}>
                        {detail}
                    </small>
                ) : null}
            </span>
            {onClick ? <Glyph className="text-muted-foreground flex-none" icon={ArrowRight01Icon} size={14} /> : null}
        </>
    );
    const base = "flex w-full items-center gap-3 px-4 py-3 text-start";
    return onClick ? (
        <button className={`${base} hover:bg-app-fill/60 transition-colors`} onClick={onClick} type="button">
            {body}
        </button>
    ) : (
        <div className={base}>{body}</div>
    );
}

export interface PickOption {
    current?: boolean;
    key: string;
    label: ReactNode;
    onPick: () => void;
}

export interface PickGroup {
    options: readonly PickOption[];
    title?: ReactNode;
}

const CAPTION = "text-muted-foreground px-2 pt-1.5 pb-1 text-xs leading-4";

export function Pick({ groups, label }: { groups: readonly PickGroup[]; label: ReactNode }) {
    return (
        <Menu>
            <Menu.Trigger
                render={
                    <Button className="max-w-48 justify-between gap-2" size="sm" variant="outline">
                        <span className="truncate">{label}</span>
                        <Glyph className="flex-none" icon={ArrowDown01Icon} size={12} />
                    </Button>
                }
            />
            <Menu.Content align="end" className="app-shell max-h-80 w-60 overflow-y-auto" sideOffset={6}>
                {groups.map((group, index) => (
                    <div key={index}>
                        {index > 0 ? <Menu.Separator /> : null}
                        {group.title ? <div className={CAPTION}>{group.title}</div> : null}
                        {group.options.map((option) => (
                            <Menu.Item key={option.key} onClick={option.onPick}>
                                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                                {option.current ? <Glyph icon={Tick02Icon} size={14} /> : null}
                            </Menu.Item>
                        ))}
                    </div>
                ))}
            </Menu.Content>
        </Menu>
    );
}

export function RadioLine({
    checked,
    children,
    hint,
    name = "mm-radio",
    onSelect,
}: {
    checked: boolean;
    children: ReactNode;
    hint?: ReactNode;
    name?: string;
    onSelect: () => void;
}) {
    return (
        <label className="hover:bg-app-fill/60 flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors">
            <input
                checked={checked}
                className="accent-primary mt-1 size-4"
                name={name}
                onChange={onSelect}
                type="radio"
            />
            <span className="min-w-0 flex-1">
                <b className="block text-sm leading-5 font-medium">{children}</b>
                {hint ? <small className="text-muted-foreground block text-xs leading-4">{hint}</small> : null}
            </span>
        </label>
    );
}

export function Figures({ items }: { items: readonly { label: ReactNode; value: number }[] }) {
    return (
        <div className="mb-4">
            <KpiBand>
                {items.map(({ label, value }, index) => (
                    <Kpi className="gap-0" key={index}>
                        <Kpi.Header>
                            <Kpi.Title>{label}</Kpi.Title>
                        </Kpi.Header>
                        <Kpi.Value className="dash-figure mt-2 mb-0.5 truncate leading-7 font-semibold tracking-[-0.04em]">
                            {value.toLocaleString()}
                        </Kpi.Value>
                    </Kpi>
                ))}
            </KpiBand>
        </div>
    );
}
