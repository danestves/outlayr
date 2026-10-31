import { useAtomMount } from "@effect/atom-react/Hooks";
import Delete02Icon from "@hugeicons-pro/core-stroke-rounded/Delete02Icon";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CurrencyPickerSheet } from "@/components/currency-picker-sheet";
import { InlineFailure } from "@/components/form/inline-failure";
import { IdentityHero } from "@/components/identity-hero";
import { OutlinedSelectField, OutlinedTextField } from "@/components/material/outlined-field";
import { SheetHeader, SheetHeaderIconButton, SheetHeaderTextButton } from "@/components/sheet-header";
import { Text } from "@/components/text";
import { identityPickerResetAtom } from "@/contexts/identity-draft-context";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { useTranslation } from "@/i18n/context";
import { useMaterialColors } from "@/theme/use-material-colors";

import { useProfileForm } from "./use-profile-form";
import type { ProfileEditorMode } from "./use-profile-form";

const HERO_TOP = 8;

export default function ProfileEditor({ mode }: { mode: ProfileEditorMode }) {
    const t = useTranslation();
    const m3 = useMaterialColors();
    const insets = useSafeAreaInsets();
    const keyboardHeight = useKeyboardHeight();
    const {
        canSave,
        currencySheet,
        deleteProfile,
        draft,
        failure,
        fields,
        name,
        openPicker,
        pickerOpen,
        resetIdentity,
        submit,
        tint,
    } = useProfileForm(mode);

    useAtomMount(identityPickerResetAtom);

    return (
        <View className="bg-m3-surface-container-low flex-1">
            <SheetHeader title={t(mode === "create" ? "profiles.new" : "profiles.edit")}>
                {deleteProfile == null ? null : (
                    <SheetHeaderIconButton
                        accessibilityLabel={t("common.delete")}
                        destructive
                        disabled={pickerOpen}
                        icon={Delete02Icon}
                        onPress={deleteProfile}
                    />
                )}
                <SheetHeaderTextButton
                    disabled={!canSave || pickerOpen}
                    label={t(mode === "create" ? "profiles.create" : "common.save")}
                    onPress={submit}
                />
            </SheetHeader>

            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 + keyboardHeight }}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
            >
                <View className="items-center pb-6" style={{ paddingTop: HERO_TOP }}>
                    <IdentityHero
                        color={tint}
                        emoji={draft.emoji}
                        icon={draft.icon}
                        income={false}
                        onPress={() => {
                            if (!pickerOpen) {
                                openPicker();
                            }
                        }}
                        onReset={resetIdentity}
                        photoUri={draft.photoUri}
                        variant="transaction"
                    />
                </View>

                <View className="gap-4 px-4">
                    <InlineFailure message={failure} />
                    <OutlinedTextField
                        autoCapitalize="words"
                        label={fields.nameLabel}
                        onChangeText={fields.onNameChange}
                        onSubmitEditing={fields.onSubmitName}
                        placeholder={fields.namePlaceholder}
                        returnKeyType="done"
                        value={name}
                    />
                    {fields.onCurrencyPress ? (
                        <OutlinedSelectField
                            accessibilityValue={fields.currencyCode}
                            label={fields.currencyLabel}
                            onPress={fields.onCurrencyPress}
                            value={
                                <Text className="text-body font-sans" style={{ color: m3.onSurface }}>
                                    {fields.currencyCode}
                                </Text>
                            }
                        />
                    ) : null}
                </View>
            </ScrollView>

            <CurrencyPickerSheet {...currencySheet} />
        </View>
    );
}
