import { Host } from "@expo/ui";
import { ScrollView, useNativeState, VStack } from "@expo/ui/swift-ui";
import type { TextFieldRef } from "@expo/ui/swift-ui";
import { animation, blur, opacity, overlay, padding, scrollDismissesKeyboard } from "@expo/ui/swift-ui/modifiers";
import { useForm, useSelector } from "@tanstack/react-form";
import { useNavigation, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown, useDerivedValue, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EditorCta } from "@/components/editor-cta";
import { EditorHeroBand } from "@/components/editor-hero-band";
import {
    CAPTION_CLEARANCE,
    CTA_BOTTOM_PADDING,
    CTA_HEIGHT,
    FLY_BACK,
    FLY_UP,
    FORM_BLUR_RADIUS,
    FORM_TOP_MARGIN,
    HEADER_HEIGHT,
    HERO_BOTTOM_PADDING,
    HERO_TOP_PADDING,
} from "@/components/editor-style";
import { holdSubmitting, pressSubmit } from "@/components/form/submit-guard";
import { IdentityCurtain } from "@/components/identity-curtain";
import { HERO_RING, IdentityFlyUpLayer } from "@/components/identity-fly-up";
import { Text } from "@/components/text";
import { EMPTY_DRAFT, useIdentityDraft, useIdentityFlyUp } from "@/contexts/identity-draft-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useCategoriesByNamespace } from "@/data/categories";
import { CATEGORY_PALETTE, categoriesRepo, getCategoryById } from "@/data/categories-core";
import type { Category } from "@/data/categories-core";
import { firstAvailableColor } from "@/domain/category-color";
import { CATEGORY_ERROR_KEYS, categoryErrorCode } from "@/domain/category-error";
import { useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import { posthog } from "@/lib/posthog";
import { CATEGORY_DETENT, LARGE_ONLY, SUBCATEGORY_DETENT } from "@/lib/sheet-detents";
import { useHaptics } from "@/lib/use-haptics";
import { glowFromEmoji } from "@/theme/glow";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { CategoryEditorDetailsSection } from "./details-section";

const MAX_EXPENSE_CATEGORIES = 24;

export type CategoryEditorProps =
    | { mode: "create"; income?: boolean; parentId?: string | null }
    | { mode: "edit"; id: string };

interface CategoryEditorSubject {
    create: boolean;
    income: boolean;
    isSubcategory: boolean;
    parent: Category | null;
}

interface CategoryEditorCopy {
    caption: string | null;
    ctaLabel: string;
    namePlaceholder: string;
}

function categoryEditorCopy(
    t: TranslateFn,
    { create, income, isSubcategory, parent }: CategoryEditorSubject
): CategoryEditorCopy {
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

function CategoryEditorReady(props: CategoryEditorProps & { db: import("@/db/client").Database }) {
    // The parent spreads a fresh `props` every render, so effects key off these primitives, never `props`.
    const { db, mode } = props;
    const parentId = props.mode === "create" ? (props.parentId ?? null) : null;
    const editId = props.mode === "edit" ? props.id : null;
    const initialIncome = props.mode === "create" ? !!props.income : false;
    const router = useRouter();
    const navigation = useNavigation();
    const t = useTranslation();
    const colors = useColors();
    const haptics = useHaptics();
    const insets = useSafeAreaInsets();
    const [ctaHeight, setCtaHeight] = useState(CTA_HEIGHT);

    const { draft, setDraft } = useIdentityDraft();
    const { pickerOpen, setPickerOpen, floatProgress } = useIdentityFlyUp();

    // Lazy `useState`, not `useMemo`: a re-read would re-fire the draft effects below and clobber the user's picks.
    const [loaded] = useState<Category | null>(() =>
        mode === "edit" && editId != null ? getCategoryById(db, editId) : null
    );
    const [parent] = useState<Category | null>(() =>
        mode === "create" && parentId != null ? getCategoryById(db, parentId) : null
    );

    const nameState = useNativeState(loaded?.name ?? "");
    const nameRef = useRef<TextFieldRef>(null);
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
    // A shared value: only the fly-up reads it, from the UI thread, so measuring costs the form no render.
    const containerHeight = useSharedValue(0);
    const heroRestTop = useDerivedValue(() => HEADER_HEIGHT + HERO_TOP_PADDING);
    // Measured, not derived: it turns on the caption's rendered line height, and the caption comes and goes.
    const [heroBand, setHeroBand] = useState(HEADER_HEIGHT + HERO_TOP_PADDING + HERO_RING + HERO_BOTTOM_PADDING);

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

    // Grows to `.large` before the picker: over the medium detent it would cover the hero the fly-up lands on.
    // Also where a subcategory opens shorter, since only the editor resolves the parent.
    useEffect(() => {
        navigation.setOptions({
            sheetAllowedDetents: pickerOpen ? LARGE_ONLY : [isSubcategory ? SUBCATEGORY_DETENT : CATEGORY_DETENT, 1],
        });
    }, [navigation, pickerOpen, isSubcategory]);

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
    const captionClearance = symbolEmpty ? CAPTION_CLEARANCE : 0;
    const tint = income ? colors.income : (draft.color ?? CATEGORY_PALETTE[0]);
    const symbolHues = draft.emoji ? [...glowFromEmoji(draft.emoji).slice(0, 2), tint] : [tint];
    const curtainHues = symbolEmpty ? null : symbolHues;
    const typePickerVisible = mode === "create" && !isSubcategory && !atExpenseLimit;

    const canSave = categoryIsSaveable(mode, name, symbolEmpty, loaded) && !isSubmitting;

    const { caption, ctaLabel, namePlaceholder } = categoryEditorCopy(t, {
        create: mode === "create",
        income,
        isSubcategory,
        parent,
    });

    // Not a shared wrapper stack: a `Form` one level deeper is proposed no height and collapses with every row.
    const underPicker = [
        opacity(pickerOpen ? 0 : 1),
        blur(pickerOpen ? FORM_BLUR_RADIUS : 0),
        animation(pickerOpen ? FLY_UP : FLY_BACK, pickerOpen),
    ];

    const openPicker = () => {
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
        nameState.set("");
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
        toastTimer.current = setTimeout(() => setShowToast(false), 2000);
    };

    return (
        <View
            onLayout={(e) => {
                containerHeight.set(e.nativeEvent.layout.height);
            }}
            style={{
                backgroundColor: colors.groupedBackground,
                flex: 1,
            }}
        >
            {/* First, so it paints under the form, whose own background is hidden. */}
            <IdentityCurtain hues={curtainHues} />

            {/* The `Form` must be its host's only child or it collapses, so the hero and CTA are RN views over this
                padding, set here because under `useViewportSizeMeasurement` the host ignores its own. */}
            <View
                style={{
                    flex: 1,
                    paddingBottom: ctaHeight + CTA_BOTTOM_PADDING + insets.bottom,
                    paddingTop: heroBand,
                }}
            >
                <Host style={{ flex: 1 }}>
                    <ScrollView
                        modifiers={[
                            // The CTA sits under the keyboard, so a drag has to be able to put it away.
                            scrollDismissesKeyboard("immediately"),
                            ...underPicker,
                        ]}
                    >
                        <VStack modifiers={[padding({ horizontal: 20, top: FORM_TOP_MARGIN })]} spacing={0}>
                            <CategoryEditorDetailsSection
                                caption={caption}
                                dangerColor={colors.danger}
                                expenseLabel={t("common.expense")}
                                failure={failure}
                                hairline={[overlay({ color: withAlpha(colors.foreground, 0.08) })]}
                                income={income}
                                incomeLabel={t("common.income")}
                                mutedColor={colors.muted}
                                nameFieldRef={nameRef}
                                nameLabel={t("categories.field.name")}
                                namePlaceholder={namePlaceholder}
                                nameState={nameState}
                                onIncomeChange={(next) => form.setFieldValue("income", next)}
                                onNameChange={(next) => {
                                    setFailure(null);
                                    form.setFieldValue("name", next);
                                }}
                                onSubmitName={() => pressSubmit(form)}
                                tintColor={colors.foreground}
                                typeLabel={t("categories.field.type")}
                                typePickerVisible={typePickerVisible}
                            />
                        </VStack>
                    </ScrollView>
                </Host>
            </View>

            {/* After the `Host`, so the header's scroll-edge lookup finds the form first. */}
            <EditorHeroBand
                captionClearance={captionClearance}
                color={tint}
                emoji={draft.emoji}
                floatProgress={floatProgress}
                icon={draft.icon}
                income={income}
                onLayout={(e) => setHeroBand(e.nativeEvent.layout.height)}
                onPress={openPicker}
                onReset={() => setDraft(EMPTY_DRAFT)}
                photoUri={null}
                variant="category"
            />

            {/* SwiftUI's blur and opacity cannot reach this RN view, so it hides on the wrapper. */}
            <View
                className="bottom-safe-offset-2 absolute right-0 left-0 px-5"
                pointerEvents={pickerOpen ? "none" : "box-none"}
                style={{ opacity: pickerOpen ? 0 : 1 }}
            >
                <View onLayout={(event) => setCtaHeight(event.nativeEvent.layout.height)}>
                    <EditorCta
                        busy={isSubmitting}
                        canSave={canSave}
                        label={ctaLabel}
                        onPress={() => pressSubmit(form)}
                    />
                </View>
            </View>

            {showToast ? (
                <Animated.View
                    className="bottom-safe-offset-5 absolute right-0 left-0 items-center"
                    entering={FadeInDown.springify()}
                    exiting={FadeOutDown}
                    pointerEvents="none"
                >
                    <View
                        className="flex-row items-center gap-2 rounded-full"
                        style={{
                            backgroundColor: colors.surface,
                            borderColor: withAlpha(colors.foreground, 0.12),
                            borderWidth: 1,
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                        }}
                    >
                        <SymbolView
                            name="checkmark.circle.fill"
                            size={15}
                            tintColor={colors.income}
                            type="monochrome"
                        />
                        <Text className="font-sans-semibold text-caption text-income">
                            {t("categories.toast.added")}
                        </Text>
                    </View>
                </Animated.View>
            ) : null}

            <IdentityFlyUpLayer
                color={tint}
                containerHeight={containerHeight}
                emoji={draft.emoji}
                icon={draft.icon}
                income={income}
                onDismiss={router.back}
                photoUri={null}
                restTop={heroRestTop}
                variant="category"
            />
        </View>
    );
}
