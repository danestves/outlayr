import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import Tick02Icon from "@hugeicons-pro/core-stroke-rounded/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Button } from "panelui-native/components/button";
import { memo } from "react";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { Category } from "@/data/categories-core";
import type { CategoryMatch } from "@/domain/category-search";
import { useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { CategoryIconTile } from "./category-icon-tile";
import { categoryTint, HighlightedName } from "./category-picker-shared";
import { Text } from "./text";
import { cn } from "./tw";

export const CATEGORY_PICKER_HANDLE = undefined;

export function CategoryPickerHeader({ onClose, title }: { onClose: () => void; title: string }) {
    const t = useTranslation();
    const colors = useColors();
    return (
        <View className="mb-2 justify-center px-5 py-1">
            <Text accessibilityRole="header" className="text-foreground text-center text-lg font-medium">
                {title}
            </Text>
            <View className="absolute top-0 bottom-0 left-5 justify-center">
                <Button
                    accessibilityLabel={t("common.close")}
                    className="rounded-full"
                    onPress={onClose}
                    size="icon"
                    variant="secondary"
                >
                    <HugeiconsIcon color={colors.foreground} icon={Cancel01Icon} size={22} />
                </Button>
            </View>
        </View>
    );
}

export function CategoryPickerGroup({ children }: { children: ReactNode }) {
    return <View className="bg-surface overflow-hidden rounded-xl">{children}</View>;
}

export interface CategoryRowProps {
    category: Category;
    selected: boolean;
    indented?: boolean;
    divided?: boolean;
    childCount?: number;
    /** Present as a container for its children, but not a choice of its own. */
    excluded?: boolean;
    expanded?: boolean;
    caption?: string;
    crumb?: string | null;
    highlight?: CategoryMatch;
    onSelect: (category: Category) => void;
    onToggle?: (id: string) => void;
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
        const tint = categoryTint(category, colors.income);
        const hasChildren = childCount > 0 && onToggle != null;

        return (
            <View>
                {divided ? (
                    <View
                        className={indented ? "ml-[58px]" : undefined}
                        style={{
                            backgroundColor: withAlpha(colors.foreground, 0.07),
                            height: StyleSheet.hairlineWidth,
                        }}
                    />
                ) : null}
                <View className={cn("flex-row items-center gap-3 pr-3.5", indented ? "py-2 pl-11" : "py-2.5 pl-3.5")}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: excluded, selected }}
                        className={cn(
                            "flex-1 flex-row items-center gap-3",
                            excluded ? "opacity-45" : "active:opacity-60"
                        )}
                        disabled={excluded}
                        onPress={() => onSelect(category)}
                        testID={`category-row-${category.id}`}
                    >
                        <CategoryIconTile
                            color={tint}
                            emoji={category.emoji}
                            icon={category.icon}
                            size={indented ? 28 : 34}
                            type="solid"
                        />
                        <View className="flex-1">
                            <Text
                                className={cn(
                                    "font-sans-medium text-foreground",
                                    indented ? "text-subtitle" : "text-callout"
                                )}
                                numberOfLines={1}
                            >
                                {crumb ? (
                                    <Text className="text-muted font-sans" testID={`category-crumb-${category.id}`}>
                                        {`${crumb} › `}
                                    </Text>
                                ) : null}
                                <HighlightedName match={highlight} name={category.name ?? ""} tint={colors.tint} />
                            </Text>
                            {caption ? (
                                <Text className="text-footnote text-muted" numberOfLines={1}>
                                    {caption}
                                </Text>
                            ) : null}
                        </View>
                        {selected ? (
                            <HugeiconsIcon color={colors.tint} icon={Tick02Icon} size={18} strokeWidth={2.4} />
                        ) : null}
                    </Pressable>
                    {hasChildren ? (
                        <Pressable
                            accessibilityLabel={t(
                                expanded ? "transaction.category.a11yCollapse" : "transaction.category.a11yExpand",
                                {
                                    name: category.name ?? "",
                                }
                            )}
                            accessibilityRole="button"
                            className="h-11 flex-row items-center justify-end pl-2 active:opacity-60"
                            hitSlop={6}
                            onPress={() => onToggle(category.id)}
                        >
                            <View
                                className="flex-row items-center gap-1 rounded-full py-1 pr-1.5 pl-2"
                                style={{ backgroundColor: withAlpha(colors.foreground, 0.06) }}
                            >
                                <Text className="text-footnote text-muted font-mono tabular-nums">
                                    {String(childCount)}
                                </Text>
                                <View className={expanded ? "rotate-90" : "rotate-0"}>
                                    <HugeiconsIcon
                                        color={colors.muted}
                                        icon={ArrowRight01Icon}
                                        size={18}
                                        strokeWidth={2}
                                    />
                                </View>
                            </View>
                        </Pressable>
                    ) : null}
                </View>
            </View>
        );
    }
);
CategoryRow.displayName = "CategoryRow";

export const RecentChip = memo(
    ({ category, onSelect }: { category: Category; onSelect: (category: Category) => void }) => {
        const colors = useColors();
        return (
            <Pressable
                accessibilityRole="button"
                className="bg-surface flex-row items-center gap-2 rounded-full py-1 pr-3 pl-1 active:opacity-60"
                onPress={() => onSelect(category)}
            >
                <CategoryIconTile
                    color={categoryTint(category, colors.income)}
                    emoji={category.emoji}
                    icon={category.icon}
                    radius={999}
                    size={28}
                    type="solid"
                />
                <Text className="font-sans-medium text-foreground text-subtitle" numberOfLines={1}>
                    {category.name}
                </Text>
            </Pressable>
        );
    }
);
RecentChip.displayName = "RecentChip";
