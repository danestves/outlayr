import { Host } from "@expo/ui";
import { HStack, List, RNHostView, Section, Spacer, Text as SwiftText } from "@expo/ui/swift-ui";
import { environment, foregroundStyle, lineLimit } from "@expo/ui/swift-ui/modifiers";
import { View } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { CHILD_TILE, Eyebrow, PARENT_TILE } from "@/components/category-list-chrome";
import { CHILD_NAME, LABEL, PARENT_NAME } from "@/components/category-list-swift";
import { groupedList, groupedRows } from "@/components/native/styles";
import { useDatabase } from "@/contexts/local-data-context";
import { useCategoriesByNamespace } from "@/data/categories";
import { categoriesRepo } from "@/data/categories-core";
import type { Category, CategoryWithChildren } from "@/data/categories-core";
import { applyMove } from "@/domain/reorder";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

/** `onMove` is scoped to one `List.ForEach`, so each level is its own Section. */
export function CategoryReorder({ income }: { income: boolean }) {
    const db = useDatabase();
    const t = useTranslation();
    const colors = useColors();
    const parents = useCategoriesByNamespace(db, income);
    const rowGround = groupedRows(colors);
    const accent = (parent: CategoryWithChildren) => (income ? colors.income : (parent.color ?? colors.foreground));

    const reorderParents = (source: number[], destination: number) => {
        const ordered = applyMove(
            parents.map((parent) => parent.id),
            source,
            destination
        );
        categoriesRepo.reorder(db, ordered);
    };

    const reorderChildren = (parent: CategoryWithChildren, source: number[], destination: number) => {
        const ordered = applyMove(
            parent.children.map((child) => child.id),
            source,
            destination
        );
        categoriesRepo.reorder(db, ordered);
    };

    return (
        <Host style={{ flex: 1 }} useViewportSizeMeasurement>
            <List modifiers={[...groupedList(colors), environment({ key: "editMode", value: "active" })]}>
                {/* A non-empty `title` short-circuits the `header` slot natively. */}
                <Section header={<Eyebrow colors={colors}>{t("categories.title")}</Eyebrow>} modifiers={[rowGround]}>
                    <List.ForEach data={parents} keyExtractor={(parent) => parent.id} onMove={reorderParents}>
                        {({ item: parent }) => <ReorderRow category={parent} tint={accent(parent)} />}
                    </List.ForEach>
                </Section>

                {parents
                    .filter((parent) => parent.children.length > 0)
                    .map((parent) => (
                        <Section
                            header={<Eyebrow colors={colors}>{parent.name ?? ""}</Eyebrow>}
                            key={parent.id}
                            modifiers={[rowGround]}
                        >
                            <List.ForEach
                                data={parent.children}
                                keyExtractor={(child) => child.id}
                                onMove={(source, destination) => reorderChildren(parent, source, destination)}
                            >
                                {({ item: child }) => <ReorderRow category={child} indented tint={accent(parent)} />}
                            </List.ForEach>
                        </Section>
                    ))}
            </List>
        </Host>
    );
}

function ReorderRow({ category, tint, indented = false }: { category: Category; tint: string; indented?: boolean }) {
    const size = indented ? CHILD_TILE : PARENT_TILE;
    return (
        <HStack spacing={indented ? 10 : 12}>
            <RNHostView matchContents>
                <View style={{ height: size, width: size }}>
                    <CategoryIconTile
                        color={tint}
                        emoji={category.emoji}
                        icon={category.icon}
                        size={size}
                        type="solid"
                    />
                </View>
            </RNHostView>
            {/* One line keeps rows the same height, so drop targets stay put. */}
            <SwiftText modifiers={[indented ? CHILD_NAME : PARENT_NAME, lineLimit(1), foregroundStyle(LABEL)]}>
                {category.name}
            </SwiftText>
            <Spacer />
        </HStack>
    );
}
