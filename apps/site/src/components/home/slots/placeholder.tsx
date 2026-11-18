import type { CSSProperties } from "react";

export type SlotTheme = "dark" | "light";

export interface SlotProps {
    label?: string;
    theme?: SlotTheme;
}

type PlaceholderProps = SlotProps & {
    fill?: boolean;
    name: string;
    phoneRatio?: string;
    radius?: string;
    ratio?: string;
};

export function SlotPlaceholder({ fill, label, name, phoneRatio, radius, ratio, theme = "light" }: PlaceholderProps) {
    const style: CSSProperties = { "--radius": radius, "--ratio": ratio, "--ratio-m": phoneRatio ?? ratio };
    return (
        <div
            aria-hidden={label === undefined ? true : undefined}
            aria-label={label}
            className="hz-slot"
            data-fill={fill ? "" : undefined}
            data-tone={theme}
            role={label === undefined ? undefined : "img"}
            style={style}
        >
            {name}
        </div>
    );
}
