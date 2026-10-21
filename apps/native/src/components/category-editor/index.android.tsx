import CheckmarkCircle02Icon from "@hugeicons-pro/core-solid-rounded/CheckmarkCircle02Icon";
import Delete02Icon from "@hugeicons-pro/core-stroke-rounded/Delete02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useForm, useSelector } from "@tanstack/react-form";
import { and, eq, isNull } from "drizzle-orm";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, ScrollView, View } from "react-native";
import type { TextInputInstance } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { holdSubmitting, pressSubmit } from "@/components/form/submit-guard";
import { IdentityHero } from "@/components/identity-hero";
import { SheetHeader, SheetHeaderIconButton, SheetHeaderTextButton } from "@/components/sheet-header";
import { Text } from "@/components/text";
import { EMPTY_DRAFT, useIdentityDraft, useIdentityFlyUp } from "@/contexts/identity-draft-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useCategoriesByNamespace } from "@/data/categories";
import { CATEGORY_PALETTE, categoriesRepo, getCategoryById } from "@/data/categories-core";
import type { Category } from "@/data/categories-core";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import type { Database } from "@/db/client";
import { categories } from "@/db/schema";
import { firstAvailableColor } from "@/domain/category-color";
import { CATEGORY_ERROR_KEYS, categoryErrorCode } from "@/domain/category-error";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import type { TranslatableKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import { posthog } from "@/lib/posthog";
import { useHaptics } from "@/lib/use-haptics";
import { useColors } from "@/theme/use-colors";
import { useMaterialColors } from "@/theme/use-material-colors";

import { CategoryDetailsFields } from "./details-fields";
import type { CategoryEditorProps } from "./index";

const MAX_EXPENSE_CATEGORIES = 24;
const HERO_TOP = 8;
const HERO_BOTTOM = 24;
const CAPTION_CLEARANCE = 24;
const TOAST_MS = 2000;

interface CategoryEditorSubject {
    create: boolean;
    income: boolean;
    isSubcategory: boolean;
    parent: Category | null;
}

function categoryEditorCopy(t: TranslateFn, { create, income, isSubcategory, parent }: CategoryEditorSubject) {
    const namespacePlaceholderKey = income ? "categories.namePlaceholder.income" : "categories.namePlaceholder.expense";
    const inheritsCaption = parent ? t("categories.inherits", { parent: parent.name }) : null;
    const incomeCaption = income ? t("categories.incomeColorNote") : null;
    const createCaption = isSubcategory ? inheritsCaption : incomeCaption;
    return {
        caption: create ? createCaption : null,
        namePlaceholder: t(isSubcategory ? "categories.namePlaceholder.subcategory" : namespacePlaceholderKey),
    };
}

function categoryTitleKey(mode: CategoryEditorProps["mode"], isSubcategory: boolean, stored: Category | null) {
    if (mode === "create") {
        return isSubcategory ? "nav.newSubcategory" : "nav.newCategory";
    }
    return categoryKindKey(stored);
}

/** Mirrors `category-edit-screen.tsx`, which titles the iOS edit sheet. */
function categoryKindKey(edited: Category | null): TranslatableKey {
    if (edited == null) {
        return "categories.kind.category";
    }
    if (edited.parentId != null) {
        return "categories.kind.subcategory";
    }
    return edited.income ? "categories.kind.income" : "categories.kind.expense";
}

/** An edit tolerates an empty symbol only where the stored category never carried one. */
function categoryIsSaveable(
    mode: CategoryEditorProps["mode"],
    name: string,
    symbolEmpty: boolean,
    stored: Category | null
): boolean {
    if (name.trim() === "") {
        return false;
    }
    if (!symbolEmpty) {
        return true;
    }
    return mode === "edit" && stored != null && stored.icon == null && stored.emoji == null;
}

export default function CategoryEditor(props: CategoryEditorProps) {
    const db = useDatabase();
    return <CategoryEditorReady db={db} {...props} />;
}

// Form logic mirrors `index.tsx` minus the SwiftUI pieces and the fly-up, and Delete mirrors
// `category-edit-screen.tsx`: keep them in step.
function CategoryEditorReady(props: CategoryEditorProps & { db: Database }) {
    // The parent spreads a fresh `props` every render, so effects key off these primitives, never `props`.
    const { db, mode } = props;
    const parentId = props.mode === "create" ? (props.parentId ?? null) : null;
    const editId = props.mode === "edit" ? props.id : null;
    const initialIncome = props.mode === "create" ? !!props.income : false;
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const m3 = useMaterialColors();
    const haptics = useHaptics();
    const insets = useSafeAreaInsets();
    const keyboardHeight = useKeyboardHeight();
    const { requestDelete } = useDeferredDelete("category");

    const { draft, setDraft } = useIdentityDraft();
    const { pickerOpen, setPickerOpen } = useIdentityFlyUp();

    // Lazy `useState`, not `useMemo`: a re-read would re-fire the draft effects below and clobber the user's picks.
    const [loaded] = useState<Category | null>(() =>
        mode === "edit" && editId != null ? getCategoryById(db, editId) : null
    );
    const [parent] = useState<Category | null>(() =>
        mode === "create" && parentId != null ? getCategoryById(db, parentId) : null
    );

    const nameRef = useRef<TextInputInstance>(null);
    const [failure, setFailure] = useState<string | null>(null);

    const [initialValues] = useState(() => ({
        income: parent?.income ?? initialIncome,
        name: loaded?.name ?? "",
    }));
    const form = useForm({
        defaultValues: initialValues,
        onSubmit: async ({ value }) => {
            setFailure(null);
            const persist = async () => {
                if (mode === "create") {
                    return await addCategory(value);
                }
                if (loaded == null) {
                    return;
                }
                await categoriesRepo.update(db, loaded.id, {
                    color: loaded.income ? undefined : (draft.color ?? CATEGORY_PALETTE[0]),
                    emoji: draft.emoji ?? null,
                    icon: draft.icon ?? null,
                    name: value.name,
                });
                posthog?.capture("category_saved", {
                    category_type: loaded.income ? "income" : "expense",
                    is_subcategory: isSubcategory,
                    mode: "edit",
                });
                haptics("success");
                router.back();
                return await holdSubmitting();
            };
            return await persist().catch(reportSaveFailure);
        },
    });
    const { name, income: formIncome } = useSelector(form.store, (s) => s.values);
    const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);

    const [colorTouched, setColorTouched] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const expenseTree = useCategoriesByNamespace(db, false);

    const allExpense = useMemo(() => expenseTree.flatMap((node) => [node, ...node.children]), [expenseTree]);
    const expenseCount = allExpense.length;
    const usedColors = useMemo(() => {
        const set = new Set<string>();
        for (const category of allExpense) {
            if (category.id === editId) {
                continue;
            }
            if (category.color) {
                set.add(category.color);
            }
        }
        return set;
    }, [allExpense, editId]);

    // `pickerOpen` lives in the app-level provider, so a path that left it set would disable this sheet's actions.
    useEffect(() => {
        setPickerOpen(false);
    }, [setPickerOpen]);

    // The draft is shared context, so a create editor may mount onto another screen's leftovers.
    useEffect(() => {
        if (mode !== "create") {
            return;
        }
        setDraft(EMPTY_DRAFT);
    }, [mode, setDraft]);

    // Seeded with the raw icon/emoji, not the resolved fallback, so an unknown glyph is not rewritten on save.
    useEffect(() => {
        if (mode !== "edit") {
            return;
        }
        setDraft(
            loaded
                ? {
                      color: loaded.color ?? CATEGORY_PALETTE[0],
                      emoji: loaded.emoji ?? null,
                      icon: loaded.icon ?? null,
                      photoColor: null,
                      photoUri: null,
                  }
                : EMPTY_DRAFT
        );
    }, [mode, loaded, setDraft]);

    useEffect(() => {
        if (mode !== "create" || parent == null) {
            return;
        }
        setDraft({
            color: parent.color ?? CATEGORY_PALETTE[0],
            emoji: null,
            icon: null,
            photoColor: null,
            photoUri: null,
        });
    }, [mode, parent, setDraft]);

    useEffect(
        () => () => {
            if (toastTimer.current !== null) {
                clearTimeout(toastTimer.current);
            }
        },
        []
    );

    const isSubcategory = mode === "create" ? parentId != null : (loaded?.parentId ?? null) != null;
    const income = mode === "create" ? formIncome : (loaded?.income ?? false);
    const atExpenseLimit = expenseCount >= MAX_EXPENSE_CATEGORIES;

    useEffect(() => {
        if (mode !== "create" || parentId != null || colorTouched) {
            return;
        }
        const next = firstAvailableColor(usedColors);
        if (draft.color === next) {
            return;
        }
        setDraft({
            color: next,
            emoji: null,
            icon: null,
            photoColor: null,
            photoUri: null,
        });
    }, [mode, parentId, colorTouched, usedColors, draft.color, setDraft]);

    useEffect(() => {
        if (mode !== "create" || parentId != null) {
            return;
        }
        if (atExpenseLimit) {
            form.setFieldValue("income", true);
        }
    }, [mode, parentId, atExpenseLimit, form]);

    // Keyed on the count changing, not its value: firing on mount would race the force-income effect above and close
    // a sheet that was about to become an income one.
    const seenExpenseCount = useRef(expenseCount);
    useEffect(() => {
        const changed = expenseCount !== seenExpenseCount.current;
        seenExpenseCount.current = expenseCount;
        if (changed && mode === "create" && parentId == null && !income && expenseCount >= MAX_EXPENSE_CATEGORIES) {
            router.back();
        }
    }, [expenseCount, mode, parentId, income, router]);

    const symbolEmpty = !(draft.icon || draft.emoji);
    const tint = income ? colors.income : (draft.color ?? CATEGORY_PALETTE[0]);
    const typePickerVisible = mode === "create" && !isSubcategory && !atExpenseLimit;

    const canSave = categoryIsSaveable(mode, name, symbolEmpty, loaded) && !isSubmitting;

    const { caption, namePlaceholder } = categoryEditorCopy(t, {
        create: mode === "create",
        income,
        isSubcategory,
        parent,
    });

    // While the picker is up, a tap that reaches this sheet past it must not save, delete, or open a second picker.
    const openPicker = () => {
        if (pickerOpen) {
            return;
        }
        Keyboard.dismiss();
        // Freezes the auto-color so a color picked in the picker survives.
        setColorTouched(true);
        setPickerOpen(true);
        router.push({
            params: {
                editId: editId ?? "",
                income: income ? "1" : "0",
                subcategory: isSubcategory ? "1" : "0",
            },
            pathname: "/settings/category-symbol",
        });
    };

    const addCategory = async (value: { income: boolean; name: string }) => {
        const pickedColor = draft.color ?? CATEGORY_PALETTE[0];
        const expenseColor = isSubcategory ? (parent?.color ?? pickedColor) : pickedColor;
        await categoriesRepo.create(db, {
            color: value.income ? colors.income : expenseColor,
            emoji: draft.emoji ?? null,
            icon: draft.icon ?? undefined,
            income: value.income,
            name: value.name,
            parentId,
        });
        posthog?.capture("category_saved", {
            category_type: value.income ? "income" : "expense",
            is_subcategory: isSubcategory,
            mode: "create",
        });
        haptics("success");
        if (isSubcategory) {
            router.back();
            return await holdSubmitting();
        }
        form.setFieldValue("name", "");
        // Cleared, not advanced: with `colorTouched` released, the auto-color effect picks the first free slot after
        // this insert lands, where a value chosen now would come from the pre-insert set.
        setColorTouched(false);
        setDraft(EMPTY_DRAFT);
        flashAdded();
    };

    const reportSaveFailure = (cause: unknown) => {
        haptics("error");
        const code = cause instanceof Error ? categoryErrorCode(cause.message) : null;
        setFailure(code ? t(CATEGORY_ERROR_KEYS[code]) : t("categories.error.generic"));
        if (code === "missingName" || code === "duplicateName") {
            nameRef.current?.focus();
        }
    };

    /** Back-to-back adds must not let the first timer clear the second flash. */
    const flashAdded = () => {
        if (toastTimer.current !== null) {
            clearTimeout(toastTimer.current);
        }
        setShowToast(true);
        toastTimer.current = setTimeout(() => setShowToast(false), TOAST_MS);
    };

    // No confirmation: the write is held for the undo window by a toast mounted at the app root, which outlives this
    // sheet. The toast spells out the cascade, so the children are counted first.
    const deleteCategory = async (category: Category) => {
        const children = await db
            .select({ id: categories.id })
            .from(categories)
            .where(and(eq(categories.parentId, category.id), isNull(categories.deletedAt)));
        haptics("warning");
        requestDelete(
            category.id,
            t(children.length > 0 ? "categories.undo.bodyWithChildren" : "categories.undo.body")
        );
        router.back();
    };

    return (
        <View className="bg-m3-surface-container-low flex-1">
            <SheetHeader title={t(categoryTitleKey(mode, isSubcategory, loaded))}>
                {loaded == null ? null : (
                    <SheetHeaderIconButton
                        accessibilityLabel={t("common.delete")}
                        destructive
                        disabled={pickerOpen}
                        icon={Delete02Icon}
                        onPress={() => deleteCategory(loaded)}
                    />
                )}
                <SheetHeaderTextButton
                    disabled={!canSave || pickerOpen}
                    label={t("common.save")}
                    onPress={() => pressSubmit(form)}
                />
            </SheetHeader>

            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 + keyboardHeight }}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
            >
                <View
                    className="items-center"
                    style={{ paddingBottom: HERO_BOTTOM + (symbolEmpty ? CAPTION_CLEARANCE : 0), paddingTop: HERO_TOP }}
                >
                    <IdentityHero
                        color={tint}
                        emoji={draft.emoji}
                        icon={draft.icon}
                        income={income}
                        onPress={openPicker}
                        onReset={() => setDraft(EMPTY_DRAFT)}
                        photoUri={null}
                        variant="category"
                    />
                </View>

                <View className="px-4">
                    <CategoryDetailsFields
                        caption={caption}
                        expenseLabel={t("common.expense")}
                        failure={failure}
                        income={income}
                        incomeLabel={t("common.income")}
                        name={name}
                        nameFieldRef={nameRef}
                        nameLabel={t("categories.field.name")}
                        namePlaceholder={namePlaceholder}
                        onIncomeChange={(next) => form.setFieldValue("income", next)}
                        onNameChange={(next) => {
                            setFailure(null);
                            form.setFieldValue("name", next);
                        }}
                        onSubmitName={() => pressSubmit(form)}
                        typeLabel={t("categories.field.type")}
                        typePickerVisible={typePickerVisible}
                    />
                </View>
            </ScrollView>

            {/* An M3 snackbar: the add landed and the sheet stays up for the next. */}
            {showToast ? (
                <Animated.View
                    accessibilityLiveRegion="polite"
                    className="absolute right-0 left-0 px-4"
                    entering={FadeInDown.springify()}
                    exiting={FadeOutDown}
                    pointerEvents="none"
                    style={{ bottom: insets.bottom + 16 + keyboardHeight }}
                >
                    <View className="bg-m3-inverse-surface min-h-12 flex-row items-center gap-3 rounded px-4 py-3">
                        <HugeiconsIcon color={m3.inverseOnSurface} icon={CheckmarkCircle02Icon} size={18} />
                        <Text className="text-caption flex-1 font-sans" style={{ color: m3.inverseOnSurface }}>
                            {t("categories.toast.added")}
                        </Text>
                    </View>
                </Animated.View>
            ) : null}
        </View>
    );
}
