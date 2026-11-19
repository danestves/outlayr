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

export function letterKeyAt(char: string): { left: number; top: number } | undefined {
    const letter = char.toLowerCase();
    const row = LETTER_ROWS.find(({ keys }) => keys.includes(letter));
    return row && { left: row.left + row.keys.indexOf(letter) * PITCH, top: row.top };
}
const BOTTOM_ROWS = { controls: 760, letters: 706 } as const;
const BASELINE = 28;
const LETTER = {
    lower: { size: 24, width: "normal" },
    upper: { size: 22, width: "'wdth' 88" },
} as const;
const NUMBERS = { baseline: 27, size: 18 } as const;
const RETURN_GLYPH_TOP = 12;
const RIM = { fade: 1.33, fill: 3.67, start: 0.33 } as const;
const DIVIDERS = [133, 267] as const;

const PALETTE = {
    dark: {
        divider: "#323133",
        edge: "#141311",
        fade: "#272624",
        fill: "#222120",
        ink: "#ffffff",
        key: "#464544",
        rim: "#41403e",
    },
    light: {
        divider: "#d1d2d6",
        edge: "#d2d1ce",
        fade: "#e3e4e8",
        fill: "#e0e1e5",
        ink: "#000000",
        key: "#ffffff",
        rim: "#f1f1f5",
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

function Label({
    baseline = BASELINE,
    children,
    size,
    width = "normal",
}: {
    baseline?: number;
    children: string;
    size: number;
    width?: string;
}) {
    return (
        <div className="absolute inset-x-0 items-center" style={{ top: baseline - fontAscent(size) }}>
            <SystemText size={size} style={{ fontVariationSettings: width }} weight={400}>
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
        <svg fill="none" height={26.67} viewBox="0 0 26.67 26.67" width={26.67}>
            <circle cx={13.33} cy={13.17} r={12.5} stroke={ink} strokeWidth={1.6} />
            <ellipse cx={9.33} cy={10} fill={ink} rx={1} ry={1.45} />
            <ellipse cx={17.33} cy={10} fill={ink} rx={1} ry={1.45} />
            <path
                d="M5 14.5Q13.33 16.3 21.67 14.5C21.67 19.2 17.9 22.4 13.33 22.4C8.77 22.4 5 19.2 5 14.5Z"
                fill={ink}
            />
            <path d="M6.4 15.8Q13.33 17.6 20.27 15.8L19.9 17.5Q13.33 18.6 6.77 17.5Z" fill={fill} />
        </svg>
    );
}

function Mic({ ink }: { ink: string }) {
    return (
        <svg fill="none" height={28.33} viewBox="0 0 18.67 28.33" width={18.67}>
            <rect height={16.6} rx={3.63} stroke={ink} strokeWidth={1.4} width={7.27} x={5.7} y={1.03} />
            <path
                d="M0.93 11.2V15.4C0.93 19.6 4.7 22.2 9.33 22.2C13.96 22.2 17.73 19.6 17.73 15.4V11.2"
                stroke={ink}
                strokeLinecap="round"
                strokeWidth={1.4}
            />
            <path d="M9.33 22.2V27.4M3.4 27.4H15.27" stroke={ink} strokeLinecap="round" strokeWidth={1.5} />
        </svg>
    );
}

export function Keyboard({ upper }: { upper: boolean }) {
    const { theme } = useReplica();
    const palette = PALETTE[theme];
    const letter = upper ? LETTER.upper : LETTER.lower;
    return (
        <div
            className="absolute inset-x-0 bottom-0"
            style={{
                background: `linear-gradient(${palette.rim} ${RIM.start}px, ${palette.fade} ${RIM.fade}px, ${palette.fill} ${RIM.fill}px) ${palette.fill}`,
                borderRadius: `27px 27px ${DISPLAY_CORNER}px ${DISPLAY_CORNER}px`,
                boxShadow: `inset 0 0 0 ${RIM.start}px ${palette.edge}`,
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
                [...row.keys].map((key, column) => (
                    <Key color={palette.key} key={key} left={row.left + column * PITCH} top={row.top - KEYBOARD_TOP}>
                        <Label size={letter.size} width={letter.width}>
                            {upper ? key.toUpperCase() : key}
                        </Label>
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
                <Label baseline={NUMBERS.baseline} size={NUMBERS.size}>
                    123
                </Label>
            </Key>
            <Key color={palette.key} left={106} top={BOTTOM_ROWS.controls - KEYBOARD_TOP} width={190} />
            <Key color={palette.key} left={303.33} top={BOTTOM_ROWS.controls - KEYBOARD_TOP} width={91.67}>
                <div className="absolute inset-x-0 items-center" style={{ top: RETURN_GLYPH_TOP }}>
                    <Chevron ink={palette.ink} />
                </div>
            </Key>
            <div className="absolute" style={{ left: 29, top: 820.67 - KEYBOARD_TOP }}>
                <Smile fill={palette.fill} ink={palette.ink} />
            </div>
            <div className="absolute" style={{ left: 350, top: 818.67 - KEYBOARD_TOP }}>
                <Mic ink={palette.ink} />
            </div>
        </div>
    );
}
