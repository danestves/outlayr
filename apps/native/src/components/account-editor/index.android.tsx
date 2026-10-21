import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import Delete02Icon from "@hugeicons-pro/core-stroke-rounded/Delete02Icon";
import { isPerson, toAccountKind } from "@outlayr/money/account-kind";
import type { AccountKind } from "@outlayr/money/account-kind";
import { useForm, useSelector } from "@tanstack/react-form";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Keyboard, ScrollView, View } from "react-native";
import type { TextInputInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AmountEntrySheet } from "@/components/amount-entry-sheet";
import { CurrencyPickerSheet } from "@/components/currency-picker-sheet";
import { InlineFailure } from "@/components/form/inline-failure";
import { holdSubmitting, pressSubmit } from "@/components/form/submit-guard";
import { IdentityHero } from "@/components/identity-hero";
import { SheetHeader, SheetHeaderIconButton, SheetHeaderTextButton } from "@/components/sheet-header";
import { useAppSettings } from "@/contexts/display-settings-context";
import { EMPTY_DRAFT, useIdentityDraft, useIdentityFlyUp } from "@/contexts/identity-draft-context";
import { useDatabase } from "@/contexts/local-data-context";
import { openingForBalance, useAccountBalance } from "@/data/accounts";
import { accountsRepo, getAccountById } from "@/data/accounts-core";
import type { Account } from "@/data/accounts-core";
import { useGlobalCurrency } from "@/data/app-meta";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import type { Database } from "@/db/client";
import { formatAmount, minorUnitsFor, roundToMinorUnits } from "@/domain/money";
import { numberToNumpad, numpadToNumber } from "@/domain/numpad";
import { useAccountIdentity } from "@/hooks/use-account-identity";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { useLocaleTag } from "@/hooks/use-locale-tag";
import { useAccountSaveCapped, useCurrencyBlocked } from "@/hooks/use-pro-gate";
import { useRegionCode } from "@/hooks/use-region-code";
import { useLanguage, useTranslation } from "@/i18n/context";
import { posthog } from "@/lib/posthog";
import { useHaptics } from "@/lib/use-haptics";
import { useColors } from "@/theme/use-colors";

import { AccountDetailsFields } from "./details-fields";
import type { AccountEditorProps } from "./index";

type IdentitySource = "initial" | "suggested" | "user";

const HERO_TOP = 8;

export default function AccountEditor(props: AccountEditorProps) {
    const db = useDatabase();
    return <AccountEditorReady db={db} {...props} />;
}

// Mirrors `index.tsx`'s form logic line for line, minus the SwiftUI pieces and the fly-up: keep the two in step.
// The fly-up needs the sheet to grow under the picker, and an Android sheet ignores re-declared detents once up.
function formKind(person: boolean, liability: boolean): AccountKind {
    if (person) {
        return "person";
    }
    return liability ? "liability" : "asset";
}

function sheetTitle(props: AccountEditorProps) {
    if (props.mode === "edit") {
        return "accounts.nav.edit";
    }
    return props.liability === true ? "accounts.nav.newLiability" : "accounts.nav.new";
}

function AccountEditorReady(props: AccountEditorProps & { db: Database }) {
    const { db, mode } = props;
    const editId = props.mode === "edit" ? props.id : null;
    const router = useRouter();
    const currencyBlocked = useCurrencyBlocked(editId);
    const accountCapped = useAccountSaveCapped();
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const haptics = useHaptics();
    const insets = useSafeAreaInsets();
    const keyboardHeight = useKeyboardHeight();
    const globalCurrency = useGlobalCurrency(db);
    const aiEnrichment = useAppSettings().state.bool("aiEnrichment");
    const groundedLookup = useAppSettings().state.bool("groundedLookup");
    const locale = useLocaleTag();
    const regionCode = useRegionCode();
    const { requestDelete } = useDeferredDelete("account");

    const { draft, setDraft } = useIdentityDraft();
    const { pickerOpen, setPickerOpen } = useIdentityFlyUp();

    // Lazy `useState`, not `useMemo`: a re-read would re-fire the draft effects below and clobber a picked logo.
    const [loaded] = useState<Account | null>(() =>
        mode === "edit" && editId != null ? getAccountById(db, editId) : null
    );

    const [failure, setFailure] = useState<string | null>(null);

    // `imageKey` counts on its own: a synced photo can be known before it downloads into `imageUri`, and a lookup
    // started in that gap would save a suggestion over the user's own picture.
    const hasStoredIdentity = Boolean(loaded?.emoji || loaded?.icon || loaded?.imageUri || loaded?.imageKey);
    const nameRef = useRef<TextInputInstance>(null);
    const currencySheetRef = useRef<BottomSheetModal>(null);
    const balanceSheetRef = useRef<BottomSheetModal>(null);

    const startingCurrency = loaded?.currency ?? globalCurrency;
    const [balanceAt] = useState(Date.now);
    const currentBalance = useAccountBalance(
        db,
        {
            currency: startingCurrency,
            id: loaded?.id ?? "",
            initialBalance: loaded?.initialBalance ?? 0,
        },
        balanceAt
    ).total;
    const person = loaded != null && isPerson(loaded);
    const [initialValues] = useState(() => {
        const startingBalance = roundToMinorUnits(currentBalance, startingCurrency);
        const newLiability = props.mode === "create" && props.liability === true;
        return {
            balanceText: numberToNumpad(Math.abs(startingBalance), minorUnitsFor(startingCurrency)),
            currency: startingCurrency,
            liability: toAccountKind(loaded?.kind) === "liability" || newLiability,
            name: loaded?.name ?? "",
            negative: startingBalance < 0 || newLiability,
        };
    });
    const form = useForm({
        defaultValues: initialValues,
        onSubmit: async ({ value }) => {
            setFailure(null);
            // A currency swapped after typing can leave more precision than the new code has: JPY cannot hold "12.34".
            const magnitude = roundToMinorUnits(numpadToNumber(value.balanceText), value.currency);
            const balance = value.negative ? -magnitude : magnitude;
            const balanceChanged =
                value.balanceText !== initialValues.balanceText ||
                value.negative !== initialValues.negative ||
                value.currency !== initialValues.currency;
            const input = {
                currency: value.currency,
                customColor: draft.color ?? null,
                emoji: draft.emoji ?? null,
                icon: draft.icon ?? null,
                imageColor: draft.photoColor ?? null,
                imageUri: draft.photoUri ?? null,
                kind: formKind(person, value.liability),
                name: value.name.trim(),
            };
            if (mode === "edit" && loaded == null) {
                return;
            }
            const capped = accountCapped(input, mode === "create" ? null : loaded);
            // The form opens on the global currency, which is not capped, so an
            // untouched field can still be the second currency in the ledger.
            if (capped || currencyBlocked(input)) {
                router.push("/paywall");
                return;
            }
            const persist = async () => {
                if (mode === "create") {
                    await accountsRepo.create(db, { ...input, initialBalance: balance });
                } else {
                    if (loaded == null) {
                        return;
                    }
                    await accountsRepo.update(db, loaded.id, {
                        ...input,
                        initialBalance: balanceChanged
                            ? await openingForBalance(db, loaded.id, balance, value.currency, new Date(balanceAt))
                            : loaded.initialBalance,
                    });
                }
                posthog?.capture("account_saved", { account_kind: input.kind, mode });
                haptics("success");
                router.back();
                return await holdSubmitting();
            };
            return await persist().catch((error) => {
                console.error("Failed to save the account", error);
                haptics("error");
                setFailure(t("accounts.error.saveFailed"));
            });
        },
    });
    const { name, currency, balanceText, negative, liability } = useSelector(form.store, (s) => s.values);
    const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);

    const [identitySource, setIdentitySource] = useState<IdentitySource>("initial");
    // The logo lookup is debounced and settles long after the render that started it, so its callbacks read here.
    const latest = useRef({ hasIdentity: false, identitySource, pickerOpen });
    useEffect(() => {
        latest.current = {
            hasIdentity: Boolean(draft.emoji || draft.icon || draft.photoUri),
            identitySource,
            pickerOpen,
        };
    });

    // `pickerOpen` lives in the app-level provider, so a path that left it set would disable this sheet's actions.
    useEffect(() => {
        setPickerOpen(false);
    }, [setPickerOpen]);

    // The draft is shared context, so this editor may mount onto another screen's leftovers.
    useEffect(() => {
        if (mode !== "create") {
            return;
        }
        setDraft(EMPTY_DRAFT);
    }, [mode, setDraft]);

    useEffect(() => {
        if (mode !== "edit") {
            return;
        }
        setDraft(
            loaded
                ? {
                      color: loaded.customColor ?? null,
                      emoji: loaded.emoji ?? null,
                      icon: loaded.icon ?? null,
                      photoColor: loaded.imageColor ?? null,
                      photoUri: loaded.imageUri ?? null,
                  }
                : EMPTY_DRAFT
        );
    }, [mode, loaded, setDraft]);

    const identity = useAccountIdentity({
        canAttach: () =>
            latest.current.identitySource !== "user" &&
            !latest.current.pickerOpen &&
            !(latest.current.identitySource === "initial" && latest.current.hasIdentity),
        // A stored identity is a choice already made. An account saved without one is looked up on open and on retype.
        enabled: !person && (mode === "create" || !hasStoredIdentity),
        groundedLookup,
        initialName: initialValues.name,
        locale,
        onClear: () => {
            if (latest.current.identitySource !== "suggested") {
                return;
            }
            setIdentitySource("initial");
            setDraft((previous) => ({
                ...previous,
                photoColor: null,
                photoUri: null,
            }));
        },
        onLogo: (logo) => {
            setIdentitySource("suggested");
            setDraft((previous) => ({
                ...previous,
                photoColor: logo.imageColor,
                photoUri: logo.imageUri,
            }));
        },
        regionCode,
        remoteEnabled: aiEnrichment,
    });

    const onNameChange = (next: string) => {
        form.setFieldValue("name", next);
        identity.onNameChange(next);
    };

    const canSave = name.trim() !== "" && !isSubmitting;
    const tint = draft.photoColor ?? draft.color ?? colors.foreground;

    // While the picker is up, a tap that reaches this sheet past it must not save, delete, or open a second picker.
    const openPicker = () => {
        if (pickerOpen) {
            return;
        }
        Keyboard.dismiss();
        // Opening the picker claims the tile, so a late suggestion cannot overwrite what the user is about to choose.
        setIdentitySource("user");
        setPickerOpen(true);
        router.push("/transactions/identity");
    };

    const openCurrencyPicker = () => {
        Keyboard.dismiss();
        currencySheetRef.current?.present();
    };

    const openBalancePad = () => {
        Keyboard.dismiss();
        balanceSheetRef.current?.present();
    };

    // No confirmation: the write is held for the undo window by a toast mounted at the app root, outliving this sheet.
    const deleteAccount = (account: Account) => {
        requestDelete(account.id, t("accounts.undo.body"));
        haptics("warning");
        router.back();
    };

    return (
        <View className="bg-m3-surface-container-low flex-1">
            <SheetHeader title={t(sheetTitle(props))}>
                {loaded == null ? null : (
                    <SheetHeaderIconButton
                        accessibilityLabel={t("common.delete")}
                        destructive
                        disabled={pickerOpen}
                        icon={Delete02Icon}
                        onPress={() => deleteAccount(loaded)}
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
                {/* A person is an initials tile, never a logo, emoji or photo. */}
                {person ? null : (
                    <View className="items-center pb-6" style={{ paddingTop: HERO_TOP }}>
                        <IdentityHero
                            color={tint}
                            emoji={draft.emoji}
                            icon={draft.icon}
                            income={false}
                            onPress={openPicker}
                            onReset={() => {
                                setIdentitySource("user");
                                setDraft({
                                    color: draft.color,
                                    emoji: null,
                                    icon: null,
                                    photoColor: null,
                                    photoUri: null,
                                });
                            }}
                            photoUri={draft.photoUri}
                            variant="transaction"
                        />
                    </View>
                )}

                <View className="px-4">
                    <InlineFailure message={failure} />
                    <AccountDetailsFields
                        balanceEditA11y={t("accounts.a11y.editBalance")}
                        balanceLabel={t("accounts.field.balance")}
                        balanceSignA11y={t("accounts.a11y.balanceSign")}
                        balanceValue={formatAmount(numpadToNumber(balanceText), currency, true, language)}
                        currencyCode={currency}
                        currencyLabel={t("accounts.field.currency")}
                        kindLabel={t("accounts.field.kind")}
                        liability={liability}
                        name={name}
                        nameFieldRef={nameRef}
                        nameLabel={t("accounts.field.name")}
                        namePlaceholder={t("accounts.namePlaceholder")}
                        negative={negative}
                        onBalancePress={openBalancePad}
                        onCurrencyPress={openCurrencyPicker}
                        onNameChange={onNameChange}
                        onSubmitName={() => pressSubmit(form)}
                        onToggleLiability={
                            person || props.mode === "create"
                                ? undefined
                                : (next) => form.setFieldValue("liability", next)
                        }
                        onToggleSign={() => form.setFieldValue("negative", !negative)}
                    />
                </View>
            </ScrollView>

            <CurrencyPickerSheet
                onSelect={(code) => {
                    currencySheetRef.current?.dismiss();
                    if (currencyBlocked({ currency: code, kind: formKind(person, liability), name })) {
                        router.push("/paywall");
                        return;
                    }
                    form.setFieldValue("currency", code);
                }}
                ref={currencySheetRef}
                selected={currency}
            />

            <AmountEntrySheet
                code={currency}
                minorUnits={minorUnitsFor(currency)}
                onChange={(next) => form.setFieldValue("balanceText", next)}
                onDone={() => balanceSheetRef.current?.dismiss()}
                ref={balanceSheetRef}
                value={balanceText}
            />
        </View>
    );
}
