import palette from "./palette.json";

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

export const WIDGET_PALETTE = palette satisfies Record<"light" | "dark", WidgetPalette>;
