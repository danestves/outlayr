import type { CSSProperties, ReactNode } from "react";

import { flowFigureHeight, roundedTrak, STRUT_WIDTH, textLineHeight } from "./type";

type CustomStyle = CSSProperties & Record<`--${string}`, string>;

interface FlowFigureProps {
    children: ReactNode;
    className: string;
    flush?: boolean;
    lineHeight?: number;
    size: number;
}

export function FlowFigure({ children, className, flush = false, lineHeight, size }: FlowFigureProps) {
    const natural = textLineHeight(size);
    const text: CustomStyle = {
        "--app-trak": roundedTrak(size),
        fontSize: size,
        lineHeight: `${natural}px`,
        paddingBottom: Math.ceil(natural) - natural,
    };
    return (
        <div
            className="flex-row items-center"
            style={{ height: flowFigureHeight(size, lineHeight), paddingLeft: flush ? 0 : STRUT_WIDTH }}
        >
            <span className={`whitespace-nowrap tabular-nums ${className}`} style={text}>
                {children}
            </span>
        </div>
    );
}
