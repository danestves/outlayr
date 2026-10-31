import { useAtomMount } from "@effect/atom-react/Hooks";
import CheckmarkCircle02Icon from "@hugeicons-pro/core-solid-rounded/CheckmarkCircle02Icon";
import Delete02Icon from "@hugeicons-pro/core-stroke-rounded/Delete02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { ScrollView, View } from "react-native";
import type { TextInputInstance } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IdentityHero } from "@/components/identity-hero";
import { SheetHeader, SheetHeaderIconButton, SheetHeaderTextButton } from "@/components/sheet-header";
import { Text } from "@/components/text";
import { identityPickerResetAtom } from "@/contexts/identity-draft-context";
import { useDatabase } from "@/contexts/local-data-context";
import type { Category } from "@/data/categories-core";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import type { TranslatableKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";
import { countCategoryChildrenCommand } from "@/state/categories-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { useMaterialColors } from "@/theme/use-material-colors";

import { CategoryDetailsFields } from "./details-fields";
import { useCategoryForm } from "./use-category-form";
import type { CategoryEditorProps } from "./use-category-form";

const HERO_TOP = 8;
const HERO_BOTTOM = 24;
const CAPTION_CLEARANCE = 24;

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

export default function CategoryEditor(props: CategoryEditorProps) {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const m3 = useMaterialColors();
    const haptics = useHaptics();
    const insets = useSafeAreaInsets();
    const keyboardHeight = useKeyboardHeight();
    const { requestDelete } = useDeferredDelete("category");
    const nameRef = useRef<TextInputInstance>(null);
    const {
        canSave,
        draft,
        fields,
        income,
        isSubcategory,
        loaded,
        name,
        openPicker,
        pickerOpen,
        resetIdentity,
        showToast,
        submit,
        symbolEmpty,
        tint,
    } = useCategoryForm(props, { ref: nameRef });

    useAtomMount(identityPickerResetAtom);

    // While the picker is up, a tap that reaches this sheet past it must not save, delete, or open a second picker.
    const pressHero = () => {
        if (!pickerOpen) {
            openPicker();
        }
    };

    // No confirmation: the write is held for the undo window by a toast mounted at the app root, which outlives this
    // sheet. The toast spells out the cascade, so the children are counted first.
    const countChildren = useAtomAction(countCategoryChildrenCommand, {
        onSuccess: ({ children, id: deleted }) => {
            haptics("warning");
            requestDelete(deleted, {
                body: t(children > 0 ? "categories.undo.bodyWithChildren" : "categories.undo.body"),
            });
            router.back();
        },
    });
    const deleteCategory = (category: Category) => countChildren({ db, id: category.id });

    return (
        <View className="bg-m3-surface-container-low flex-1">
            <SheetHeader title={t(categoryTitleKey(props.mode, isSubcategory, loaded))}>
                {loaded == null ? null : (
                    <SheetHeaderIconButton
                        accessibilityLabel={t("common.delete")}
                        destructive
                        disabled={pickerOpen}
                        icon={Delete02Icon}
                        onPress={() => deleteCategory(loaded)}
                    />
                )}
                <SheetHeaderTextButton disabled={!canSave || pickerOpen} label={t("common.save")} onPress={submit} />
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
                        onPress={pressHero}
                        onReset={resetIdentity}
                        photoUri={null}
                        variant="category"
                    />
                </View>

                <View className="px-4">
                    <CategoryDetailsFields {...fields} name={name} nameFieldRef={nameRef} />
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
