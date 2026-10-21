import { Host } from "@expo/ui";
import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { ScrollView, useNativeState, VStack } from "@expo/ui/swift-ui";
import type { TextFieldRef } from "@expo/ui/swift-ui";
import { animation, blur, opacity, overlay, padding, scrollDismissesKeyboard } from "@expo/ui/swift-ui/modifiers";
import { isPerson, toAccountKind } from "@outlayr/money/account-kind";
import type { AccountKind } from "@outlayr/money/account-kind";
import { useForm, useSelector } from "@tanstack/react-form";
import { Stack, useNavigation, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Keyboard, View } from "react-native";
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AmountEntrySheet } from "@/components/amount-entry-sheet";
import { CurrencyPickerSheet } from "@/components/currency-picker-sheet";
import { EditorCta } from "@/components/editor-cta";
import { EditorHeroBand } from "@/components/editor-hero-band";
import {
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
import { InlineFailure } from "@/components/form/inline-failure";
import { holdSubmitting, pressSubmit } from "@/components/form/submit-guard";
import { IdentityCurtain } from "@/components/identity-curtain";
import { HERO_RING, IdentityFlyUpLayer } from "@/components/identity-fly-up";
import { toolbarIcon } from "@/components/toolbar-icons";
import { useAppSettings } from "@/contexts/display-settings-context";
import { EMPTY_DRAFT, useIdentityDraft, useIdentityFlyUp } from "@/contexts/identity-draft-context";
import { useDatabase } from "@/contexts/local-data-context";
import { openingForBalance, useAccountBalance } from "@/data/accounts";
import { accountsRepo, getAccountById } from "@/data/accounts-core";
import type { Account } from "@/data/accounts-core";
import { useGlobalCurrency } from "@/data/app-meta";
import { remoteEnrichmentOn } from "@/data/settings-core";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { formatAmount, minorUnitsFor, roundToMinorUnits } from "@/domain/money";
import { numberToNumpad, numpadToNumber } from "@/domain/numpad";
import { useAccountIdentity } from "@/hooks/use-account-identity";
import { useLocaleTag } from "@/hooks/use-locale-tag";
import { useAccountSaveCapped, useCurrencyBlocked } from "@/hooks/use-pro-gate";
import { useRegionCode } from "@/hooks/use-region-code";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import { posthog } from "@/lib/posthog";
import { ACCOUNT_DETENT, LARGE_ONLY } from "@/lib/sheet-detents";
import { useHaptics } from "@/lib/use-haptics";
import { glowFromEmoji } from "@/theme/glow";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { AccountEditorDetailsSection } from "./details-section";

export type AccountEditorProps = { mode: "create"; liability?: boolean } | { mode: "edit"; id: string };

type IdentitySource = "initial" | "suggested" | "user";

export default function AccountEditor(props: AccountEditorProps) {
    const db = useDatabase();
    return <AccountEditorReady db={db} {...props} />;
}

function curtainHuesFor(photoUri: string | null, emoji: string | null, tint: string): string[] {
    if (photoUri) {
        return [tint];
    }
    if (emoji) {
        return [...glowFromEmoji(emoji).slice(0, 2), tint];
    }
    return [tint];
}

function formKind(person: boolean, liability: boolean): AccountKind {
    if (person) {
        return "person";
    }
    return liability ? "liability" : "asset";
}

function kindToggle(loaded: Account | null, toggle: (next: boolean) => void) {
    return loaded == null || isPerson(loaded) ? undefined : toggle;
}

function AccountEditorReady(props: AccountEditorProps & { db: import("@/db/client").Database }) {
    const { db, mode } = props;
    const editId = props.mode === "edit" ? props.id : null;
    const router = useRouter();
    const currencyBlocked = useCurrencyBlocked(editId);
    const accountCapped = useAccountSaveCapped();
    const navigation = useNavigation();
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const haptics = useHaptics();
    const insets = useSafeAreaInsets();
    const [ctaHeight, setCtaHeight] = useState(CTA_HEIGHT);
    const globalCurrency = useGlobalCurrency(db);
    const remoteEnrichment = remoteEnrichmentOn(useAppSettings().state.bool);
    const groundedLookup = useAppSettings().state.bool("groundedLookup");
    const locale = useLocaleTag();
    const regionCode = useRegionCode();

    const { draft, setDraft } = useIdentityDraft();
    const { pickerOpen, setPickerOpen, floatProgress } = useIdentityFlyUp();

    // Lazy `useState`, not `useMemo`: a re-read would re-fire the draft effects below and clobber a picked logo.
    const [loaded] = useState<Account | null>(() =>
        mode === "edit" && editId != null ? getAccountById(db, editId) : null
    );

    const [failure, setFailure] = useState<string | null>(null);

    // `imageKey` counts on its own: a synced photo can be known before it downloads into `imageUri`, and a lookup
    // started in that gap would save a suggestion over the user's own picture.
    const hasStoredIdentity = Boolean(loaded?.emoji || loaded?.icon || loaded?.imageUri || loaded?.imageKey);
    const nameState = useNativeState(loaded?.name ?? "");
    const nameRef = useRef<TextFieldRef>(null);
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
            // The form opens on the global currency, which is not capped, so an untouched field can still be the
            // second currency in the ledger.
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

    const containerHeight = useSharedValue(0);
    const heroRestTop = useDerivedValue(() => HEADER_HEIGHT + HERO_TOP_PADDING);
    const [heroBand, setHeroBand] = useState(() =>
        person ? HEADER_HEIGHT : HEADER_HEIGHT + HERO_TOP_PADDING + HERO_RING + HERO_BOTTOM_PADDING
    );

    const [identitySource, setIdentitySource] = useState<IdentitySource>("initial");
    // The logo lookup settles long after the render that started it, so its callbacks read here. Mirrored in an
    // effect: a write during render is a side effect the compiler cannot follow.
    const latest = useRef({ hasIdentity: false, identitySource, pickerOpen });
    useEffect(() => {
        latest.current = {
            hasIdentity: Boolean(draft.emoji || draft.icon || draft.photoUri),
            identitySource,
            pickerOpen,
        };
    });

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

    useEffect(() => {
        navigation.setOptions({
            sheetAllowedDetents: pickerOpen ? LARGE_ONLY : [ACCOUNT_DETENT, 1],
        });
    }, [navigation, pickerOpen]);

    // The balance field's decimal pad has no return key, and the CTA is pinned to the bottom: unreachable without this.
    const keyboardLift = useSharedValue(0);
    useEffect(() => {
        const show = Keyboard.addListener("keyboardWillShow", (event) => {
            keyboardLift.set(
                withTiming(Math.max(0, event.endCoordinates.height - insets.bottom), {
                    duration: event.duration,
                })
            );
        });
        const hide = Keyboard.addListener("keyboardWillHide", (event) => {
            keyboardLift.set(withTiming(0, { duration: event.duration }));
        });
        return () => {
            show.remove();
            hide.remove();
        };
    }, [insets.bottom, keyboardLift]);
    const ctaStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: -keyboardLift.get() }],
    }));

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
        remoteEnabled: remoteEnrichment,
    });

    const onNameChange = (next: string) => {
        form.setFieldValue("name", next);
        identity.onNameChange(next);
    };

    const canSave = name.trim() !== "" && !isSubmitting;

    const tint = draft.photoColor ?? draft.color ?? colors.foreground;
    const symbolEmpty = !(draft.icon || draft.emoji || draft.photoUri);
    const curtainHues = symbolEmpty ? null : curtainHuesFor(draft.photoUri, draft.emoji, tint);

    const underPicker = [
        opacity(pickerOpen ? 0 : 1),
        blur(pickerOpen ? FORM_BLUR_RADIUS : 0),
        animation(pickerOpen ? FLY_UP : FLY_BACK, pickerOpen),
    ];

    const openPicker = () => {
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

    // The scroller must be the Host's only child, so the hero, CTA and curtain are RN views around it.
    return (
        <View
            onLayout={(e) => {
                containerHeight.set(e.nativeEvent.layout.height);
            }}
            style={{ backgroundColor: colors.groupedBackground, flex: 1 }}
        >
            {loaded == null ? null : (
                <AccountDeleteToolbar
                    account={loaded}
                    onDeleted={() => {
                        haptics("warning");
                        router.back();
                    }}
                    t={t}
                    tintColor={colors.danger}
                />
            )}

            <IdentityCurtain hues={curtainHues} />

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
                            // The decimal pad has no return key: a drag must dismiss it without collapsing the sheet.
                            scrollDismissesKeyboard("immediately"),
                            ...underPicker,
                        ]}
                    >
                        <VStack modifiers={[padding({ horizontal: 20, top: FORM_TOP_MARGIN })]} spacing={0}>
                            <AccountEditorDetailsSection
                                balanceEditA11y={t("accounts.a11y.editBalance")}
                                balanceLabel={t("accounts.field.balance")}
                                balanceSignA11y={t("accounts.a11y.balanceSign")}
                                balanceValue={formatAmount(numpadToNumber(balanceText), currency, true, language)}
                                currencyCode={currency}
                                currencyLabel={t("accounts.field.currency")}
                                hairline={[overlay({ color: withAlpha(colors.foreground, 0.08) })]}
                                kindLabel={t("accounts.field.kind")}
                                liability={liability}
                                mutedColor={colors.muted}
                                nameFieldRef={nameRef}
                                nameLabel={t("accounts.field.name")}
                                namePlaceholder={t("accounts.namePlaceholder")}
                                nameState={nameState}
                                negative={negative}
                                onBalancePress={openBalancePad}
                                onCurrencyPress={openCurrencyPicker}
                                onNameChange={onNameChange}
                                onSubmitName={() => pressSubmit(form)}
                                onToggleLiability={kindToggle(loaded, (next) => form.setFieldValue("liability", next))}
                                onToggleSign={() => form.setFieldValue("negative", !negative)}
                                tintColor={colors.foreground}
                            />
                        </VStack>
                    </ScrollView>
                </Host>
            </View>

            {/* A person is an initials tile, never a logo, emoji or photo. */}
            {person ? null : (
                <EditorHeroBand
                    captionClearance={0}
                    income={false}
                    color={tint}
                    emoji={draft.emoji}
                    floatProgress={floatProgress}
                    icon={draft.icon}
                    onLayout={(e) => setHeroBand(e.nativeEvent.layout.height)}
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
            )}

            {/* SwiftUI's blur and opacity cannot reach this RN view, so it hides on the wrapper. */}
            <Animated.View
                className="bottom-safe-offset-2 absolute right-0 left-0 px-5"
                pointerEvents={pickerOpen ? "none" : "box-none"}
                style={[ctaStyle, { opacity: pickerOpen ? 0 : 1 }]}
            >
                <InlineFailure message={failure} />

                <View onLayout={(event) => setCtaHeight(event.nativeEvent.layout.height)}>
                    <EditorCta
                        busy={isSubmitting}
                        canSave={canSave}
                        label={t(mode === "create" ? "accounts.addAccount" : "accounts.saveAccount")}
                        onPress={() => pressSubmit(form)}
                    />
                </View>
            </Animated.View>

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

            <IdentityFlyUpLayer
                color={tint}
                containerHeight={containerHeight}
                emoji={draft.emoji}
                icon={draft.icon}
                income={false}
                onDismiss={router.back}
                photoUri={draft.photoUri}
                restTop={heroRestTop}
                variant="transaction"
            />
        </View>
    );
}

// No confirmation: the write is held for the undo window by a toast mounted at the app root, outliving this sheet.
interface AccountDeleteToolbarProps {
    account: Account;
    onDeleted: () => void;
    t: TranslateFn;
    tintColor: string;
}

function AccountDeleteToolbar({ account, onDeleted, t, tintColor }: AccountDeleteToolbarProps) {
    const { requestDelete } = useDeferredDelete("account");

    return (
        <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
                accessibilityLabel={t("common.delete")}
                onPress={() => {
                    requestDelete(account.id, t("accounts.undo.body"));
                    onDeleted();
                }}
                tintColor={tintColor}
            >
                <Stack.Toolbar.Icon {...toolbarIcon("delete")} />
            </Stack.Toolbar.Button>
        </Stack.Toolbar>
    );
}
