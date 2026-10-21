import { createContext, use } from "react";
import type { ComponentProps, ComponentRef, Ref } from "react";
import { Text as RNText, TextInput as RNTextInput, StyleSheet } from "react-native";
import type { TextProps, TextStyle } from "react-native";

import { SANS_BY_WEIGHT } from "@/theme/body-fonts";
import type { SansWeight } from "@/theme/body-fonts";

// Named for iOS's rounded face; on Android it is Google Sans Flex, whose static files have no rounded cut.
export const { 400: ROUNDED } = SANS_BY_WEIGHT;

type ThemedTextProps = TextProps & {
    className?: string;
    ref?: Ref<ComponentRef<typeof RNText>>;
};

// See `text.tsx`: a `font-*` family utility means the caller chose the face.
const FAMILY_CLASS = /(^|\s)font-(sans|mono)(-\w+)?(\s|$)/;

// Uniwind resolves these after this component sees them.
const WEIGHT_CLASS = /(?:^|\s)font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)(?=\s|$)/;

const CLASS_WEIGHTS = new Map([
    ["thin", 100],
    ["extralight", 200],
    ["light", 300],
    ["normal", 400],
    ["medium", 500],
    ["semibold", 600],
    ["bold", 700],
    ["extrabold", 800],
    ["black", 900],
]);

const SANS_WEIGHTS = [400, 500, 600, 700] as const satisfies readonly SansWeight[];

// Ties go to the heavier, as CSS does above 500.
function nearestSans(weight: number): SansWeight {
    return SANS_WEIGHTS.reduce((best, candidate) =>
        Math.abs(candidate - weight) <= Math.abs(best - weight) ? candidate : best
    );
}

function requestedWeight(style: TextStyle | undefined, className: string | undefined): number {
    const { fontWeight } = style ?? {};
    if (fontWeight === "bold") {
        return 700;
    }
    if (fontWeight !== undefined && fontWeight !== "normal") {
        const numeric = Number(fontWeight);
        return Number.isNaN(numeric) ? 400 : numeric;
    }
    const match = WEIGHT_CLASS.exec(className ?? "");
    return (match && CLASS_WEIGHTS.get(match[1])) ?? 400;
}

export const FontScaleCapContext = createContext<number | undefined>(undefined);

// Android's static files fake a bold for a weight they lack, so the weight picks the family here. A caller that
// names a family opts out, as on iOS.
export function Text({ style, className, ref, ...rest }: ThemedTextProps) {
    const fontScaleCap = use(FontScaleCapContext);
    // SAFETY: `style` is this component's own `TextStyle`; RN types `flatten` against the wider ViewStyle union.
    const flattened = StyleSheet.flatten(style) as TextStyle | undefined;
    const keepFamily = flattened?.fontFamily != null || FAMILY_CLASS.test(className ?? "");
    const fontFamily = SANS_BY_WEIGHT[nearestSans(requestedWeight(flattened, className))];
    return (
        <RNText
            className={className}
            maxFontSizeMultiplier={fontScaleCap}
            ref={ref}
            style={keepFamily ? style : [style, { fontFamily }]}
            {...rest}
        />
    );
}

export function TextInput(props: ComponentProps<typeof RNTextInput>) {
    return <RNTextInput maxFontSizeMultiplier={use(FontScaleCapContext)} {...props} />;
}
