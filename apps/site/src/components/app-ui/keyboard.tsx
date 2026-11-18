import type { ReactNode } from "react";

import { DeleteLeft } from "./amount-pad";
import { useReplica } from "./canvas";
import type { AppTheme } from "./canvas";
import { SystemText } from "./chrome";
import { fontAscent } from "./type";

export const KEYBOARD_TOP = 545.67;
export const DISPLAY_CORNER = 62;
const KEY = { height: 43, radius: 8.5, width: 32.33 } as const;
const PITCH = 39.48;
const LETTER_ROWS = [
    { keys: "qwertyuiop", left: 7.33, top: 598 },
    { keys: "asdfghjkl", left: 27, top: 652 },
    { keys: "zxcvbnm", left: 66.33, top: 706 },
] as const;
const BOTTOM_ROWS = { controls: 760, letters: 706 } as const;
const BASELINE = 28;
const LETTER_SIZE = { lower: 24, upper: 22 } as const;
const DIVIDERS = [133, 267] as const;

const PALETTE = {
    dark: {
        divider: "#323133",
        edge: "rgba(0, 0, 0, 0.45)",
        fill: "#222120",
        ink: "#ffffff",
        key: "#464544",
        rim: "rgba(255, 255, 255, 0.16)",
    },
    light: {
        divider: "#d1d2d6",
        edge: "rgba(0, 0, 0, 0.12)",
        fill: "#e0e1e5",
        ink: "#000000",
        key: "#ffffff",
        rim: "rgba(255, 255, 255, 0.7)",
    },
} as const satisfies Record<AppTheme, Record<string, string>>;

function Key({
    children,
    color,
    left,
    top,
    width = KEY.width,
}: {
    children?: ReactNode;
    color: string;
    left: number;
    top: number;
    width?: number;
}) {
    return (
        <div
            className="absolute items-center justify-center"
            style={{ background: color, borderRadius: KEY.radius, height: KEY.height, left, top, width }}
        >
            {children}
        </div>
    );
}

function Label({ children, size }: { children: string; size: number }) {
    return (
        <div className="absolute inset-x-0 items-center" style={{ top: BASELINE - fontAscent(size) }}>
            <SystemText size={size} weight={400}>
                {children}
            </SystemText>
        </div>
    );
}

function Shift({ filled, ink }: { filled: boolean; ink: string }) {
    return (
        <svg fill={filled ? ink : "none"} height={17.33} viewBox="0 0 20 17.33" width={20}>
            <path
                d="M10 1.2L18.9 9.9H14.2V15.9C14.2 16.4 13.9 16.6 13.5 16.6H6.5C6.1 16.6 5.8 16.4 5.8 15.9V9.9H1.1Z"
                stroke={ink}
                strokeLinejoin="round"
                strokeWidth={1.5}
            />
        </svg>
    );
}

function Chevron({ ink }: { ink: string }) {
    return (
        <svg fill="none" height={16} viewBox="0 0 6.67 16" width={6.67}>
            <path
                d="M0.9 0.9L5.8 8L0.9 15.1"
                stroke={ink}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.6}
            />
        </svg>
    );
}

function Smile({ fill, ink }: { fill: string; ink: string }) {
    return (
        <svg height={26.67} viewBox="0 0 26.67 26.67" width={26.67}>
            <circle cx={13.33} cy={13.33} fill={ink} r={13.33} />
            <ellipse cx={9.2} cy={10.4} fill={fill} rx={1.9} ry={2.6} />
            <ellipse cx={17.47} cy={10.4} fill={fill} rx={1.9} ry={2.6} />
            <path d="M6.8 15.4C7.6 18.9 10.2 21.1 13.33 21.1C16.47 21.1 19.07 18.9 19.87 15.4Z" fill={fill} />
        </svg>
    );
}

function Mic({ ink }: { ink: string }) {
    return (
        <svg fill="none" height={28} viewBox="0 0 18.67 28" width={18.67}>
            <rect height={17} rx={4.85} stroke={ink} strokeWidth={1.7} width={9.7} x={4.49} y={0.85} />
            <path
                d="M0.85 12.6C0.85 18 4.6 21.8 9.33 21.8C14.07 21.8 17.82 18 17.82 12.6"
                stroke={ink}
                strokeLinecap="round"
                strokeWidth={1.7}
            />
            <path d="M9.33 21.8V27.15" stroke={ink} strokeLinecap="round" strokeWidth={1.7} />
        </svg>
    );
}

export function Keyboard({ upper }: { upper: boolean }) {
    const { theme } = useReplica();
    const palette = PALETTE[theme];
    const size = upper ? LETTER_SIZE.upper : LETTER_SIZE.lower;
    return (
        <div
            className="absolute inset-x-0 bottom-0"
            style={{
                background: palette.fill,
                borderRadius: `27px 27px ${DISPLAY_CORNER}px ${DISPLAY_CORNER}px`,
                boxShadow: `0 0 0 0.33px ${palette.edge}, inset 0 0.67px 0 ${palette.rim}`,
                color: palette.ink,
                top: KEYBOARD_TOP,
            }}
        >
            {DIVIDERS.map((left) => (
                <div
                    className="absolute"
                    key={left}
                    style={{ background: palette.divider, height: 24, left, top: 13.33, width: 1 }}
                />
            ))}
            {LETTER_ROWS.map((row) =>
                [...row.keys].map((letter, column) => (
                    <Key color={palette.key} key={letter} left={row.left + column * PITCH} top={row.top - KEYBOARD_TOP}>
                        <Label size={size}>{upper ? letter.toUpperCase() : letter}</Label>
                    </Key>
                ))
            )}
            <Key color={palette.key} left={7.33} top={BOTTOM_ROWS.letters - KEYBOARD_TOP} width={44}>
                <Shift filled={upper} ink={palette.ink} />
            </Key>
            <Key color={palette.key} left={350.67} top={BOTTOM_ROWS.letters - KEYBOARD_TOP} width={44.33}>
                <DeleteLeft color={palette.ink} width={20.33} />
            </Key>
            <Key color={palette.key} left={7.33} top={BOTTOM_ROWS.controls - KEYBOARD_TOP} width={91.33}>
                <Label size={18}>123</Label>
            </Key>
            <Key color={palette.key} left={106} top={BOTTOM_ROWS.controls - KEYBOARD_TOP} width={190} />
            <Key color={palette.key} left={303.33} top={BOTTOM_ROWS.controls - KEYBOARD_TOP} width={91.67}>
                <Chevron ink={palette.ink} />
            </Key>
            <div className="absolute" style={{ left: 29, top: 820.67 - KEYBOARD_TOP }}>
                <Smile fill={palette.fill} ink={palette.ink} />
            </div>
            <div className="absolute" style={{ left: 350, top: 819 - KEYBOARD_TOP }}>
                <Mic ink={palette.ink} />
            </div>
        </div>
    );
}
