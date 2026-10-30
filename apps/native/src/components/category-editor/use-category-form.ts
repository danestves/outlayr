import { RegistryContext } from "@effect/atom-react/RegistryContext";
import { useForm, useSelector } from "@tanstack/react-form";
import { useRouter } from "expo-router";
import { use, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Keyboard } from "react-native";

import { holdAfterSuccess, pressSubmit } from "@/components/form/submit-guard";
import {
    EMPTY_DRAFT,
    useIdentityDraft,
    useIdentityDraftScope,
    useIdentityFlyUp,
    useIdentitySeed,
} from "@/contexts/identity-draft-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useCategoriesByNamespace } from "@/data/categories";
import { CATEGORY_PALETTE, getCategoryById, isCategoryValidationError } from "@/data/categories-core";
import type { Category } from "@/data/categories-core";
import { firstAvailableColor } from "@/domain/category-color";
import { CATEGORY_ERROR_KEYS } from "@/domain/category-error";
import { useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import { posthog } from "@/lib/posthog";
import { useHaptics } from "@/lib/use-haptics";
import { runAtomCommand, SILENT } from "@/state/atom-command";
import { saveCategoryCommand } from "@/state/categories-commands";
import { useColors } from "@/theme/use-colors";

import {
    categoryColorFollowsSiblings,
    categoryCreatesIncome,
    categoryIdentitySeed,
    categoryIsSaveable,
} from "./identity-seed";

const MAX_EXPENSE_CATEGORIES = 24;
const TOAST_MS = 2000;

export type CategoryEditorProps =
    | { mode: "create"; income?: boolean; parentId?: string | null }
    | { mode: "edit"; id: string };

export interface CategoryFields {
    caption: string | null;
    expenseLabel: string;
    failure: string | null;
    income: boolean;
    incomeLabel: string;
    nameLabel: string;
    namePlaceholder: string;
    onIncomeChange: (income: boolean) => void;
    onNameChange: (name: string) => void;
    onSubmitName: () => void;
    typeLabel: string;
    typePickerVisible: boolean;
}

interface NameField {
    clear?: () => void;
    ref: RefObject<{ focus: () => void } | null>;
}

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
    const addLabelKey = isSubcategory ? "categories.addSubcategory" : "categories.addCategory";
    const saveLabelKey = isSubcategory ? "categories.saveSubcategory" : "categories.saveCategory";
    return {
        caption: create ? createCaption : null,
        ctaLabel: t(create ? addLabelKey : saveLabelKey),
        namePlaceholder: t(isSubcategory ? "categories.namePlaceholder.subcategory" : namespacePlaceholderKey),
    };
}

export function useCategoryForm(props: CategoryEditorProps, nameField: NameField) {
    // The parent spreads a fresh `props` every render, so effects key off these primitives, never `props`.
    const { mode } = props;
    const parentId = props.mode === "create" ? (props.parentId ?? null) : null;
    const editId = props.mode === "edit" ? props.id : null;
    const initialIncome = props.mode === "create" ? !!props.income : false;
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const haptics = useHaptics();
    const registry = use(RegistryContext);

    useIdentityDraftScope();
    const { draft, setDraft } = useIdentityDraft();
    const { pickerOpen, setPickerOpen, floatProgress } = useIdentityFlyUp();

    // Lazy `useState`, not `useMemo`: a re-read would re-fire the draft seed below and clobber the user's picks.
    const [loaded] = useState<Category | null>(() =>
        mode === "edit" && editId != null ? getCategoryById(db, editId) : null
    );
    const [parent] = useState<Category | null>(() =>
        mode === "create" && parentId != null ? getCategoryById(db, parentId) : null
    );

    const [failure, setFailure] = useState<string | null>(null);

    const [initialValues] = useState(() => ({
        income: parent?.income ?? initialIncome,
        name: loaded?.name ?? "",
    }));
    const form = useForm({
        defaultValues: initialValues,
        onSubmit: ({ value }) => {
            setFailure(null);
            if (mode === "create") {
                return addCategory(value);
            }
            if (loaded == null) {
                return;
            }
            return holdAfterSuccess(
                runAtomCommand(
                    registry,
                    saveCategoryCommand,
                    {
                        db,
                        onFailure: reportSaveFailure,
                        onSaved: () => {
                            posthog?.capture("category_saved", {
                                category_type: loaded.income ? "income" : "expense",
                                is_subcategory: isSubcategory,
                                mode: "edit",
                            });
                            haptics("success");
                            router.back();
                        },
                        write: {
                            id: loaded.id,
                            mode: "edit",
                            patch: {
                                color: loaded.income ? undefined : (draft.color ?? CATEGORY_PALETTE[0]),
                                emoji: draft.emoji ?? null,
                                icon: draft.icon ?? null,
                                name: value.name,
                            },
                        },
                    },
                    SILENT
                )
            );
        },
    });
    const { name, income: formIncome } = useSelector(form.store, (s) => s.values);
    const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);

    const [colorTouched, setColorTouched] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const expenseTree = useCategoriesByNamespace(db, false);

    const allExpense = expenseTree.flatMap((node) => [node, ...node.children]);
    const expenseCount = allExpense.length;
    const usedColors = new Set<string>();
    for (const category of allExpense) {
        if (category.id === editId) {
            continue;
        }
        if (category.color) {
            usedColors.add(category.color);
        }
    }

    const [seed] = useState(() => categoryIdentitySeed(mode, loaded, parent));
    useIdentitySeed(seed);

    const isSubcategory = mode === "create" ? parentId != null : (loaded?.parentId ?? null) != null;
    const atExpenseLimit = expenseCount >= MAX_EXPENSE_CATEGORIES;
    const [openedAtLimit] = useState(atExpenseLimit);
    const forcedIncome = categoryCreatesIncome(mode, parentId, openedAtLimit);
    const income = mode === "create" ? formIncome || forcedIncome : (loaded?.income ?? false);

    const seenExpenseCount = useRef(expenseCount);
    // oxlint-disable-next-line outlayr/react-effect-budget -- closes the sheet when the live expense count, which a sync can move, crosses the cap
    useEffect(() => {
        const changed = expenseCount !== seenExpenseCount.current;
        seenExpenseCount.current = expenseCount;
        if (changed && mode === "create" && parentId == null && !income && expenseCount >= MAX_EXPENSE_CATEGORIES) {
            router.back();
        }
    }, [expenseCount, mode, parentId, income, router]);

    const nextColor = firstAvailableColor(usedColors);
    const autoColor = categoryColorFollowsSiblings(mode, parentId, colorTouched);
    const color = autoColor ? nextColor : draft.color;

    const symbolEmpty = !(draft.icon || draft.emoji);

    const { caption, ctaLabel, namePlaceholder } = categoryEditorCopy(t, {
        create: mode === "create",
        income,
        isSubcategory,
        parent,
    });

    const openPicker = () => {
        Keyboard.dismiss();
        // Freezes the auto-color so a color picked in the picker survives.
        setColorTouched(true);
        if (autoColor) {
            setDraft({ ...EMPTY_DRAFT, color: nextColor });
        }
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

    const addCategory = (value: { name: string }) => {
        const pickedColor = color ?? CATEGORY_PALETTE[0];
        const expenseColor = isSubcategory ? (parent?.color ?? pickedColor) : pickedColor;
        return holdAfterSuccess(
            runAtomCommand(
                registry,
                saveCategoryCommand,
                {
                    db,
                    onFailure: reportSaveFailure,
                    onSaved: () => {
                        posthog?.capture("category_saved", {
                            category_type: income ? "income" : "expense",
                            is_subcategory: isSubcategory,
                            mode: "create",
                        });
                        haptics("success");
                        if (isSubcategory) {
                            router.back();
                            return;
                        }
                        nameField.clear?.();
                        form.setFieldValue("name", "");
                        // Cleared, not advanced: with `colorTouched` released, the auto color is the first free slot
                        // after this insert lands, where a value chosen now would come from the pre-insert set.
                        setColorTouched(false);
                        setDraft(EMPTY_DRAFT);
                        flashAdded();
                    },
                    write: {
                        category: {
                            color: income ? colors.income : expenseColor,
                            emoji: draft.emoji ?? null,
                            icon: draft.icon ?? undefined,
                            income,
                            name: value.name,
                            parentId,
                        },
                        mode: "create",
                    },
                },
                SILENT
            ),
            isSubcategory
        );
    };

    const reportSaveFailure = (cause: unknown) => {
        haptics("error");
        const code = isCategoryValidationError(cause) ? cause.code : null;
        setFailure(code ? t(CATEGORY_ERROR_KEYS[code]) : t("categories.error.generic"));
        if (code === "missingName" || code === "duplicateName") {
            nameField.ref.current?.focus();
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

    const submit = () => pressSubmit(form);

    const fields: CategoryFields = {
        caption,
        expenseLabel: t("common.expense"),
        failure,
        income,
        incomeLabel: t("common.income"),
        nameLabel: t("categories.field.name"),
        namePlaceholder,
        onIncomeChange: (next) => form.setFieldValue("income", next),
        onNameChange: (next) => {
            setFailure(null);
            form.setFieldValue("name", next);
        },
        onSubmitName: submit,
        typeLabel: t("categories.field.type"),
        typePickerVisible: mode === "create" && !isSubcategory && !atExpenseLimit,
    };

    return {
        canSave: categoryIsSaveable(mode, name, symbolEmpty, loaded) && !isSubmitting,
        ctaLabel,
        draft,
        fields,
        floatProgress,
        income,
        isSubcategory,
        isSubmitting,
        loaded,
        name,
        openPicker,
        pickerOpen,
        resetIdentity: () => setDraft(EMPTY_DRAFT),
        showToast,
        submit,
        symbolEmpty,
        tint: income ? colors.income : (color ?? CATEGORY_PALETTE[0]),
    };
}
