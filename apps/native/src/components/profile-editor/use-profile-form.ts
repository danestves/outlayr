import { RegistryContext } from "@effect/atom-react/RegistryContext";
import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import * as Cause from "effect/Cause";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useRouter } from "expo-router";
import { use, useRef, useState } from "react";
import { Alert, Keyboard } from "react-native";

import {
    EMPTY_DRAFT,
    useIdentityDraft,
    useIdentityDraftScope,
    useIdentityFlyUp,
    useIdentitySeed,
} from "@/contexts/identity-draft-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useProfiles } from "@/data/profiles";
import { useTranslation } from "@/i18n/context";
import { activeProfileId } from "@/lib/active-profile";
import { posthog } from "@/lib/posthog";
import { useHaptics } from "@/lib/use-haptics";
import { runAtomCommand, SILENT } from "@/state/atom-command";
import { createProfileCommand, deleteProfileCommand, saveProfileCommand } from "@/state/profiles-commands";
import { useColors } from "@/theme/use-colors";

export type ProfileEditorMode = "create" | "edit";

export function useProfileForm(mode: ProfileEditorMode) {
    const db = useDatabase();
    const registry = use(RegistryContext);
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const haptics = useHaptics();
    const globalCurrency = useGlobalCurrency(db);
    const profiles = useProfiles();

    useIdentityDraftScope();
    const { draft, setDraft } = useIdentityDraft();
    const { pickerOpen, setPickerOpen, floatProgress } = useIdentityFlyUp();

    const [loaded] = useState(() =>
        mode === "edit" ? (profiles.find((profile) => profile.id === activeProfileId()) ?? null) : null
    );
    const [seed] = useState(() =>
        loaded === null
            ? EMPTY_DRAFT
            : {
                  color: loaded.customColor,
                  emoji: loaded.emoji,
                  icon: loaded.icon,
                  photoColor: loaded.imageColor,
                  photoUri: loaded.imageUri,
              }
    );
    useIdentitySeed(seed);

    const [name, setName] = useState(loaded?.name ?? "");
    const [currency, setCurrency] = useState(globalCurrency);
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);
    const currencySheetRef = useRef<BottomSheetModal>(null);

    const canSave = name.trim() !== "" && !busy;

    const fail = (cause: Cause.Cause<unknown>) => {
        console.error("Failed to save the profile", Cause.pretty(cause));
        haptics("error");
        setFailure(t("profiles.error.saveFailed"));
    };

    const submit = async () => {
        if (!canSave || (mode === "edit" && loaded === null)) {
            return;
        }
        setFailure(null);
        setBusy(true);
        const identity = {
            customColor: draft.color,
            emoji: draft.emoji,
            icon: draft.icon,
            imageColor: draft.photoColor,
            imageUri: draft.photoUri,
        };
        const input = { identity, name: name.trim() };
        const result =
            loaded === null
                ? await runAtomCommand(registry, createProfileCommand, { ...input, currency, from: db }, SILENT)
                : await runAtomCommand(registry, saveProfileCommand, { ...input, id: loaded.id }, SILENT);
        setBusy(false);
        if (AsyncResult.isFailure(result)) {
            fail(result.cause);
            return;
        }
        posthog?.capture("profile_saved", { mode });
        haptics("success");
        router.back();
    };

    const deleteProfile =
        loaded === null
            ? null
            : () => {
                  Alert.alert(t("profiles.delete.title"), t("profiles.delete.body"), [
                      { style: "cancel", text: t("common.cancel") },
                      {
                          onPress: () => {
                              haptics("warning");
                              void runAtomCommand(registry, deleteProfileCommand, loaded.id, SILENT).then((result) => {
                                  if (AsyncResult.isFailure(result)) {
                                      fail(result.cause);
                                  }
                              });
                          },
                          style: "destructive",
                          text: t("common.delete"),
                      },
                  ]);
              };

    const openPicker = () => {
        Keyboard.dismiss();
        setPickerOpen(true);
        router.push("/transactions/identity");
    };

    return {
        busy,
        canSave,
        currencySheet: {
            onSelect: (code: string) => {
                currencySheetRef.current?.dismiss();
                setCurrency(code);
            },
            ref: currencySheetRef,
            selected: currency,
        },
        deleteProfile,
        draft,
        failure,
        fields: {
            currencyCode: currency,
            currencyLabel: t("profiles.field.currency"),
            nameLabel: t("profiles.field.name"),
            namePlaceholder: t("profiles.namePlaceholder"),
            onCurrencyPress:
                mode === "create"
                    ? () => {
                          Keyboard.dismiss();
                          currencySheetRef.current?.present();
                      }
                    : undefined,
            onNameChange: setName,
            onSubmitName: () => {
                void submit();
            },
        },
        floatProgress,
        name,
        openPicker,
        pickerOpen,
        resetIdentity: () => setDraft({ ...EMPTY_DRAFT, color: draft.color }),
        submit: () => {
            void submit();
        },
        tint: draft.photoColor ?? draft.color ?? colors.foreground,
    };
}

export type ProfileFields = ReturnType<typeof useProfileForm>["fields"];
