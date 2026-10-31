import ArrowReloadHorizontalIcon from "@hugeicons-pro/core-solid-rounded/ArrowReloadHorizontalIcon";
import Camera01Icon from "@hugeicons-pro/core-solid-rounded/Camera01Icon";
import FlashIcon from "@hugeicons-pro/core-solid-rounded/FlashIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { IconSvgElement } from "@hugeicons/react-native";
import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

const WASH = 0.2;
const INK = 0.55;
const BADGE = 19;
const RING = 2;
const WHITE = "#ffffff";

interface Box {
    height: number;
    left: number;
    top: number;
    width: number;
}

function SceneMark({ box, color, radius }: { box: Box; color: string; radius: number }) {
    return <View className="absolute" style={{ ...box, backgroundColor: color, borderRadius: radius }} />;
}

function Badge({
    children,
    color,
    left,
    size = BADGE,
    top,
}: {
    children: ReactNode;
    color: string;
    left: number;
    size?: number;
    top: number;
}) {
    const colors = useColors();
    const outer = size + RING * 2;
    return (
        <View
            className="absolute items-center justify-center"
            style={{
                backgroundColor: color,
                borderColor: colors.background,
                borderRadius: outer / 2,
                borderWidth: RING,
                height: outer,
                left: left - RING,
                top: top - RING,
                width: outer,
            }}
        >
            {children}
        </View>
    );
}

function BadgeIcon({ color, icon, left, top }: { color: string; icon: IconSvgElement; left: number; top: number }) {
    return (
        <Badge color={color} left={left} top={top}>
            <HugeiconsIcon color={WHITE} icon={icon} size={11} />
        </Badge>
    );
}

function AutologScene({ color }: { color: string }) {
    const ink = withAlpha(color, INK);
    return (
        <>
            <SceneMark box={{ height: 24, left: 1, top: 6, width: 40 }} color={withAlpha(color, WASH)} radius={7} />
            <SceneMark box={{ height: 10, left: 6, top: 13, width: 10 }} color={ink} radius={5} />
            <SceneMark box={{ height: 3, left: 20, top: 13, width: 16 }} color={ink} radius={1.5} />
            <SceneMark box={{ height: 3, left: 20, top: 19, width: 10 }} color={ink} radius={1.5} />
            <BadgeIcon color={color} icon={FlashIcon} left={29} top={20} />
        </>
    );
}

const RECEIPT_LINES = [
    { top: 8, width: 14 },
    { top: 14, width: 10 },
    { top: 20, width: 12 },
] as const;

function CapturesScene({ color }: { color: string }) {
    const ink = withAlpha(color, INK);
    return (
        <>
            <SceneMark box={{ height: 35, left: 6, top: 1, width: 26 }} color={withAlpha(color, WASH)} radius={4} />
            {RECEIPT_LINES.map((line) => (
                <SceneMark box={{ height: 3, left: 11, ...line }} color={ink} key={line.top} radius={1.5} />
            ))}
            <SceneMark box={{ height: 3, left: 11, top: 27, width: 16 }} color={color} radius={1.5} />
            <BadgeIcon color={color} icon={Camera01Icon} left={26} top={20} />
        </>
    );
}

function AccountsScene({ color }: { color: string }) {
    return (
        <>
            <View
                className="absolute items-center justify-center rounded-full"
                style={{ backgroundColor: withAlpha(color, WASH), height: 28, left: 2, top: 3, width: 28 }}
            >
                <Text className="font-sans-bold text-[15px] leading-[18px]" style={{ color }}>
                    $
                </Text>
            </View>
            <Badge color={color} left={20} size={24} top={14}>
                <Text className="font-sans-bold text-[13px] leading-[16px]" style={{ color: WHITE }}>
                    €
                </Text>
            </Badge>
        </>
    );
}

function SyncScene({ color }: { color: string }) {
    const ink = withAlpha(color, INK);
    return (
        <>
            <SceneMark box={{ height: 31, left: 17, top: 0, width: 18 }} color={withAlpha(color, 0.1)} radius={5} />
            <SceneMark box={{ height: 34, left: 6, top: 4, width: 20 }} color={withAlpha(color, 0.24)} radius={6} />
            <SceneMark box={{ height: 2.5, left: 12, top: 7.5, width: 8 }} color={ink} radius={1.25} />
            <SceneMark box={{ height: 2, left: 12, top: 33, width: 8 }} color={ink} radius={1} />
            <BadgeIcon color={color} icon={ArrowReloadHorizontalIcon} left={23} top={20} />
        </>
    );
}

const FEATURES = [
    { color: "#4B9263", key: "autolog", Scene: AutologScene },
    { color: "#AB723A", key: "captures", Scene: CapturesScene },
    { color: "#1190A5", key: "accounts", Scene: AccountsScene },
    { color: "#6C7BBD", key: "sync", Scene: SyncScene },
] as const;

/** Each scene is one object washed in its feature's hue and one solid badge, so the four read as a set. */
export function FeatureRows() {
    const t = useTranslation();
    return (
        <View className="gap-3.5 pt-5">
            {FEATURES.map(({ color, key, Scene }) => {
                const title = t(`pro.feature.${key}`);
                const detail = t(`pro.feature.${key}.detail`);
                return (
                    <View
                        accessibilityLabel={`${title}. ${detail}`}
                        accessible
                        className="flex-row items-center gap-3.5"
                        key={key}
                    >
                        <View importantForAccessibility="no-hide-descendants" style={{ height: 38, width: 48 }}>
                            <Scene color={color} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-foreground text-subtitle font-sans-semibold">{title}</Text>
                            <Text className="text-muted text-footnote">{detail}</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}
