import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { Button } from "panelui-web/button";
import { Menu } from "panelui-web/menu";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";

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
    onSelect,
}: {
    checked: boolean;
    children: ReactNode;
    hint?: ReactNode;
    onSelect: () => void;
}) {
    return (
        <label className="hover:bg-app-fill/60 flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors">
            <input
                checked={checked}
                className="accent-primary mt-1 size-4"
                name="mm-radio"
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
