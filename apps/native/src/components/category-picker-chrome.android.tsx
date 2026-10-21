import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import Tick02Icon from "@hugeicons-pro/core-stroke-rounded/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { memo } from "react";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { SheetHeader } from "@/components/sheet-header";
import type { Category } from "@/data/categories-core";
import { useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";
import { useMaterialColors } from "@/theme/use-material-colors";

import { CategoryIconTile } from "./category-icon-tile";
import type { CategoryRowProps } from "./category-picker-chrome";
import { categoryTint, HighlightedName } from "./category-picker-shared";
import { Text } from "./text";
import { cn } from "./tw";

export type { CategoryRowProps } from "./category-picker-chrome";

// `SheetHeader` draws the drag handle, so the Compose sheet's own is off.
export const CATEGORY_PICKER_HANDLE = null;

export function CategoryPickerHeader({ onClose, title }: { onClose: () => void; title: string }) {
    return <SheetHeader onClose={onClose} title={title} />;
}

// No card: the rows bleed over the list's 20dp gutter so their ripples reach the edges.
export function CategoryPickerGroup({ children }: { children: ReactNode }) {
    return <View className="-mx-5">{children}</View>;
}

export const CategoryRow = memo(
    ({
        category,
        selected,
        indented = false,
        divided = false,
        childCount = 0,
        excluded = false,
        expanded = false,
        caption,
        crumb = null,
        highlight,
        onSelect,
        onToggle,
    }: CategoryRowProps) => {
        const t = useTranslation();
        const colors = useColors();
        const m3 = useMaterialColors();
        const hasChildren = childCount > 0 && onToggle != null;

        return (
            <View>
                {divided ? (
                    <View className={cn("border-m3-outline-variant border-t", indented ? "ml-[76px]" : "mx-5")} />
                ) : null}
                <View className="flex-row items-center">
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: excluded, selected }}
                        android_ripple={{ color: withAlpha(m3.onSurface, 0.1) }}
                        className={cn(
                            "min-h-14 flex-1 flex-row items-center gap-4 py-2 pr-2",
                            indented ? "pl-[76px]" : "pl-5",
                            excluded && "opacity-40"
                        )}
                        disabled={excluded}
                        onPress={() => onSelect(category)}
                        testID={`category-row-${category.id}`}
                    >
                        <CategoryIconTile
                            color={categoryTint(category, colors.income)}
                            emoji={category.emoji}
                            icon={category.icon}
                            size={indented ? 32 : 40}
                            type="solid"
                        />
                        <View className="flex-1">
                            <Text className="text-body text-m3-on-surface leading-6" numberOfLines={1}>
                                {crumb ? (
                                    <Text
                                        className="text-m3-on-surface-variant"
                                        testID={`category-crumb-${category.id}`}
                                    >
                                        {`${crumb} › `}
                                    </Text>
                                ) : null}
                                <HighlightedName match={highlight} name={category.name ?? ""} tint={m3.primary} />
                            </Text>
                            {caption ? (
                                <Text className="text-caption text-m3-on-surface-variant leading-5" numberOfLines={1}>
                                    {caption}
                                </Text>
                            ) : null}
                        </View>
                        {selected ? (
                            <HugeiconsIcon color={m3.primary} icon={Tick02Icon} size={24} strokeWidth={2} />
                        ) : null}
                    </Pressable>
                    {hasChildren ? (
                        <Pressable
                            accessibilityLabel={t(
                                expanded ? "transaction.category.a11yCollapse" : "transaction.category.a11yExpand",
                                { name: category.name ?? "" }
                            )}
                            accessibilityRole="button"
                            android_ripple={{ borderless: true, color: withAlpha(m3.onSurface, 0.1), radius: 24 }}
                            className="h-12 flex-row items-center gap-1 pr-4 pl-2"
                            onPress={() => onToggle(category.id)}
                        >
                            <Text className="text-caption text-m3-on-surface-variant font-mono tabular-nums">
                                {String(childCount)}
                            </Text>
                            <View className={expanded ? "rotate-90" : "rotate-0"}>
                                <HugeiconsIcon
                                    color={m3.onSurfaceVariant}
                                    icon={ArrowRight01Icon}
                                    size={20}
                                    strokeWidth={1.8}
                                />
                            </View>
                        </Pressable>
                    ) : null}
                </View>
            </View>
        );
    }
);
CategoryRow.displayName = "CategoryRow";

// Outlined: the iOS pill's fill would vanish here, where the sheet and `surface` share a tone.
export const RecentChip = memo(
    ({ category, onSelect }: { category: Category; onSelect: (category: Category) => void }) => {
        const colors = useColors();
        const m3 = useMaterialColors();
        return (
            <Pressable
                accessibilityRole="button"
                android_ripple={{ color: withAlpha(m3.onSurface, 0.1) }}
                className="border-m3-outline-variant h-8 flex-row items-center gap-2 overflow-hidden rounded-lg border pr-4 pl-1"
                onPress={() => onSelect(category)}
            >
                <CategoryIconTile
                    color={categoryTint(category, colors.income)}
                    emoji={category.emoji}
                    icon={category.icon}
                    radius={999}
                    size={24}
                    type="solid"
                />
                <Text className="font-sans-medium text-caption text-m3-on-surface" numberOfLines={1}>
                    {category.name}
                </Text>
            </Pressable>
        );
    }
);
RecentChip.displayName = "RecentChip";
