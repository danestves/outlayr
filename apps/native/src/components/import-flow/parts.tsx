import { View } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";

/** A neutral tile, not the app's own icon: that artwork is Orange Dog's to ship. */
const SOURCE_ICON = "Wallet03";
const SOURCE_COLOR = "#339475";

export function MoneyManagerTile({ size = 32 }: { size?: number }) {
    return <CategoryIconTile color={SOURCE_COLOR} icon={SOURCE_ICON} size={size} type="solid" />;
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
