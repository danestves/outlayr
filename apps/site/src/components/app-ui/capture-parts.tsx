import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import type { CSSProperties, ReactNode } from "react";

import oriDark from "../../../../native/assets/images/ori/voice-dark.webp?url";
import oriLight from "../../../../native/assets/images/ori/voice-light.webp?url";
import { useReplica } from "./canvas";
import { GlassCircle, SystemText } from "./chrome";
import { DISPLAY_CORNER } from "./keyboard";
import { SHEET } from "./parts";

export const MODAL = { bottom: 34, close: 60 } as const;
const CLOSE = { icon: 18, left: 342, size: 44, top: 78 } as const;

export type FrameStyle = CSSProperties & Record<`--${string}`, string>;

export function frameTimes(enter: number, leave?: number, fade?: number): FrameStyle {
    const style: FrameStyle = { "--in": `${enter}s` };
    if (leave !== undefined) {
        style["--out"] = `${leave}s`;
    }
    if (fade !== undefined) {
        style["--fade"] = `${fade}s`;
    }
    return style;
}

export function ModalBackdrop() {
    return (
        <>
            <div className="absolute inset-0" style={{ background: "var(--sheet-backdrop)" }} />
            <div
                className="bg-background absolute inset-x-0 bottom-0"
                style={{
                    borderBottomLeftRadius: DISPLAY_CORNER,
                    borderBottomRightRadius: DISPLAY_CORNER,
                    borderTopLeftRadius: SHEET.radius,
                    borderTopRightRadius: SHEET.radius,
                    top: SHEET.top,
                }}
            />
            <GlassCircle left={CLOSE.left} size={CLOSE.size} top={CLOSE.top}>
                <HugeiconsIcon className="text-foreground" icon={Cancel01Icon} size={CLOSE.icon} strokeWidth={2} />
            </GlassCircle>
        </>
    );
}

export function ModalBody({
    children,
    className = "",
    style,
}: {
    children: ReactNode;
    className?: string;
    style?: FrameStyle;
}) {
    return (
        <div className={`absolute inset-x-0 bottom-0 ${className}`} style={{ top: SHEET.top + MODAL.close, ...style }}>
            {children}
        </div>
    );
}

const BUTTON_VARIANT = {
    ghost: { label: "text-foreground", root: "bg-transparent" },
    primary: { label: "text-primary-foreground", root: "border-primary bg-primary shadow-sm" },
    secondary: { label: "text-secondary-foreground", root: "bg-secondary" },
} as const;

const BUTTON_LABEL = 16;
const BUTTON_ICON = 18;
const BUTTON_ICON_STROKE = 1.9;

export function CaptureButton({
    children,
    className = "",
    icon,
    variant,
}: {
    children: string;
    className?: string;
    icon?: IconSvgElement;
    variant: keyof typeof BUTTON_VARIANT;
}) {
    const spec = BUTTON_VARIANT[variant];
    return (
        <div
            className={`min-h-11 min-w-11 flex-row items-center justify-center gap-2 rounded-full border border-transparent px-4 py-2.5 ${spec.root} ${className}`}
        >
            {icon ? (
                <HugeiconsIcon className={spec.label} icon={icon} size={BUTTON_ICON} strokeWidth={BUTTON_ICON_STROKE} />
            ) : null}
            <div className={spec.label}>
                <SystemText size={BUTTON_LABEL} weight={500}>
                    {children}
                </SystemText>
            </div>
        </div>
    );
}

export function ButtonPair({
    primary,
    secondary,
    tertiary,
}: {
    primary: ReactNode;
    secondary: ReactNode;
    tertiary?: ReactNode;
}) {
    return (
        <div className="gap-1">
            <div className="flex-row items-center gap-2.5">
                <div className="flex-1">{secondary}</div>
                <div className="flex-1">{primary}</div>
            </div>
            {tertiary}
        </div>
    );
}

const ORI = { columns: 8, rows: 6, shift: 0.056, size: 150 } as const;

export const ORI_SIZE = ORI.size;
export const ORI_SETTLED = 84;

export const ORI_CELL = { idle: 0, listening: 3, settled: 39, thinking: 19 } as const;

export function oriOffset(cell: number, shifted: boolean) {
    const x = (shifted ? ORI.shift * ORI.size : 0) - (cell % ORI.columns) * ORI.size;
    const y = -Math.floor(cell / ORI.columns) * ORI.size;
    return `translate(${x}px, ${y}px)`;
}

export function OriSprite({
    cell,
    className,
    shifted,
    size = ORI.size,
    style,
}: {
    cell: number;
    className?: string;
    shifted: boolean;
    size?: number;
    style?: FrameStyle;
}) {
    const { theme } = useReplica();
    return (
        <div className="items-center justify-center" style={{ height: size, width: size }}>
            <div
                className="overflow-hidden"
                style={{ height: ORI.size, transform: `scale(${size / ORI.size})`, width: ORI.size }}
            >
                <img
                    alt=""
                    className={className}
                    decoding="async"
                    height={ORI.size * ORI.rows}
                    loading="lazy"
                    src={theme === "dark" ? oriDark : oriLight}
                    style={{
                        height: ORI.size * ORI.rows,
                        left: 0,
                        position: "absolute",
                        top: 0,
                        transform: oriOffset(cell, shifted),
                        width: ORI.size * ORI.columns,
                        ...style,
                    }}
                    width={ORI.size * ORI.columns}
                />
            </div>
        </div>
    );
}
