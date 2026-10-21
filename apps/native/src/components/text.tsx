import { createContext, use } from "react";
import type { ComponentProps, ComponentRef, Ref } from "react";
import { Text as RNText, TextInput as RNTextInput, StyleSheet } from "react-native";
import type { TextProps, TextStyle } from "react-native";

export const ROUNDED = "ui-rounded";

type ThemedTextProps = TextProps & {
    className?: string;
    ref?: Ref<ComponentRef<typeof RNText>>;
};

// A family utility, not a weight like `font-bold`, which still gets the rounded face.
const FAMILY_CLASS = /(^|\s)font-(sans|mono)(-\w+)?(\s|$)/;

export const FontScaleCapContext = createContext<number | undefined>(undefined);

// A caller naming a family opts out: the injected family is an inline style, which beats className in RN, so a
// `font-mono` node would otherwise render rounded.
export function Text({ style, className, ref, ...rest }: ThemedTextProps) {
    const fontScaleCap = use(FontScaleCapContext);
    // SAFETY: `style` is this component's own `TextStyle`; RN types `flatten` against the wider ViewStyle union.
    const flattened = StyleSheet.flatten(style) as TextStyle | undefined;
    const keepFamily = flattened?.fontFamily != null || FAMILY_CLASS.test(className ?? "");
    return (
        <RNText
            className={className}
            maxFontSizeMultiplier={fontScaleCap}
            ref={ref}
            style={keepFamily ? style : [style, { fontFamily: ROUNDED }]}
            {...rest}
        />
    );
}

export function TextInput(props: ComponentProps<typeof RNTextInput>) {
    return <RNTextInput maxFontSizeMultiplier={use(FontScaleCapContext)} {...props} />;
}
