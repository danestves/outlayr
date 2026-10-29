import { View } from "react-native";

import { Text } from "@/components/text";
import { CARD_INK, CARD_MUTED, CARD_PAPER } from "@/domain/day-card";
import type { CardWeight, DayCardLayout } from "@/domain/day-card";

const WEIGHT_CLASS = {
    medium: "font-sans-medium",
    mono: "font-mono",
    regular: "font-sans",
    semibold: "font-sans-semibold",
} satisfies Record<CardWeight, string>;

const TRACK_OPACITY = 0.2;

export function RecapCardPreview({ layout, width }: { layout: Required<DayCardLayout>; width: number }) {
    const scale = width / layout.width;
    return (
        <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ height: layout.height * scale, width }}
        >
            <View
                style={{
                    backgroundColor: CARD_PAPER,
                    height: layout.height,
                    transform: [{ scale }],
                    transformOrigin: "top left",
                    width: layout.width,
                }}
            >
                {layout.rules.map((rule) => (
                    <View
                        key={`rule-${rule.y}`}
                        style={{
                            backgroundColor: CARD_MUTED,
                            height: rule.height,
                            left: rule.x,
                            opacity: 0.35,
                            position: "absolute",
                            top: rule.y,
                            width: rule.width,
                        }}
                    />
                ))}
                {layout.bars.map((bar) => (
                    <View
                        key={`bar-${bar.y}`}
                        style={{
                            borderRadius: bar.height / 2,
                            height: bar.height,
                            left: bar.x,
                            overflow: "hidden",
                            position: "absolute",
                            top: bar.y,
                            width: bar.width,
                        }}
                    >
                        <View
                            style={{
                                backgroundColor: CARD_MUTED,
                                height: "100%",
                                opacity: TRACK_OPACITY,
                                width: "100%",
                            }}
                        />
                        <View
                            style={{
                                backgroundColor: bar.color,
                                height: "100%",
                                position: "absolute",
                                width: Math.max(bar.height, bar.width * bar.fraction),
                            }}
                        />
                    </View>
                ))}
                {layout.texts.map((text) => (
                    <Text
                        className={WEIGHT_CLASS[text.weight]}
                        key={`text-${text.y}-${text.align}`}
                        numberOfLines={1}
                        style={{
                            color: text.tone === "ink" ? CARD_INK : CARD_MUTED,
                            fontSize: text.size,
                            position: "absolute",
                            top: text.y - text.size,
                            ...(text.align === "right" ? { right: layout.width - text.x } : { left: text.x }),
                        }}
                    >
                        {text.text}
                    </Text>
                ))}
            </View>
        </View>
    );
}
