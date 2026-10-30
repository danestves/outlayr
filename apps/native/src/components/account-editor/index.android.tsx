import { useAtomMount } from "@effect/atom-react/Hooks";
import Delete02Icon from "@hugeicons-pro/core-stroke-rounded/Delete02Icon";
import { useRef } from "react";
import { ScrollView, View } from "react-native";
import type { TextInputInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AmountEntrySheet } from "@/components/amount-entry-sheet";
import { CurrencyPickerSheet } from "@/components/currency-picker-sheet";
import { InlineFailure } from "@/components/form/inline-failure";
import { IdentityHero } from "@/components/identity-hero";
import { SheetHeader, SheetHeaderIconButton, SheetHeaderTextButton } from "@/components/sheet-header";
import { identityPickerResetAtom } from "@/contexts/identity-draft-context";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { useTranslation } from "@/i18n/context";

import { AccountDetailsFields } from "./details-fields";
import { useAccountForm } from "./use-account-form";
import type { AccountEditorProps } from "./use-account-form";

const HERO_TOP = 8;

function sheetTitle(props: AccountEditorProps) {
    if (props.mode === "edit") {
        return "accounts.nav.edit";
    }
    return props.liability === true ? "accounts.nav.newLiability" : "accounts.nav.new";
}

// No fly-up: it needs the sheet to grow under the picker, and an Android sheet ignores re-declared detents once up.
export default function AccountEditor(props: AccountEditorProps) {
    const t = useTranslation();
    const insets = useSafeAreaInsets();
    const keyboardHeight = useKeyboardHeight();
    const {
        balanceSheet,
        canSave,
        currencySheet,
        deleteAccount,
        draft,
        failure,
        fields,
        name,
        openPicker,
        person,
        pickerOpen,
        resetIdentity,
        submit,
        tint,
    } = useAccountForm(props);
    const nameRef = useRef<TextInputInstance>(null);

    useAtomMount(identityPickerResetAtom);

    // While the picker is up, a tap that reaches this sheet past it must not save, delete, or open a second picker.
    const pressHero = () => {
        if (!pickerOpen) {
            openPicker();
        }
    };

    return (
        <View className="bg-m3-surface-container-low flex-1">
            <SheetHeader title={t(sheetTitle(props))}>
                {deleteAccount == null ? null : (
                    <SheetHeaderIconButton
                        accessibilityLabel={t("common.delete")}
                        destructive
                        disabled={pickerOpen}
                        icon={Delete02Icon}
                        onPress={deleteAccount}
                    />
                )}
                <SheetHeaderTextButton disabled={!canSave || pickerOpen} label={t("common.save")} onPress={submit} />
            </SheetHeader>

            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 + keyboardHeight }}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
            >
                {/* A person is an initials tile, never a logo, emoji or photo. */}
                {person ? null : (
                    <View className="items-center pb-6" style={{ paddingTop: HERO_TOP }}>
                        <IdentityHero
                            color={tint}
                            emoji={draft.emoji}
                            icon={draft.icon}
                            income={false}
                            onPress={pressHero}
                            onReset={resetIdentity}
                            photoUri={draft.photoUri}
                            variant="transaction"
                        />
                    </View>
                )}

                <View className="px-4">
                    <InlineFailure message={failure} />
                    <AccountDetailsFields {...fields} name={name} nameFieldRef={nameRef} />
                </View>
            </ScrollView>

            <CurrencyPickerSheet {...currencySheet} />

            <AmountEntrySheet {...balanceSheet} />
        </View>
    );
}
