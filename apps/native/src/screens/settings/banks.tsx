import { BottomSheetModal, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as Cause from "effect/Cause";
import { Redirect, useRouter } from "expo-router";
import { Button } from "panelui-native/components/button";
import { useRef, useState } from "react";
import type { RefObject } from "react";
import { Alert, Platform, Pressable, View } from "react-native";

import { BusyText } from "@/components/busy-text";
import { InlineFailure } from "@/components/form/inline-failure";
import { SettingsSection } from "@/components/list/list-row";
import { MaterialListItem } from "@/components/list/material-list-item";
import { RowShell } from "@/components/list/row-shell";
import { MaterialFab } from "@/components/material-fab";
import { MonoLabel } from "@/components/mono-label";
import { SegmentedRow } from "@/components/settings/segmented-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { SheetGestureRoot } from "@/components/sheet-gesture-root";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useNow } from "@/data/use-now";
import { useSyncStatus } from "@/data/use-sync-status";
import { formatSentenceDate, formatTime } from "@/domain/dates";
import { accountTitle, BANK_LINK_ROUTE, banksScreen, byInstitution, defaultCountry } from "@/domain/linked-banks";
import type { BankGate, LinkedBankAccount } from "@/domain/linked-banks";
import { useBankOverview } from "@/hooks/use-bank-overview";
import { useLongWait } from "@/hooks/use-long-wait";
import { useOpenPaywall } from "@/hooks/use-pro-gate";
import { useRegionCode } from "@/hooks/use-region-code";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import type { TranslationKey } from "@/i18n/catalog";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import type { Language } from "@/i18n/languages";
import { activeProfileId } from "@/lib/active-profile";
import { openInAppBrowser } from "@/lib/app-handoff";
import { useAuthSession } from "@/lib/auth-session";
import { legalUrl } from "@/lib/legal-url";
import { notifyFailure } from "@/lib/notify";
import { STRIPE_READY } from "@/lib/stripe-link";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { unlinkBankCommand } from "@/state/banking-commands";
import { switchProfileCommand } from "@/state/profiles-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";
import { useMaterialColors } from "@/theme/use-material-colors";

import { BankFilesIntoRow, BankMark, kindLabel, useBankLink } from "./bank-parts";

const NO_ACCOUNTS: readonly LinkedBankAccount[] = [];
const NO_COUNTRIES: readonly string[] = [];
const FIT_CONTENT = { alignSelf: "stretch" } as const;
const ROW_MARK = 20;

type BankLink = ReturnType<typeof useBankLink>;

const GATE_COPY: Record<
    BankGate,
    { action: TranslationKey; body: TranslationKey; eyebrow: TranslationKey; title: TranslationKey }
> = {
    free: {
        action: "settings.banks.gate.free.action",
        body: "settings.banks.gate.free.body",
        eyebrow: "settings.banks.gate.free.eyebrow",
        title: "nav.settings.banks",
    },
    personal: {
        action: "settings.banks.gate.personal.action",
        body: "settings.banks.gate.personal.body",
        eyebrow: "settings.banks.gate.personal.eyebrow",
        title: "settings.banks.gate.personal.title",
    },
    sync: {
        action: "settings.banks.gate.sync.action",
        body: "settings.banks.gate.sync.body",
        eyebrow: "settings.banks.gate.sync.eyebrow",
        title: "settings.banks.gate.sync.title",
    },
};

export function LinkedBanks() {
    return <BanksRoute mode="list" />;
}

export function LinkBank() {
    return <BanksRoute mode="link" />;
}

function BanksRoute({ mode }: { mode: "link" | "list" }) {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const { accountId } = useAuthSession();
    const syncOn = useSyncStatus(db).enabled;
    const overview = useBankOverview();
    const ready = overview.kind === "ready" ? overview.overview : null;
    const bankLink = useBankLink(ready?.accounts ?? NO_ACCOUNTS, mode === "link" ? () => router.back() : undefined);
    const screen = banksScreen({
        mode,
        overview,
        personal: activeProfileId() === undefined,
        signedIn: accountId !== null,
        stripeReady: STRIPE_READY,
        syncOn,
    });

    if (screen.kind === "hidden") {
        return <Redirect href="/settings/integrations" />;
    }

    const body = (() => {
        switch (screen.kind) {
            case "loading": {
                return <SettingsScreen>{null}</SettingsScreen>;
            }
            case "failed": {
                return (
                    <SettingsScreen>
                        <View className="pt-4">
                            <InlineFailure message={t("settings.banks.failed")} />
                        </View>
                    </SettingsScreen>
                );
            }
            case "gate": {
                return <BankGateView gate={screen.gate} />;
            }
            case "entry": {
                return (
                    <BankEntry
                        bankLink={bankLink}
                        countries={screen.countries}
                        linked={(ready?.accounts.length ?? 0) > 0}
                    />
                );
            }
            default: {
                return (
                    <BanksList
                        accounts={screen.accounts}
                        bankLink={bankLink}
                        countries={ready?.countries ?? NO_COUNTRIES}
                    />
                );
            }
        }
    })();

    return (
        <>
            {body}
            {bankLink.sheets}
        </>
    );
}

function Intro({ body, eyebrow, title }: { body: string; eyebrow?: string; title: string }) {
    return (
        <View className="gap-2 pt-6">
            {eyebrow ? <MonoLabel>{eyebrow}</MonoLabel> : null}
            <Text accessibilityRole="header" className="text-foreground font-sans-semibold text-title">
                {title}
            </Text>
            <Text className="text-muted text-subtitle leading-snug">{body}</Text>
        </View>
    );
}

function BankGateView({ gate }: { gate: BankGate }) {
    const t = useTranslation();
    const router = useRouter();
    const db = useDatabase();
    const { accountId } = useAuthSession();
    const openPaywall = useOpenPaywall();
    const [switching, setSwitching] = useState(false);
    const switchProfile = useAtomAction(switchProfileCommand, {
        onFailure: (cause) => {
            setSwitching(false);
            console.warn("[outlayr] profile switch failed", Cause.pretty(cause));
            notifyFailure({ title: t("profiles.error.switchFailed") });
        },
    });
    const copy = GATE_COPY[gate];

    const act = () => {
        if (gate === "sync") {
            router.push("/settings/sync");
        } else if (gate === "personal") {
            setSwitching(true);
            switchProfile({ accountId, from: db, profileId: undefined });
        } else {
            openPaywall("banks");
        }
    };

    return (
        <SettingsScreen>
            <Intro body={t(copy.body)} eyebrow={t(copy.eyebrow)} title={t(copy.title)} />
            <View className="pt-6">
                <Button
                    className="rounded-full"
                    disabled={switching}
                    fullWidth
                    onPress={act}
                    size="lg"
                    variant="primary"
                >
                    {t(copy.action)}
                </Button>
            </View>
        </SettingsScreen>
    );
}

function countryName(t: TranslateFn, country: string): string {
    return country === "US" || country === "CA" ? t(`settings.banks.country.${country}`) : country;
}

function linkLabel(t: TranslateFn, country: string | null): string {
    return country === "US" || country === "CA"
        ? t(`settings.banks.entry.link.${country}`)
        : t("settings.banks.linkTitle");
}

function BankEntry({
    bankLink,
    countries,
    linked,
}: {
    bankLink: BankLink;
    countries: readonly string[];
    linked: boolean;
}) {
    const t = useTranslation();
    const colors = useColors();
    const { language } = useLanguage();
    const region = useRegionCode();
    const [picked, setPicked] = useState<string | null>(null);
    const country = picked !== null && countries.includes(picked) ? picked : defaultCountry(countries, region);
    const slow = useLongWait(bankLink.busy);
    const consent = {
        footer: t("settings.banks.consent"),
        footerLink: {
            label: t("settings.banks.consent.privacy"),
            onPress: () => {
                openInAppBrowser(legalUrl("privacy", language)).catch(() => undefined);
            },
        },
    };

    return (
        <SettingsScreen>
            <Intro
                body={t("settings.banks.entry.body")}
                title={linked ? t("settings.banks.linkAnother") : t("settings.banks.entry.title")}
            />
            <SettingsSection {...consent}>
                {countries.length > 1 ? (
                    <SegmentedRow
                        icon="Landmark"
                        onChange={(index) => setPicked(countries[index] ?? null)}
                        options={countries.map((code, index) => ({ label: countryName(t, code), value: index }))}
                        title={t("settings.banks.entry.country")}
                        value={Math.max(0, countries.indexOf(country ?? ""))}
                    />
                ) : null}
            </SettingsSection>
            <View className="pt-6">
                <Button
                    className="rounded-full"
                    disabled={bankLink.busy || country === null}
                    fullWidth
                    onPress={() => {
                        if (country !== null) {
                            bankLink.link(country);
                        }
                    }}
                    size="lg"
                    variant="primary"
                >
                    {slow ? (
                        <BusyText className="text-[18px] font-medium" color={colors.primaryForeground}>
                            {t("settings.banks.entry.busy")}
                        </BusyText>
                    ) : (
                        linkLabel(t, country)
                    )}
                </Button>
            </View>
        </SettingsScreen>
    );
}

function pulledWhen(at: number, nowMs: number, use24Hour: boolean, language: Language): string {
    const date = new Date(at);
    return date.toDateString() === new Date(nowMs).toDateString()
        ? formatTime(date, use24Hour, language)
        : formatSentenceDate(date, language);
}

function statusLine(t: TranslateFn, account: LinkedBankAccount, language: Language): string | null {
    if (account.status === "disconnected") {
        return t("settings.banks.ended");
    }
    if (account.status !== "relink") {
        return null;
    }
    return account.pulledAt === null
        ? t("settings.banks.expired")
        : `${t("settings.banks.expired")} · ${t("settings.banks.pausedSince", {
              date: formatSentenceDate(new Date(account.pulledAt), language),
          })}`;
}

function BanksList({
    accounts,
    bankLink,
    countries,
}: {
    accounts: readonly LinkedBankAccount[];
    bankLink: BankLink;
    countries: readonly string[];
}) {
    const t = useTranslation();
    const router = useRouter();
    const colors = useColors();
    const { language } = useLanguage();
    const region = useRegionCode();
    const sheetRef = useRef<BottomSheetModal>(null);
    const [openId, setOpenId] = useState<LinkedBankAccount["id"] | null>(null);
    const [relinking, setRelinking] = useState<LinkedBankAccount["id"] | null>(null);
    const groups = byInstitution(accounts);
    const open = accounts.find((account) => account.id === openId) ?? null;
    const country = defaultCountry(countries, region);
    const android = Platform.OS === "android";

    const signIn = (account: LinkedBankAccount) => {
        if (country === null) {
            return;
        }
        setRelinking(account.id);
        bankLink.link(country);
    };

    return (
        <>
            <SettingsScreen>
                {groups.map((group, index) => (
                    <SettingsSection
                        accessory={
                            <Text className="text-muted text-subtitle">
                                {t("settings.banks.linkedOn", {
                                    date: formatSentenceDate(new Date(group.linkedAt), language),
                                })}
                            </Text>
                        }
                        footer={index === groups.length - 1 ? t("settings.banks.footer") : undefined}
                        key={group.institution}
                        title={group.institution}
                    >
                        {group.accounts.map((account) => (
                            <BankAccountRow
                                account={account}
                                busy={bankLink.busy && relinking === account.id}
                                key={account.id}
                                onOpen={() => {
                                    setOpenId(account.id);
                                    sheetRef.current?.present();
                                }}
                                onSignIn={() => signIn(account)}
                            />
                        ))}
                    </SettingsSection>
                ))}
                {android ? null : (
                    <SettingsSection>
                        <Pressable
                            accessibilityRole="button"
                            className="active:opacity-60"
                            onPress={() => router.push(BANK_LINK_ROUTE)}
                        >
                            <RowShell
                                leading={
                                    <HugeiconsIcon
                                        color={colors.tint}
                                        icon={PlusSignIcon}
                                        size={20}
                                        strokeWidth={1.9}
                                    />
                                }
                                title={t("settings.banks.linkAnother")}
                            />
                        </Pressable>
                    </SettingsSection>
                )}
            </SettingsScreen>
            {android ? (
                <MaterialFab label={t("settings.banks.linkTitle")} onPress={() => router.push(BANK_LINK_ROUTE)} />
            ) : null}
            <BankAccountSheet
                account={open}
                busy={bankLink.busy}
                onDismiss={() => setOpenId(null)}
                onSignIn={(account) => {
                    sheetRef.current?.dismiss();
                    signIn(account);
                }}
                ref={sheetRef}
            />
        </>
    );
}

function useRowDetail(account: LinkedBankAccount) {
    const t = useTranslation();
    const nowMs = useNow();
    const { language } = useLanguage();
    const { use24Hour } = useDisplaySettings().state;
    const status = statusLine(t, account, language);
    if (status !== null) {
        return { attention: account.status === "relink", detail: status };
    }
    const pulled =
        account.pulledAt === null
            ? t("settings.banks.notPulled")
            : t("settings.banks.pulledAt", { when: pulledWhen(account.pulledAt, nowMs, use24Hour, language) });
    return { attention: false, detail: `${kindLabel(t, account.kind)} · ${pulled}` };
}

function BankAccountRow({
    account,
    busy,
    onOpen,
    onSignIn,
}: {
    account: LinkedBankAccount;
    busy: boolean;
    onOpen: () => void;
    onSignIn: () => void;
}) {
    const t = useTranslation();
    const colors = useColors();
    const m3 = useMaterialColors();
    const { attention, detail } = useRowDetail(account);
    const relink = account.status === "relink";
    const signInLabel = busy ? (
        <BusyText className="text-body" color={Platform.OS === "android" ? m3.onSecondaryContainer : colors.danger}>
            {t("settings.banks.entry.busy")}
        </BusyText>
    ) : (
        <Text
            className={
                Platform.OS === "android"
                    ? "text-m3-on-secondary-container text-caption font-sans-semibold"
                    : "text-danger text-body"
            }
        >
            {Platform.OS === "android" ? t("settings.banks.signIn") : t("settings.banks.signInAgain")}
        </Text>
    );
    const signIn = relink ? (
        <Pressable
            accessibilityRole="button"
            className={
                Platform.OS === "android"
                    ? "bg-m3-secondary-container rounded-full px-4 py-2 active:opacity-60"
                    : "active:opacity-60"
            }
            disabled={busy}
            hitSlop={8}
            onPress={onSignIn}
        >
            {signInLabel}
        </Pressable>
    ) : null;
    const off =
        account.status === "disconnected" ? <Text className="text-muted text-body">{t("common.off")}</Text> : null;

    if (Platform.OS === "android") {
        return (
            <MaterialListItem
                accessibilityRole="button"
                leading={<BankMark institution={account.institution} size={24} />}
                onPress={onOpen}
                supporting={[detail]}
                title={accountTitle(account)}
                trailing={signIn ?? off}
            />
        );
    }

    return (
        <Pressable accessibilityRole="button" className="active:opacity-60" onPress={onOpen}>
            <RowShell
                attention={attention}
                detail={detail}
                leading={<BankMark institution={account.institution} size={ROW_MARK} />}
                title={accountTitle(account)}
            >
                {signIn ?? off}
            </RowShell>
        </Pressable>
    );
}

function FactRow({ label, value }: { label: string; value: string }) {
    return (
        <RowShell title={label}>
            <Text className="text-muted text-body">{value}</Text>
        </RowShell>
    );
}

function BankAccountSheet({
    ref,
    account,
    busy,
    onDismiss,
    onSignIn,
}: {
    ref: RefObject<BottomSheetModal | null>;
    account: LinkedBankAccount | null;
    busy: boolean;
    onDismiss: () => void;
    onSignIn: (account: LinkedBankAccount) => void;
}) {
    const t = useTranslation();
    const colors = useColors();
    const db = useDatabase();
    const haptics = useHaptics();
    const sheetSurface = useSheetSurface();
    const { language } = useLanguage();
    const { use24Hour } = useDisplaySettings().state;
    const nowMs = useNow();
    const [unlinking, setUnlinking] = useState(false);
    const slow = useLongWait(unlinking);
    const unlink = useAtomAction(
        unlinkBankCommand,
        {
            onFailure: (cause) => {
                console.warn("[outlayr] bank unlink failed", Cause.pretty(cause));
                haptics("error");
                notifyFailure({
                    title: t("settings.banks.unlink.failed", { account: account ? accountTitle(account) : "" }),
                });
            },
            onSettled: () => setUnlinking(false),
            onSuccess: () => {
                haptics("success");
                ref.current?.dismiss();
            },
        },
        SILENT
    );

    const confirmUnlink = (target: LinkedBankAccount) => {
        const title = accountTitle(target);
        Alert.alert(
            t("settings.banks.unlink.confirmTitle", { account: title }),
            t("settings.banks.unlink.confirmBody"),
            [
                { style: "cancel", text: t("common.cancel") },
                {
                    onPress: () => {
                        setUnlinking(true);
                        unlink({ id: target.id });
                    },
                    style: "destructive",
                    text: t("settings.banks.unlink.action"),
                },
            ]
        );
    };

    const status = account === null ? null : statusLine(t, account, language);

    return (
        <BottomSheetModal
            backgroundStyle={{ backgroundColor: sheetSurface }}
            enableDynamicSizing
            enablePanDownToClose={!unlinking}
            onDismiss={onDismiss}
            ref={ref}
        >
            <BottomSheetView style={{ paddingBottom: 24 }}>
                <SheetGestureRoot style={FIT_CONTENT}>
                    {account === null ? null : (
                        <View className="gap-3 px-5 pt-2">
                            <View className="flex-row justify-end">
                                <Pressable
                                    accessibilityLabel={t("common.close")}
                                    accessibilityRole="button"
                                    className="active:opacity-60"
                                    hitSlop={12}
                                    onPress={() => ref.current?.dismiss()}
                                >
                                    <HugeiconsIcon color={colors.muted} icon={Cancel01Icon} size={22} />
                                </Pressable>
                            </View>
                            <View className="items-center gap-2">
                                <BankMark institution={account.institution} size={40} />
                                <Text
                                    accessibilityRole="header"
                                    className="text-foreground font-sans-semibold text-title text-center"
                                >
                                    {accountTitle(account)}
                                </Text>
                                {status === null ? null : (
                                    <Text
                                        className={`text-subtitle text-center ${account.status === "relink" ? "text-danger" : "text-muted"}`}
                                    >
                                        {status}
                                    </Text>
                                )}
                            </View>
                            {account.status === "relink" ? (
                                <Button
                                    className="rounded-full"
                                    disabled={busy}
                                    fullWidth
                                    onPress={() => onSignIn(account)}
                                    size="lg"
                                    variant="primary"
                                >
                                    {t("settings.banks.signInAgain")}
                                </Button>
                            ) : null}
                            <View className="border-border border-t">
                                <FactRow label={t("settings.banks.detail.bank")} value={account.institution} />
                                <FactRow label={t("settings.banks.detail.kind")} value={kindLabel(t, account.kind)} />
                                <BankFilesIntoRow account={account} db={db} />
                                <FactRow
                                    label={t("settings.banks.detail.linked")}
                                    value={formatSentenceDate(new Date(account.linkedAt), language)}
                                />
                                <FactRow
                                    label={t("settings.banks.detail.lastPulled")}
                                    value={
                                        account.pulledAt === null
                                            ? t("common.never")
                                            : pulledWhen(account.pulledAt, nowMs, use24Hour, language)
                                    }
                                />
                            </View>
                            <Button
                                className="rounded-full"
                                disabled={unlinking}
                                fullWidth
                                onPress={() => confirmUnlink(account)}
                                size="lg"
                                variant="ghost"
                            >
                                {slow ? (
                                    <BusyText className="text-body font-sans-semibold" color={colors.danger}>
                                        {t("settings.banks.unlink.busy")}
                                    </BusyText>
                                ) : (
                                    <Text className="text-danger text-body font-sans-semibold">
                                        {t("settings.banks.unlink")}
                                    </Text>
                                )}
                            </Button>
                        </View>
                    )}
                </SheetGestureRoot>
            </BottomSheetView>
        </BottomSheetModal>
    );
}
