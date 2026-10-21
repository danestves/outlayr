import { BottomSheetModal, BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import Tick02Icon from "@hugeicons-pro/core-stroke-rounded/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Button } from "panelui-native/components/button";
import { useMemo, useRef, useState } from "react";
import type { Ref } from "react";
import { Pressable, View } from "react-native";

import { useCategoriesByNamespace } from "@/data/categories";
import type { Category } from "@/data/categories-core";
import type { Database } from "@/db/client";
import { formatAmount } from "@/domain/money";
import { numberToNumpad, numpadToNumber } from "@/domain/numpad";
import { isBalanced, unallocated } from "@/domain/split";
import type { Allocation } from "@/domain/split";
import { addPart, removePart, setPartAmount, setPartCategory } from "@/domain/split-draft";
import { useMergedRef } from "@/hooks/use-merged-ref";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import { AmountEntrySheet } from "./amount-entry-sheet";
import { CategoryIconTile } from "./category-icon-tile";
import { CategoryPickerSheet } from "./category-picker-sheet";
import type { CategoryPickerSheetRef } from "./category-picker-sheet";
import { SheetGestureRoot } from "./sheet-gesture-root";
import { Text } from "./text";

interface SplitSheetProps {
    allocations: readonly Allocation[];
    code: string;
    db: Database;
    income: boolean;
    minorUnits: number;
    onChange: (next: Allocation[]) => void;
    ref?: Ref<BottomSheetModal>;
    total: number;
}

// The remainder is always shown, not an error: `unallocated` is signed, and the user needs to know which way.
export function SplitSheet({ db, income, total, code, minorUnits, allocations, onChange, ref }: SplitSheetProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const sheetBackground = { backgroundColor: useSheetSurface() };
    const sheetRef = useRef<BottomSheetModal>(null);
    const categoryRef = useRef<CategoryPickerSheetRef>(null);
    const categories = useCategoriesByNamespace(db, income);
    const [editing, setEditing] = useState<number | null>(null);
    const [amountText, setAmountText] = useState("");

    const setRefs = useMergedRef(sheetRef, ref);

    const byId = useMemo(() => {
        const map = new Map<string, Category>();
        for (const parent of categories) {
            map.set(parent.id, parent);
            for (const child of parent.children) {
                map.set(child.id, child);
            }
        }
        return map;
    }, [categories]);

    const left = unallocated(total, allocations, minorUnits);
    const balanced = isBalanced(total, allocations, minorUnits);

    const amountSheetRef = useRef<BottomSheetModal>(null);

    const editAmount = (index: number) => {
        setEditing(index);
        setAmountText(numberToNumpad(allocations[index].amount, minorUnits));
        amountSheetRef.current?.present();
    };

    const pickCategory = (index: number) => {
        setEditing(index);
        categoryRef.current?.present();
    };

    const onPickCategory = (picked: Category) => {
        if (editing == null) {
            return;
        }
        onChange(
            editing >= allocations.length
                ? addPart(allocations, picked.id)
                : setPartCategory(allocations, editing, picked.id)
        );
        categoryRef.current?.dismiss();
    };

    return (
        <BottomSheetModal
            backgroundStyle={sheetBackground}
            enableDynamicSizing={false}
            enablePanDownToClose
            ref={setRefs}
            snapPoints={["65%", "92%"]}
        >
            <SheetGestureRoot fill>
                <View className="mb-2 justify-center px-5 py-1">
                    <Text accessibilityRole="header" className="text-foreground text-center text-lg font-medium">
                        {t("transaction.split.title")}
                    </Text>
                    <View className="absolute top-0 bottom-0 left-5 justify-center">
                        <Button
                            accessibilityLabel={t("common.close")}
                            className="rounded-full"
                            onPress={() => sheetRef.current?.dismiss()}
                            size="icon"
                            variant="secondary"
                        >
                            <HugeiconsIcon color={colors.foreground} icon={Cancel01Icon} size={22} />
                        </Button>
                    </View>
                </View>

                <BottomSheetScrollView>
                    {allocations.map((part, index) => {
                        const category = part.categoryId == null ? null : byId.get(part.categoryId);
                        return (
                            <View className="border-border flex-row items-center gap-3 border-t px-5 py-3" key={index}>
                                <Pressable
                                    accessibilityLabel={t("transaction.split.chooseCategory")}
                                    accessibilityRole="button"
                                    className="flex-1 flex-row items-center gap-3"
                                    onPress={() => pickCategory(index)}
                                >
                                    {category ? (
                                        <CategoryIconTile
                                            color={category.income ? colors.income : (category.color ?? "#767676")}
                                            emoji={category.emoji}
                                            icon={category.icon}
                                            radius={999}
                                            size={28}
                                            type="solid"
                                        />
                                    ) : null}
                                    <Text className="text-body text-foreground flex-1">
                                        {category?.name ?? t("transaction.split.chooseCategory")}
                                    </Text>
                                </Pressable>
                                <Pressable
                                    accessibilityLabel={t("transaction.split.editAmount")}
                                    accessibilityRole="button"
                                    hitSlop={{ bottom: 11, left: 6, right: 6, top: 11 }}
                                    onPress={() => editAmount(index)}
                                >
                                    <Text className="text-body text-foreground font-mono tabular-nums">
                                        {formatAmount(part.amount, code, true, language)}
                                    </Text>
                                </Pressable>
                                {allocations.length > 1 ? (
                                    <Pressable
                                        accessibilityLabel={t("transaction.split.removePart")}
                                        accessibilityRole="button"
                                        hitSlop={{ bottom: 13, left: 6, right: 13, top: 13 }}
                                        onPress={() => onChange(removePart(allocations, index, minorUnits))}
                                    >
                                        <HugeiconsIcon color={colors.muted} icon={Cancel01Icon} size={18} />
                                    </Pressable>
                                ) : null}
                            </View>
                        );
                    })}

                    <View
                        className={`border-border flex-row items-center justify-between border-t px-5 py-3 ${balanced ? "" : "bg-surface"}`}
                    >
                        <Text
                            className={`text-micro tracking-eyebrow font-mono uppercase ${balanced ? "text-income" : "text-expense"}`}
                        >
                            {balanced ? t("transaction.split.balanced") : t("transaction.split.remaining")}
                        </Text>
                        <Text
                            className={`text-body font-mono tabular-nums ${balanced ? "text-income" : "text-expense"}`}
                        >
                            {formatAmount(Math.abs(left), code, true, language)}
                        </Text>
                    </View>

                    <Pressable
                        accessibilityLabel={t("transaction.split.addCategory")}
                        accessibilityRole="button"
                        className="border-border flex-row items-center gap-2 border-t px-5 py-3"
                        onPress={() => pickCategory(allocations.length)}
                    >
                        <HugeiconsIcon color={colors.accent} icon={PlusSignIcon} size={18} />
                        <Text className="text-accent text-body">{t("transaction.split.addCategory")}</Text>
                    </Pressable>

                    {balanced ? null : (
                        <Pressable
                            accessibilityRole="button"
                            className="border-border flex-row items-center gap-2 border-t px-5 py-3"
                            onPress={() =>
                                onChange(
                                    setPartAmount(
                                        total,
                                        allocations,
                                        allocations.length - 1,
                                        (allocations.at(-1)?.amount ?? 0) + left,
                                        minorUnits
                                    )
                                )
                            }
                        >
                            <HugeiconsIcon color={colors.accent} icon={Tick02Icon} size={18} />
                            <Text className="text-accent text-body">{t("transaction.split.fillRest")}</Text>
                        </Pressable>
                    )}

                    <View className="h-10" />
                </BottomSheetScrollView>

                <CategoryPickerSheet
                    db={db}
                    income={income}
                    onSelect={onPickCategory}
                    ref={categoryRef}
                    selectedId={
                        editing != null && editing < allocations.length
                            ? (allocations[editing].categoryId ?? null)
                            : null
                    }
                />
                <AmountEntrySheet
                    code={code}
                    minorUnits={minorUnits}
                    onChange={(next) => {
                        setAmountText(next);
                        if (editing != null) {
                            onChange(setPartAmount(total, allocations, editing, numpadToNumber(next), minorUnits));
                        }
                    }}
                    onDone={() => amountSheetRef.current?.dismiss()}
                    ref={amountSheetRef}
                    value={amountText}
                />
            </SheetGestureRoot>
        </BottomSheetModal>
    );
}
