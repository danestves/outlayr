import { RegistryContext } from "@effect/atom-react/RegistryContext";
import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { isPerson, toAccountKind } from "@outlayr/money/account-kind";
import type { AccountKind } from "@outlayr/money/account-kind";
import { useForm, useSelector } from "@tanstack/react-form";
import { useRouter } from "expo-router";
import { use, useRef, useState } from "react";
import { Keyboard } from "react-native";

import { holdAfterSuccess, pressSubmit } from "@/components/form/submit-guard";
import { useAppSettings } from "@/contexts/display-settings-context";
import {
    useIdentityDraft,
    useIdentityDraftScope,
    useIdentityFlyUp,
    useIdentitySeed,
} from "@/contexts/identity-draft-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useAccountBalance } from "@/data/accounts";
import { getAccountById } from "@/data/accounts-core";
import type { Account } from "@/data/accounts-core";
import { useGlobalCurrency } from "@/data/app-meta";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { formatAmount, minorUnitsFor, roundToMinorUnits } from "@/domain/money";
import { numberToNumpad, numpadToNumber } from "@/domain/numpad";
import { useAccountIdentity } from "@/hooks/use-account-identity";
import { useLocaleTag } from "@/hooks/use-locale-tag";
import { useAccountSaveCapped, useCurrencyBlocked, useOpenPaywall } from "@/hooks/use-pro-gate";
import { useRegionCode } from "@/hooks/use-region-code";
import { useLanguage, useTranslation } from "@/i18n/context";
import { posthog } from "@/lib/posthog";
import { useHaptics } from "@/lib/use-haptics";
import { personDeleteNotice } from "@/screens/debts/debts-wording";
import { saveAccountCommand } from "@/state/accounts-commands";
import { runAtomCommand, SILENT } from "@/state/atom-command";
import { useColors } from "@/theme/use-colors";

import { accountIdentityLookup, accountIdentitySeed, draftHasIdentity, logoMayReplaceIdentity } from "./identity-seed";

export type AccountEditorProps = { mode: "create"; liability?: boolean } | { mode: "edit"; id: string };

export interface AccountFields {
    balanceEditA11y: string;
    balanceLabel: string;
    balanceSignA11y: string;
    /** Already formatted for the active language and currency, without its sign. */
    balanceValue: string;
    currencyCode: string;
    currencyLabel: string;
    kindLabel: string;
    liability: boolean;
    nameLabel: string;
    namePlaceholder: string;
    negative: boolean;
    onBalancePress: () => void;
    onCurrencyPress: () => void;
    onNameChange: (name: string) => void;
    onSubmitName: () => void;
    /** Omitted for a person, which hides the row. */
    onToggleLiability?: (next: boolean) => void;
    onToggleSign: () => void;
}

type IdentitySource = "initial" | "suggested" | "user";

function formKind(person: boolean, liability: boolean): AccountKind {
    if (person) {
        return "person";
    }
    return liability ? "liability" : "asset";
}

export function useAccountForm(props: AccountEditorProps) {
    const { mode } = props;
    const db = useDatabase();
    const registry = use(RegistryContext);
    const editId = props.mode === "edit" ? props.id : null;
    const router = useRouter();
    const openPaywall = useOpenPaywall();
    const currencyBlocked = useCurrencyBlocked(editId);
    const accountCapped = useAccountSaveCapped();
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const haptics = useHaptics();
    const globalCurrency = useGlobalCurrency(db);
    const settings = useAppSettings().state;
    const locale = useLocaleTag();
    const regionCode = useRegionCode();
    const { requestDelete } = useDeferredDelete("account");

    useIdentityDraftScope();
    const { draft, setDraft } = useIdentityDraft();
    const { pickerOpen, setPickerOpen, floatProgress } = useIdentityFlyUp();

    // Lazy `useState`, not `useMemo`: a re-read would re-fire the draft effects below and clobber a picked logo.
    const [loaded] = useState<Account | null>(() =>
        mode === "edit" && editId != null ? getAccountById(db, editId) : null
    );

    const [failure, setFailure] = useState<string | null>(null);

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
        onSubmit: ({ value }) => {
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
            // The form opens on the global currency, which is not capped, so an untouched field can still be the
            // second currency in the ledger.
            if (capped !== null || currencyBlocked(input)) {
                openPaywall(capped ?? "currencies");
                return;
            }
            return holdAfterSuccess(
                runAtomCommand(
                    registry,
                    saveAccountCommand,
                    {
                        balance,
                        db,
                        draft: input,
                        onFailure: (error) => {
                            console.error("Failed to save the account", error);
                            haptics("error");
                            setFailure(t("accounts.error.saveFailed"));
                        },
                        onSaved: () => {
                            posthog?.capture("account_saved", { account_kind: input.kind, mode });
                            haptics("success");
                            router.back();
                        },
                        target:
                            loaded == null
                                ? { mode: "create" }
                                : {
                                      id: loaded.id,
                                      initialBalance: loaded.initialBalance,
                                      mode: "edit",
                                      reopenAt: balanceChanged ? new Date(balanceAt) : null,
                                  },
                    },
                    SILENT
                )
            );
        },
    });
    const { name, currency, balanceText, negative, liability } = useSelector(form.store, (s) => s.values);
    const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);

    const [identitySource, setIdentitySource] = useState<IdentitySource>("initial");
    const hasIdentity = draftHasIdentity(draft);

    const [seed] = useState(() => accountIdentitySeed(mode, loaded));
    useIdentitySeed(seed);

    const identity = useAccountIdentity({
        ...accountIdentityLookup(mode, loaded, settings.bool),
        canAttach: () => logoMayReplaceIdentity(identitySource, pickerOpen, hasIdentity),
        initialName: initialValues.name,
        locale,
        onClear: () => {
            if (identitySource !== "suggested") {
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
    });

    const submit = () => pressSubmit(form);

    const openPicker = () => {
        Keyboard.dismiss();
        // Opening the picker claims the tile, so a late suggestion cannot overwrite what the user is about to choose.
        setIdentitySource("user");
        setPickerOpen(true);
        router.push("/transactions/identity");
    };

    const fields: AccountFields = {
        balanceEditA11y: t("accounts.a11y.editBalance"),
        balanceLabel: t("accounts.field.balance"),
        balanceSignA11y: t("accounts.a11y.balanceSign"),
        balanceValue: formatAmount(numpadToNumber(balanceText), currency, true, language),
        currencyCode: currency,
        currencyLabel: t("accounts.field.currency"),
        kindLabel: t("accounts.field.kind"),
        liability,
        nameLabel: t("accounts.field.name"),
        namePlaceholder: t("accounts.namePlaceholder"),
        negative,
        onBalancePress: () => {
            Keyboard.dismiss();
            balanceSheetRef.current?.present();
        },
        onCurrencyPress: () => {
            Keyboard.dismiss();
            currencySheetRef.current?.present();
        },
        onNameChange: (next) => {
            form.setFieldValue("name", next);
            identity.onNameChange(next);
        },
        onSubmitName: submit,
        onToggleLiability: loaded == null || person ? undefined : (next) => form.setFieldValue("liability", next),
        onToggleSign: () => form.setFieldValue("negative", !negative),
    };

    // No confirmation: the write is held for the undo window by a toast mounted at the app root, outliving this sheet.
    const deleteAccount =
        loaded == null
            ? null
            : () => {
                  requestDelete(
                      loaded.id,
                      person ? personDeleteNotice(t, loaded.name) : { body: t("accounts.undo.body") }
                  );
                  haptics("warning");
                  router.back();
              };

    return {
        balanceSheet: {
            code: currency,
            minorUnits: minorUnitsFor(currency),
            onChange: (next: string) => form.setFieldValue("balanceText", next),
            onDone: () => balanceSheetRef.current?.dismiss(),
            ref: balanceSheetRef,
            value: balanceText,
        },
        canSave: name.trim() !== "" && !isSubmitting,
        currencySheet: {
            onSelect: (code: string) => {
                currencySheetRef.current?.dismiss();
                if (currencyBlocked({ currency: code, kind: formKind(person, liability), name })) {
                    openPaywall("currencies");
                    return;
                }
                form.setFieldValue("currency", code);
            },
            ref: currencySheetRef,
            selected: currency,
        },
        deleteAccount,
        draft,
        failure,
        fields,
        floatProgress,
        isSubmitting,
        name,
        openPicker,
        person,
        pickerOpen,
        resetIdentity: () => {
            setIdentitySource("user");
            setDraft({
                color: draft.color,
                emoji: null,
                icon: null,
                photoColor: null,
                photoUri: null,
            });
        },
        submit,
        tint: draft.photoColor ?? draft.color ?? colors.foreground,
    };
}
