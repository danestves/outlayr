import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { CHILD_TILE, Eyebrow, PARENT_TILE } from "@/components/category-list-chrome";
import { ReorderList } from "@/components/reorder-list";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { useCategoriesByNamespace } from "@/data/categories";
import { categoriesRepo } from "@/data/categories-core";
import type { Category, CategoryWithChildren } from "@/data/categories-core";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

/** Within its own list only: the write cannot re-parent. */
export function CategoryReorder({ income }: { income: boolean }) {
    const db = useDatabase();
    const t = useTranslation();
    const colors = useColors();
    const parents = useCategoriesByNamespace(db, income);
    const accent = (parent: CategoryWithChildren) => (income ? colors.income : (parent.color ?? colors.foreground));

    const reorder = (ids: string[]) => categoriesRepo.reorder(db, ids);

    return (
        <ScrollView className="bg-m3-surface flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
            <View className="px-4 pt-2 pb-2">
                <Eyebrow colors={colors}>{t("categories.title")}</Eyebrow>
            </View>
            <ReorderList
                items={parents}
                keyOf={(parent) => parent.id}
                labelOf={(parent) => parent.name ?? ""}
                onReorder={reorder}
                renderItem={(parent) => <ReorderRow category={parent} tint={accent(parent)} />}
            />

            {parents
                .filter((parent) => parent.children.length > 0)
                .map((parent) => (
                    <View key={parent.id}>
                        <View className="px-4 pt-8 pb-2">
                            <Eyebrow colors={colors}>{parent.name ?? ""}</Eyebrow>
                        </View>
                        <ReorderList
                            items={parent.children}
                            keyOf={(child) => child.id}
                            labelOf={(child) => child.name ?? ""}
                            onReorder={reorder}
                            renderItem={(child) => <ReorderRow category={child} indented tint={accent(parent)} />}
                        />
                    </View>
                ))}
        </ScrollView>
    );
}

function ReorderRow({ category, tint, indented = false }: { category: Category; tint: string; indented?: boolean }) {
    const size = indented ? CHILD_TILE : PARENT_TILE;
    return (
        <View className={indented ? "flex-row items-center gap-3" : "flex-row items-center gap-4"}>
            <CategoryIconTile color={tint} emoji={category.emoji} icon={category.icon} size={size} type="solid" />
            <Text
                className={
                    indented
                        ? "text-subtitle text-m3-on-surface flex-1"
                        : "font-sans-semibold text-body text-m3-on-surface flex-1"
                }
                numberOfLines={1}
            >
                {category.name}
            </Text>
        </View>
    );
}
