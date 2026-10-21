import type { MenuComponentRef } from "@expo/ui/community/menu";
import PlusSignCircleIcon from "@hugeicons-pro/core-solid-rounded/PlusSignCircleIcon";
import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Stack, useRouter } from "expo-router";
import { useMemo, useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";

import type { ActionMenuItem } from "@/components/action-menu";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { CHILD_TILE, Eyebrow, PARENT_TILE } from "@/components/category-list-chrome";
import { useFabClearance } from "@/components/material-fab";
import { RowMenu } from "@/components/row-menu";
import { ScreenHeader } from "@/components/screen-header";
import { SwipeToDelete } from "@/components/swipe-to-delete";
import { Text } from "@/components/text";
import { toolbarIcon } from "@/components/toolbar-icons";
import { useAppSettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useCategoriesByNamespace, useCategoryTotals } from "@/data/categories";
import { categoriesRepo, presetsNotAdded } from "@/data/categories-core";
import type { Category, CategoryWithChildren, SuggestedCategoryPreset } from "@/data/categories-core";
import { setBoolSetting } from "@/data/settings-core";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";
import type { ThemeColors } from "@/theme/use-colors";
import { useMaterialColors } from "@/theme/use-material-colors";

import { CategoryGridOpen } from "./category-grid-open";

const ROW_LEADING = 16;
const STEM_X = ROW_LEADING + PARENT_TILE / 2;
const ELBOW = 15;
const CHILD_LEADING = STEM_X + ELBOW;
const PARENT_TEXT_LEADING = ROW_LEADING + PARENT_TILE + 16;
const CHILD_TEXT_LEADING = CHILD_LEADING + CHILD_TILE + 12;
const CONNECTOR_ALPHA = 0.6;
const NO_EXTRAS: readonly ActionMenuItem[] = [];

/** A deleted parent's children are re-parented to the top level, so promote them here. */
function usePendingRemoved(parents: CategoryWithChildren[], pendingId: string | null): CategoryWithChildren[] {
    return useMemo(() => {
        if (pendingId === null) {
            return parents;
        }
        return parents.flatMap((parent) => {
            if (parent.id === pendingId) {
                return parent.children.map((child) => ({ ...child, children: [] }));
            }
            if (!parent.children.some((child) => child.id === pendingId)) {
                return [parent];
            }
            return [{ ...parent, children: parent.children.filter((child) => child.id !== pendingId) }];
        });
    }, [parents, pendingId]);
}

export function Categories({ income }: { income: boolean }) {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const currency = useGlobalCurrency(db);
    const showSuggestions = useAppSettings().state.bool("categorySuggestions");
    const namespace = useCategoriesByNamespace(db, income);
    const { pendingId, requestDelete } = useDeferredDelete("category");
    const parents = usePendingRemoved(namespace, pendingId);
    const totals = useCategoryTotals(db);
    const fabClearance = useFabClearance();

    const suggestions = useMemo(
        () =>
            presetsNotAdded(
                income,
                namespace.flatMap((parent) => [parent, ...parent.children])
            ),
        [income, namespace]
    );

    const goToNewChild = (parent: CategoryWithChildren) => {
        router.push({
            params: { categoryId: parent.id },
            pathname: "/settings/categories/[categoryId]/subcategories/create",
        });
    };

    const goToEdit = (category: Category) => {
        if (category.parentId) {
            router.push({
                params: { categoryId: category.parentId, subcategoryId: category.id },
                pathname: "/settings/categories/[categoryId]/subcategories/[subcategoryId]",
            });
            return;
        }
        router.push({
            params: { categoryId: category.id },
            pathname: "/settings/categories/[categoryId]",
        });
    };

    const goToReorder = () => {
        router.push({
            params: { income: income ? "1" : "0" },
            pathname: "/settings/categories/reorder",
        });
    };

    const deleteCategory = (category: Category, hasChildren: boolean) => {
        requestDelete(category.id, t(hasChildren ? "categories.undo.bodyWithChildren" : "categories.undo.body"));
    };

    const addSuggested = (preset: SuggestedCategoryPreset) => {
        categoriesRepo.addSuggested(db, {
            color: preset.color,
            icon: preset.icon,
            income,
            name: preset.name,
        });
    };

    return (
        <>
            <ScreenHeader title={t("categories.title")} />
            <Stack.Screen.BackButton displayMode="minimal" />
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    accessibilityLabel={t(
                        showSuggestions ? "categories.a11y.hideSuggestions" : "categories.a11y.showSuggestions"
                    )}
                    onPress={() => {
                        setBoolSetting(db, "categorySuggestions", !showSuggestions);
                    }}
                >
                    <Stack.Toolbar.Icon {...toolbarIcon(showSuggestions ? "suggestionsOn" : "suggestionsOff")} />
                </Stack.Toolbar.Button>
                <Stack.Toolbar.Button
                    accessibilityLabel={t("categories.a11y.reorder")}
                    hidden={parents.length <= 1}
                    onPress={goToReorder}
                >
                    <Stack.Toolbar.Icon {...toolbarIcon("reorder")} />
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: fabClearance }}>
                {parents.length === 0 ? (
                    <CategoriesEmpty colors={colors} income={income} />
                ) : (
                    <>
                        <View className="px-4 pt-2 pb-2">
                            <CensusLine colors={colors} parents={parents} />
                        </View>
                        {parents.map((parent, index) => (
                            <ParentGroup
                                closesTree={index === parents.length - 1}
                                colors={colors}
                                currency={currency}
                                income={income}
                                key={parent.id}
                                onAddChild={goToNewChild}
                                onDelete={deleteCategory}
                                onEdit={goToEdit}
                                parent={parent}
                                totals={totals}
                            />
                        ))}
                    </>
                )}

                {showSuggestions && suggestions.length > 0 ? (
                    <>
                        <View className="px-4 pt-8 pb-2">
                            <Eyebrow colors={colors}>
                                {t("categories.suggested.eyebrow", {
                                    count: suggestions.length,
                                })}
                            </Eyebrow>
                        </View>
                        {suggestions.map((preset) => (
                            <SuggestedRow key={`${preset.name}:${preset.icon}`} onAdd={addSuggested} preset={preset} />
                        ))}
                    </>
                ) : null}
            </ScrollView>
        </>
    );
}

function CensusLine({ parents, colors }: { parents: CategoryWithChildren[]; colors: ThemeColors }) {
    const t = useTranslation();
    const children = parents.reduce((total, parent) => total + parent.children.length, 0);
    const clauses = [t("categories.census.categories", { count: parents.length })];
    if (children > 0) {
        clauses.push(t("categories.census.subcategories", { count: children }));
    }
    return <Eyebrow colors={colors}>{clauses.join(" · ")}</Eyebrow>;
}

function CategoriesEmpty({ income, colors }: { income: boolean; colors: ThemeColors }) {
    const t = useTranslation();
    return (
        <View className="items-center gap-3 px-8 py-10">
            <CategoryGridOpen colors={colors} />
            <Text className="font-sans-medium text-body text-m3-on-surface-variant text-center italic">
                {t(income ? "categories.empty.income" : "categories.empty.expense")}
            </Text>
        </View>
    );
}

function ParentGroup({
    parent,
    income,
    colors,
    currency,
    totals,
    closesTree,
    onEdit,
    onAddChild,
    onDelete,
}: {
    parent: CategoryWithChildren;
    income: boolean;
    colors: ThemeColors;
    currency: string;
    totals: Map<string, number>;
    closesTree: boolean;
    onEdit: (category: Category) => void;
    onAddChild: (parent: CategoryWithChildren) => void;
    onDelete: (category: Category, hasChildren: boolean) => void;
}) {
    const t = useTranslation();
    const accent = income ? colors.income : (parent.color ?? colors.foreground);
    const hasChildren = parent.children.length > 0;
    const rolledUpTotal = parent.children.reduce(
        (sum, child) => sum + (totals.get(child.id) ?? 0),
        totals.get(parent.id) ?? 0
    );
    const addTint = income ? colors.tint : accent;
    const addChild = () => onAddChild(parent);

    return (
        <View className={closesTree ? undefined : "border-m3-outline-variant border-b"}>
            <CategoryRow
                amount={rolledUpTotal}
                category={parent}
                currency={currency}
                menuExtras={[{ id: "addChild", label: t("categories.addSubcategory"), onPress: addChild }]}
                onDelete={() => onDelete(parent, hasChildren)}
                onEdit={onEdit}
                tint={accent}
            />
            {parent.children.map((child) => (
                <CategoryRow
                    amount={totals.get(child.id) ?? 0}
                    category={child}
                    currency={currency}
                    indented
                    key={child.id}
                    onDelete={() => onDelete(child, false)}
                    onEdit={onEdit}
                    tint={accent}
                />
            ))}
            <GhostAddRow onPress={addChild} tint={addTint} />
        </View>
    );
}

function TreeConnector({ last = false }: { last?: boolean }) {
    const m3 = useMaterialColors();
    const ink = withAlpha(m3.outline, CONNECTOR_ALPHA);
    return (
        <>
            <View
                className="absolute top-0"
                style={{ backgroundColor: ink, left: STEM_X, width: 1, ...(last ? { height: "50%" } : { bottom: 0 }) }}
            />
            <View
                className="absolute"
                style={{ backgroundColor: ink, height: 1, left: STEM_X, top: "50%", width: ELBOW }}
            />
        </>
    );
}

function CategoryRow({
    category,
    tint,
    currency,
    amount,
    indented = false,
    menuExtras = NO_EXTRAS,
    onEdit,
    onDelete,
}: {
    category: Category;
    tint: string;
    currency: string;
    amount: number;
    indented?: boolean;
    menuExtras?: readonly ActionMenuItem[];
    onEdit: (category: Category) => void;
    onDelete: () => void;
}) {
    const t = useTranslation();
    const { language } = useLanguage();
    const m3 = useMaterialColors();
    const menu = useRef<MenuComponentRef>(null);
    const size = indented ? CHILD_TILE : PARENT_TILE;
    const amountText = amount > 0 ? formatAmount(amount, currency, false, language) : null;

    const menuItems: ActionMenuItem[] = [
        { id: "edit", label: t("common.edit"), onPress: () => onEdit(category) },
        ...menuExtras,
        { destructive: true, id: "delete", label: t("common.delete"), onPress: onDelete },
    ];

    return (
        <SwipeToDelete onDelete={onDelete}>
            <Pressable
                accessibilityLabel={category.name ?? ""}
                accessibilityRole="button"
                accessibilityValue={amountText === null ? undefined : { text: amountText }}
                android_ripple={{ color: withAlpha(m3.onSurface, 0.1) }}
                className={
                    indented
                        ? "bg-m3-surface min-h-12 flex-row items-center gap-3 pr-4"
                        : "bg-m3-surface min-h-14 flex-row items-center gap-4 pr-4"
                }
                onLongPress={() => menu.current?.show()}
                onPress={() => onEdit(category)}
                style={{ paddingLeft: indented ? CHILD_LEADING : ROW_LEADING }}
            >
                {indented ? <TreeConnector /> : null}
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
                {amountText === null ? null : (
                    <Text className="text-caption text-m3-on-surface-variant tabular-nums" numberOfLines={1}>
                        {amountText}
                    </Text>
                )}
                <RowMenu items={menuItems} leading={indented ? CHILD_TEXT_LEADING : PARENT_TEXT_LEADING} ref={menu} />
            </Pressable>
        </SwipeToDelete>
    );
}

function plusGlyph({ color, size }: { color: string; size: number }) {
    return <HugeiconsIcon color={color} icon={PlusSignIcon} size={size} strokeWidth={2.4} />;
}

function GhostAddRow({ tint, onPress }: { tint: string; onPress: () => void }) {
    const t = useTranslation();
    const m3 = useMaterialColors();
    return (
        <Pressable
            accessibilityLabel={t("categories.addSubcategory")}
            accessibilityRole="button"
            android_ripple={{ color: withAlpha(m3.onSurface, 0.1) }}
            className="min-h-12 flex-row items-center gap-3 pr-4"
            onPress={onPress}
            style={{ paddingLeft: CHILD_LEADING }}
        >
            <TreeConnector last />
            <CategoryIconTile color={tint} future glyph={plusGlyph} icon={null} size={CHILD_TILE} />
            <Text className="font-sans-medium text-subtitle flex-1" numberOfLines={1} style={{ color: tint }}>
                {t("categories.addSubcategory")}
            </Text>
        </Pressable>
    );
}

function SuggestedRow({
    preset,
    onAdd,
}: {
    preset: SuggestedCategoryPreset;
    onAdd: (preset: SuggestedCategoryPreset) => void;
}) {
    const m3 = useMaterialColors();
    return (
        <Pressable
            accessibilityLabel={preset.name}
            accessibilityRole="button"
            android_ripple={{ color: withAlpha(m3.onSurface, 0.1) }}
            className="border-m3-outline-variant bg-m3-surface min-h-14 flex-row items-center gap-4 border-b px-4"
            onPress={() => onAdd(preset)}
        >
            <CategoryIconTile color={preset.color} future icon={preset.icon} size={PARENT_TILE} type="solid" />
            <Text className="text-body text-m3-on-surface-variant flex-1" numberOfLines={1}>
                {preset.name}
            </Text>
            <HugeiconsIcon color={m3.onSurfaceVariant} icon={PlusSignCircleIcon} size={22} />
        </Pressable>
    );
}
