import ArrowDown01Solid from "@hugeicons-pro/core-solid-rounded/ArrowDown01Icon";
import Cancel01Solid from "@hugeicons-pro/core-solid-rounded/Cancel01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";

import { GlassCircle, SystemText } from "./chrome";
import { fontAscent } from "./type";

const HOME_INDICATOR = { bottom: 8, height: 5, width: 144 } as const;

export function HomeIndicator() {
    return (
        <div
            style={{
                background: "var(--title-ink)",
                borderRadius: HOME_INDICATOR.height / 2,
                bottom: HOME_INDICATOR.bottom,
                height: HOME_INDICATOR.height,
                left: `calc(50% - ${HOME_INDICATOR.width / 2}px)`,
                position: "absolute",
                width: HOME_INDICATOR.width,
            }}
        />
    );
}

export function ScopeChip({
    clearable = false,
    menu = false,
    title,
}: {
    clearable?: boolean;
    menu?: boolean;
    title: string;
}) {
    return (
        <div className="bg-surface-secondary shrink-0 flex-row items-center gap-2.25 rounded-full px-3 py-1.5">
            <div className="flex-row items-center gap-1.25">
                <span className="font-sans-semibold text-foreground text-subtitle truncate">{title}</span>
                {menu ? <HugeiconsIcon className="text-muted" icon={ArrowDown01Solid} size={10} /> : null}
            </div>
            {clearable ? (
                <div className="py-1">
                    <HugeiconsIcon className="text-muted" icon={Cancel01Solid} size={11} />
                </div>
            ) : null}
        </div>
    );
}

const BUTTON_SIZE = {
    lg: { label: 18, root: "min-h-12 px-6 py-2.5" },
    md: { label: 16, root: "min-h-11 min-w-11 px-4 py-2.5" },
    sm: { label: 14, root: "min-h-9 min-w-9 gap-1.5 px-2.5 py-2" },
} as const;

export interface ButtonProps {
    children: string;
    className?: string;
    size?: keyof typeof BUTTON_SIZE;
}

export function Button({ children, className = "rounded-lg", size = "md" }: ButtonProps) {
    const spec = BUTTON_SIZE[size];
    return (
        <div
            className={`border-primary bg-primary text-primary-foreground flex-row items-center justify-center gap-2 border shadow-sm ${spec.root} ${className}`}
        >
            <SystemText size={spec.label} weight={500}>
                {children}
            </SystemText>
        </div>
    );
}

export function SettingsSection({
    accessory,
    children,
    footer,
    title,
}: {
    accessory?: ReactNode;
    children: ReactNode;
    footer?: string;
    title?: string;
}) {
    return (
        <div className="pt-8">
            {title ? (
                <>
                    <div className="flex-row items-end justify-between gap-3">
                        <span className="text-title font-sans-bold text-foreground shrink tracking-tight">{title}</span>
                        {accessory}
                    </div>
                    <div className="bg-foreground mt-1.5 h-[1.5px]" />
                </>
            ) : null}
            <div className={title ? undefined : "border-border border-t"}>{children}</div>
            {footer ? (
                <div className="pt-2">
                    <span className="text-muted text-subtitle leading-snug">{footer}</span>
                </div>
            ) : null}
        </div>
    );
}

function RowShell({ children, icon, title }: { children?: ReactNode; icon?: IconSvgElement; title: string }) {
    return (
        <div className="border-border border-b py-3.5">
            <div className="flex-row items-center gap-3">
                {icon ? <HugeiconsIcon className="text-foreground" icon={icon} size={20} strokeWidth={1.9} /> : null}
                <span className="text-body text-foreground flex-1 truncate">{title}</span>
                {children}
            </div>
        </div>
    );
}

export interface LinkRowProps {
    chevron?: boolean;
    external?: boolean;
    icon?: IconSvgElement;
    title: string;
    value?: string;
}

export function LinkRow({ chevron = true, external = false, icon, title, value }: LinkRowProps) {
    return (
        <RowShell icon={icon} title={title}>
            <div className="flex-row items-center gap-1.5">
                {value ? <span className="text-body text-muted truncate">{value}</span> : null}
                {chevron ? (
                    <HugeiconsIcon
                        className="text-subtle"
                        icon={external ? ArrowUpRight01Icon : ArrowRight01Icon}
                        size={16}
                        strokeWidth={2.2}
                    />
                ) : null}
            </div>
        </RowShell>
    );
}

const SWITCH = { height: 28, inset: 2, knobHeight: 24, knobWidth: 37, width: 63 } as const;

export function ToggleRow({ icon, on, title }: { icon?: IconSvgElement; on: boolean; title: string }) {
    return (
        <RowShell icon={icon} title={title}>
            <div
                className={on ? "bg-tint" : "bg-subtle"}
                style={{ borderRadius: SWITCH.height / 2, height: SWITCH.height, width: SWITCH.width }}
            >
                <div
                    style={{
                        background: "#fff",
                        borderRadius: SWITCH.knobHeight / 2,
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)",
                        height: SWITCH.knobHeight,
                        left: on ? SWITCH.width - SWITCH.knobWidth - SWITCH.inset : SWITCH.inset,
                        position: "absolute",
                        top: SWITCH.inset,
                        width: SWITCH.knobWidth,
                    }}
                />
            </div>
        </RowShell>
    );
}

export const SHEET = { radius: 38, top: 62 } as const;
const SHEET_CLOSE = { icon: 18, left: 16, size: 44, top: 78 } as const;
const SHEET_TITLE = { baseline: 106.67, size: 17, weight: 590 } as const;

export function Sheet({
    backdrop = true,
    bottomRadius = 0,
    children,
    glass,
    title,
}: {
    backdrop?: boolean;
    bottomRadius?: number;
    children?: ReactNode;
    glass?: string;
    title: string;
}) {
    return (
        <>
            {backdrop ? <div className="absolute inset-0" style={{ background: "var(--sheet-backdrop)" }} /> : null}
            <div
                className="bg-background absolute inset-x-0 bottom-0 overflow-hidden"
                style={{
                    borderBottomLeftRadius: bottomRadius,
                    borderBottomRightRadius: bottomRadius,
                    borderTopLeftRadius: SHEET.radius,
                    borderTopRightRadius: SHEET.radius,
                    top: SHEET.top,
                }}
            >
                {children}
            </div>
            <GlassCircle fill={glass} left={SHEET_CLOSE.left} size={SHEET_CLOSE.size} top={SHEET_CLOSE.top}>
                <div style={{ color: "var(--glass-ink)" }}>
                    <HugeiconsIcon icon={Cancel01Icon} size={SHEET_CLOSE.icon} strokeWidth={2} />
                </div>
            </GlassCircle>
            <div
                className="absolute inset-x-0 items-center"
                style={{ color: "var(--title-ink)", top: SHEET_TITLE.baseline - fontAscent(SHEET_TITLE.size) }}
            >
                <SystemText size={SHEET_TITLE.size} weight={SHEET_TITLE.weight}>
                    {title}
                </SystemText>
            </div>
        </>
    );
}
