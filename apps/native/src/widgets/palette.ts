/** Static hex for both schemes: the widget's `JSContext` cannot read `global.css`. `palette.test.ts` catches drift. */
export interface WidgetPalette {
    background: string;
    border: string;
    income: string;
    ink: string;
    muted: string;
    over: string;
    subtle: string;
}

export const WIDGET_PALETTE = {
    dark: {
        background: "#17150f",
        border: "#353026",
        income: "#3fd99b",
        ink: "#f2efe8",
        muted: "#a8a093",
        over: "#f17879",
        subtle: "#968e80",
    },
    light: {
        background: "#f2f0ea",
        border: "#dcd8cc",
        income: "#00714a",
        ink: "#17150f",
        muted: "#6b6557",
        over: "#bd1c1e",
        subtle: "#6d6657",
    },
} satisfies Record<"light" | "dark", WidgetPalette>;
