import { BottomSheetModal, BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import Search01Icon from "@hugeicons-pro/core-stroke-rounded/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { InputGroup } from "panelui-native/components/input-group";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode, Ref } from "react";
import { Pressable, View } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

import { SheetGestureRoot } from "@/components/sheet-gesture-root";
import { useCategoriesByNamespace } from "@/data/categories";
import type { Category } from "@/data/categories-core";
import { useRecentCategoryIds } from "@/data/category-recents";
import type { Database } from "@/db/client";
import { expandedForSelectedCategory, searchCategoryTree } from "@/domain/category-search";
import { useMergedRef } from "@/hooks/use-merged-ref";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import {
    CATEGORY_PICKER_HANDLE,
    CategoryPickerGroup,
    CategoryPickerHeader,
    CategoryRow,
    RecentChip,
} from "./category-picker-chrome";
import { Text } from "./text";

const EASE = Easing.inOut(Easing.ease);
const CARD_LAYOUT = LinearTransition.duration(300).easing(EASE);
const CHILD_IN = FadeIn.duration(300).easing(EASE);
const CHILD_OUT = FadeOut.duration(300).easing(EASE);

interface CategoryPickerSheetProps {
    db: Database;
    /** E.g. budgeted ones: `budgets.categoryId` is unique, so picking one would fail at save, unexplained. */
    excludeIds?: readonly string[];
    income: boolean;
    /** Omitted by hosts that cannot mint a category, which also hides the create action. */
    onCreate?: (name: string) => void;
    /** Fires on a swipe-dismiss too, so a presenter can undo whatever it did to open this. */
    onDismiss?: () => void;
    onSelect: (category: Category) => void;
    ref?: Ref<BottomSheetModal>;
    selectedId: string | null;
}

export type CategoryPickerSheetRef = BottomSheetModal;

export function CategoryPickerSheet({
    onDismiss,
    db,
    excludeIds,
    income,
    selectedId,
    onSelect,
    onCreate,
    ref,
}: CategoryPickerSheetProps) {
    const t = useTranslation();
    const colors = useColors();
    const sheetSurface = useSheetSurface();
    const offered = useCategoriesByNamespace(db, income);
    const blocked = useMemo(() => new Set(excludeIds), [excludeIds]);
    // A blocked parent stays as a container while it holds pickable children: budgets are unique per exact id.
    const categories = useMemo(() => {
        if (blocked.size === 0) {
            return offered;
        }
        return offered
            .map((parent) =>
                parent.children.some((child) => blocked.has(child.id))
                    ? { ...parent, children: parent.children.filter((child) => !blocked.has(child.id)) }
                    : parent
            )
            .filter((parent) => !blocked.has(parent.id) || parent.children.length > 0);
    }, [offered, blocked]);
    const recentIds = useRecentCategoryIds(db, income);
    const sheetRef = useRef<BottomSheetModal>(null);
    const [query, setQuery] = useState("");
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

    const setRefs = useMergedRef(sheetRef, ref);

    const [seededFor, setSeededFor] = useState<string | null | undefined>(undefined);
    if (categories.length > 0 && seededFor !== selectedId) {
        setSeededFor(selectedId);
        const holder = expandedForSelectedCategory(categories, selectedId);
        if (holder.size > 0) {
            setExpanded((prev) => new Set([...prev, ...holder]));
        }
    }

    const toggle = useCallback((id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const dismiss = useCallback(() => sheetRef.current?.dismiss(), []);

    const trimmed = query.trim();
    const searching = trimmed.length > 0;
    const matches = useMemo(
        () => searchCategoryTree(categories, query).filter((match) => !blocked.has(match.category.id)),
        [categories, query, blocked]
    );

    const recents = useMemo(() => {
        if (recentIds.length === 0) {
            return [];
        }
        const byId = new Map<string, Category>();
        for (const parent of categories) {
            byId.set(parent.id, parent);
            for (const child of parent.children) {
                byId.set(child.id, child);
            }
        }
        return recentIds
            .map((id) => byId.get(id))
            .filter((category): category is Category => category != null && !blocked.has(category.id));
    }, [categories, recentIds, blocked]);

    const create = useCallback(() => onCreate?.(trimmed), [onCreate, trimmed]);
    const clearQuery = useCallback(() => setQuery(""), []);
    // The sheet outlives a dismiss, so a hand-collapsed parent would hide the selected child's checkmark on later
    // presents. Reset here, since presenting changes neither of the effect's deps.
    const handleDismiss = useCallback(() => {
        clearQuery();
        setExpanded(expandedForSelectedCategory(categories, selectedId));
        onDismiss?.();
    }, [categories, clearQuery, onDismiss, selectedId]);

    let searchPanel: ReactNode = null;
    if (searching && matches.length === 0) {
        searchPanel = (
            <View className="items-center px-2 pt-8">
                <Text className="text-muted text-subtitle text-center">
                    {t("transaction.category.noMatches", { query: trimmed })}
                </Text>
                {onCreate ? (
                    <Pressable
                        accessibilityRole="button"
                        className="bg-surface mt-3.5 flex-row items-center gap-2 rounded-full px-4 py-2 active:opacity-60"
                        onPress={create}
                        testID="category-create"
                    >
                        <HugeiconsIcon color={colors.tint} icon={PlusSignIcon} size={15} strokeWidth={2} />
                        <Text className="font-sans-medium text-callout text-foreground">
                            {t("transaction.category.createNamed", { query: trimmed })}
                        </Text>
                    </Pressable>
                ) : null}
            </View>
        );
    } else if (searching) {
        searchPanel = (
            <CategoryPickerGroup>
                {matches.map((match, index) => (
                    <CategoryRow
                        category={match.category}
                        crumb={match.parent?.name ?? null}
                        divided={index > 0}
                        highlight={match}
                        key={match.category.id}
                        onSelect={onSelect}
                        selected={match.category.id === selectedId}
                    />
                ))}
            </CategoryPickerGroup>
        );
    }

    return (
        <BottomSheetModal
            backgroundStyle={{ backgroundColor: sheetSurface }}
            enableDynamicSizing={false}
            enablePanDownToClose
            handleComponent={CATEGORY_PICKER_HANDLE}
            onDismiss={handleDismiss}
            ref={setRefs}
            snapPoints={["65%", "92%"]}
        >
            <SheetGestureRoot fill>
                <CategoryPickerHeader onClose={dismiss} title={t("categories.kind.category")} />

                <View className="px-5 pt-3 pb-3">
                    <InputGroup>
                        <InputGroup.Prefix className="px-2.5" isDecorative>
                            <HugeiconsIcon color={colors.muted} icon={Search01Icon} size={16} strokeWidth={2} />
                        </InputGroup.Prefix>
                        <InputGroup.Input
                            autoCapitalize="none"
                            autoCorrect={false}
                            clearButtonMode="never"
                            onChangeText={setQuery}
                            placeholder={t("transaction.category.search")}
                            returnKeyType="search"
                            size="sm"
                            testID="category-search"
                            value={query}
                        />
                        {searching ? (
                            <InputGroup.Suffix className="px-2.5">
                                <Pressable
                                    accessibilityLabel={t("common.clearSearch")}
                                    accessibilityRole="button"
                                    hitSlop={{ bottom: 15, left: 10, right: 12, top: 15 }}
                                    onPress={clearQuery}
                                    testID="category-search-clear"
                                >
                                    <HugeiconsIcon color={colors.muted} icon={Cancel01Icon} size={15} strokeWidth={2} />
                                </Pressable>
                            </InputGroup.Suffix>
                        ) : null}
                    </InputGroup>
                </View>

                <BottomSheetScrollView
                    contentContainerClassName="px-5"
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1 }}
                >
                    {searching ? (
                        searchPanel
                    ) : (
                        <>
                            {recents.length > 0 ? (
                                <>
                                    <GroupCaption text={t("transaction.category.recent")} />
                                    <View className="mb-4 flex-row flex-wrap gap-2" testID="category-recents">
                                        {recents.map((category) => (
                                            <RecentChip category={category} key={category.id} onSelect={onSelect} />
                                        ))}
                                    </View>
                                </>
                            ) : null}

                            <GroupCaption text={t("transaction.category.all")} />
                            <CategoryPickerGroup>
                                {categories.map((parent, index) => {
                                    const isExpanded = expanded.has(parent.id);
                                    return (
                                        <Animated.View key={parent.id} layout={CARD_LAYOUT}>
                                            <CategoryRow
                                                category={parent}
                                                childCount={parent.children.length}
                                                divided={index > 0}
                                                excluded={blocked.has(parent.id)}
                                                expanded={isExpanded}
                                                onSelect={onSelect}
                                                onToggle={toggle}
                                                selected={parent.id === selectedId}
                                            />
                                            {isExpanded
                                                ? parent.children.map((child) => (
                                                      <Animated.View
                                                          entering={CHILD_IN}
                                                          exiting={CHILD_OUT}
                                                          key={child.id}
                                                      >
                                                          <CategoryRow
                                                              category={child}
                                                              divided
                                                              indented
                                                              onSelect={onSelect}
                                                              selected={child.id === selectedId}
                                                          />
                                                      </Animated.View>
                                                  ))
                                                : null}
                                        </Animated.View>
                                    );
                                })}
                            </CategoryPickerGroup>
                        </>
                    )}
                </BottomSheetScrollView>
            </SheetGestureRoot>
        </BottomSheetModal>
    );
}

function GroupCaption({ text }: { text: string }) {
    return <Text className="font-sans-medium text-footnote text-muted mb-2 ml-0.5 uppercase">{text}</Text>;
}
