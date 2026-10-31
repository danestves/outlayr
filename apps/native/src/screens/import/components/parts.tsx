import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import moneyManagerLogo from "@/assets/images/import-sources/money-manager.jpg";
import notionLogo from "@/assets/images/import-sources/notion.jpg";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useColors } from "@/theme/use-colors";

// The apps' own store icons, so people recognize where their data comes from.
const SOURCE_LOGOS = {
    moneyManager: moneyManagerLogo,
    notion: notionLogo,
} as const;

export type ImportSource = keyof typeof SOURCE_LOGOS;

/** iOS app icon corner, so a store icon reads as the app it is. */
const ICON_CORNER = 0.225;

export function SourceLogo({ size = 32, source }: { size?: number; source: ImportSource }) {
    const colors = useColors();
    return (
        <Image
            accessible={false}
            source={SOURCE_LOGOS[source]}
            style={{
                borderColor: colors.border,
                borderCurve: "continuous",
                borderRadius: size * ICON_CORNER,
                borderWidth: StyleSheet.hairlineWidth,
                height: size,
                width: size,
            }}
        />
    );
}

interface ImportHeroProps {
    caption?: string;
    eyebrow: string;
    eyebrowTone?: "muted" | "tint";
    value: string;
}

export function ImportHero({ caption, eyebrow, eyebrowTone = "muted", value }: ImportHeroProps) {
    return (
        <View className="gap-1 pt-6">
            <MonoLabel className={eyebrowTone === "tint" ? "text-tint" : undefined}>{eyebrow}</MonoLabel>
            <Text
                adjustsFontSizeToFit
                className="font-sans-semibold text-foreground text-hero tracking-hero tabular-nums"
                numberOfLines={1}
            >
                {value}
            </Text>
            {caption ? <Text className="text-muted text-subtitle">{caption}</Text> : null}
        </View>
    );
}

/** Entries per year, drawn as bars so a three-year history reads at a glance. */
export function YearBars({ years }: { years: readonly { count: number; year: number }[] }) {
    const highest = Math.max(1, ...years.map((year) => year.count));
    return (
        <View className="flex-row items-end gap-2" importantForAccessibility="no-hide-descendants">
            {years.map(({ count, year }) => (
                <View className="items-center gap-1" key={year}>
                    <Text className="text-muted font-mono text-[9px]">{compactCount(count)}</Text>
                    <View
                        className={cn("bg-foreground w-4 rounded-[2px]")}
                        style={{ height: Math.max(3, Math.round((count / highest) * 38)) }}
                    />
                    <Text className="text-muted font-mono text-[9px]">{`'${String(year).slice(2)}`}</Text>
                </View>
            ))}
        </View>
    );
}

const THOUSAND = 1000;

function compactCount(count: number): string {
    if (count < THOUSAND) {
        return String(count);
    }
    const thousands = count / THOUSAND;
    return `${thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10}k`;
}
