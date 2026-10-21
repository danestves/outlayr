// No react or react-native imports: the tests run under plain `node --test`, which cannot load React Native.

const TOP_MARGIN = 16;

export function floatTargetY({
    containerHeight,
    sheetHeight,
    heroHalf,
}: {
    containerHeight: number;
    sheetHeight: number;
    heroHalf: number;
}): number {
    "worklet";

    return Math.max((containerHeight - sheetHeight) / 2, TOP_MARGIN + heroHalf);
}
