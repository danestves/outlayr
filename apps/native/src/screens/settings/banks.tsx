import { BottomSheetModal, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import Search01Icon from "@hugeicons-pro/core-stroke-rounded/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { api } from "@outlayr/backend/convex/_generated/api";
import { useQueries } from "convex/react";
import * as Cause from "effect/Cause";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "panelui-native/components/button";
import { useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { Alert, Keyboard, Platform, Pressable, TextInput, View } from "react-native";

import { BusyText } from "@/components/busy-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { InlineFailure } from "@/components/form/inline-failure";
import { SettingsSection } from "@/components/list/list-row";
import { MaterialListItem } from "@/components/list/material-list-item";
import { RowShell } from "@/components/list/row-shell";
import { MaterialFab } from "@/components/material-fab";
import { MonoLabel } from "@/components/mono-label";
import { SEARCH_FIELD } from "@/components/search-field-style";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { SheetGestureRoot } from "@/components/sheet-gesture-root";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useNow } from "@/data/use-now";
import { useSyncStatus } from "@/data/use-sync-status";
import { formatSentenceDate, formatTime } from "@/domain/dates";
import { accountTitle, BANK_LINK_ROUTE, banksScreen, byInstitution } from "@/domain/linked-banks";
import type { BankGate, BankInstitution, LinkedBankAccount } from "@/domain/linked-banks";
import { useBankOverview } from "@/hooks/use-bank-overview";
import { useLongWait } from "@/hooks/use-long-wait";
import { useCreateAccount, useOpenPaywall } from "@/hooks/use-pro-gate";
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

import { BankFilesIntoRow, BankGlyph, BankMark, kindLabel, useBankLink } from "./bank-parts";

const NO_ACCOUNTS: readonly LinkedBankAccount[] = [];
const FIT_CONTENT = { alignSelf: "stretch" } as const;
const ROW_MARK = 20;
const ENTRY_MARK = 32;

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
    const params = useLocalSearchParams<{ q?: string | string[]; repair?: string | string[] }>();
    const query = Array.isArray(params.q) ? undefined : params.q;
    const repair = Array.isArray(params.repair) ? undefined : params.repair;
    return <BanksRoute mode="link" query={query} repair={repair} />;
}

function BanksRoute({ mode, query, repair }: { mode: "link" | "list"; query?: string; repair?: string }) {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const { accountId } = useAuthSession();
    const syncOn = useSyncStatus(db).enabled;
    const overview = useBankOverview();
    const ready = overview.kind === "ready" ? overview.overview : null;
    const bankLink = useBankLink(ready?.accounts ?? NO_ACCOUNTS, mode === "link" ? () => router.back() : undefined);
    const repairing = ready?.accounts.find((account) => account.id === repair)?.id ?? null;
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
                        initialQuery={query}
                        repair={repairing}
                        onLeave={
                            mode === "link"
                                ? () => {
                                      router.back();
                                  }
                                : undefined
                        }
                    />
                );
            }
            default: {
                return <BanksList accounts={screen.accounts} />;
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

/** The link step a fresh trial reaches from onboarding; a finished link moves on to watch the first charges land. */
export function OnboardingLinkBank() {
    const router = useRouter();
    const overview = useBankOverview();
    const ready = overview.kind === "ready" ? overview.overview : null;
    const bankLink = useBankLink(
        ready?.accounts ?? NO_ACCOUNTS,
        () => router.back(),
        (added, institution) => {
            router.replace({
                params: { bank: institution.name, ids: added.join(","), since: String(Date.now()) },
                pathname: "/onboarding/bank-linked",
            });
        }
    );

    return (
        <>
            <BankEntry bankLink={bankLink} manual={false} repair={null} />
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

const CATCH_ALL_COPY = {
    CA: { detail: "settings.banks.search.other.CA.detail", title: "settings.banks.search.other.CA" },
    US: { detail: "settings.banks.search.other.US.detail", title: "settings.banks.search.other.US" },
} as const satisfies Record<string, { detail: TranslationKey; title: TranslationKey }>;

const REGION_NAMES = new Map<Language, Intl.DisplayNames | null>();

// Hermes may ship without DisplayNames, so the code itself remains the fallback.
function regionName(language: Language, country: string): string {
    let names = REGION_NAMES.get(language);
    if (names === undefined) {
        try {
            names = new Intl.DisplayNames([language], { type: "region" });
        } catch {
            names = null;
        }
        REGION_NAMES.set(language, names);
    }
    return names?.of(country) ?? country;
}

function institutionCopy(t: TranslateFn, language: Language, institution: BankInstitution) {
    if (institution.catchAll && (institution.country === "CA" || institution.country === "US")) {
        const copy = CATCH_ALL_COPY[institution.country];
        return { detail: t(copy.detail), title: t(copy.title) };
    }
    return { detail: regionName(language, institution.country), title: institution.name };
}

function InstitutionMark({ logo }: { logo: string | null }) {
    const colors = useColors();
    if (logo === null) {
        return <BankGlyph size={ENTRY_MARK} />;
    }
    return (
        <CategoryIconTile
            color={colors.muted}
            icon={null}
            imageUri={logo}
            radius={Math.round(ENTRY_MARK / 4)}
            size={ENTRY_MARK}
            type="solid"
        />
    );
}

function InstitutionRow({
    busy,
    detail,
    disabled,
    leading,
    onPress,
    title,
}: {
    busy: boolean;
    detail?: string;
    disabled: boolean;
    leading: ReactNode;
    onPress: () => void;
    title: string;
}) {
    const t = useTranslation();
    const colors = useColors();
    return (
        <Pressable
            accessibilityRole="button"
            className="border-border flex-row items-center gap-3 border-b py-3.5 active:opacity-60"
            disabled={disabled}
            onPress={onPress}
        >
            <View className="items-center justify-center" style={{ height: ENTRY_MARK, width: ENTRY_MARK }}>
                {leading}
            </View>
            <View className="flex-1 gap-0.5">
                {busy ? (
                    <BusyText className="text-body font-sans-semibold" color={colors.foreground}>
                        {t("settings.banks.entry.busy")}
                    </BusyText>
                ) : (
                    <Text className="text-foreground text-body" numberOfLines={1}>
                        {title}
                    </Text>
                )}
                {detail ? (
                    <Text className="text-muted text-subtitle" numberOfLines={1}>
                        {detail}
                    </Text>
                ) : null}
            </View>
        </Pressable>
    );
}

function BankEntry({
    bankLink,
    initialQuery,
    manual = true,
    onLeave,
    repair,
}: {
    bankLink: BankLink;
    initialQuery?: string;
    /** Onboarding has no account form to fall back to: its stack ends before the ledger's. */
    manual?: boolean;
    onLeave?: () => void;
    repair: LinkedBankAccount["id"] | null;
}) {
    const t = useTranslation();
    const colors = useColors();
    const { language } = useLanguage();
    const createAccount = useCreateAccount();
    const region = useRegionCode();
    const [query, setQuery] = useState(initialQuery ?? "");
    const [previous, setPrevious] = useState<readonly BankInstitution[]>([]);
    const [tapped, setTapped] = useState<BankInstitution["id"] | null>(null);
    const found: readonly BankInstitution[] | Error | undefined = useQueries({
        institutions: {
            args: { q: query, region: region?.toUpperCase() ?? null },
            query: api.banking.searchInstitutions,
        },
    }).institutions;
    const failed = found instanceof Error;
    const loaded = failed ? null : found;
    const rows = loaded ?? previous;
    const settled = loaded !== undefined && loaded !== null;
    const noMatch = settled && query.trim() !== "" && !rows.some((row) => !row.catchAll);
    const offerManual = manual && (noMatch || (failed && rows.length === 0));
    const slow = useLongWait(bankLink.busy);
    const busyId = slow ? tapped : null;
    const consent = {
        footer: t("settings.banks.consent"),
        footerLink: {
            label: t("settings.banks.consent.privacy"),
            onPress: () => {
                openInAppBrowser(legalUrl("privacy", language)).catch(() => undefined);
            },
        },
    };

    const changeQuery = (next: string) => {
        setPrevious(rows);
        setQuery(next);
    };

    return (
        <SettingsScreen keyboardShouldPersistTaps="handled">
            <View className="pt-4">
                <View className="bg-surface flex-row items-center gap-2 rounded-full px-4 py-2.5">
                    <HugeiconsIcon color={colors.muted} icon={Search01Icon} size={16} strokeWidth={2} />
                    <TextInput
                        accessibilityLabel={t("settings.banks.search.placeholder")}
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={changeQuery}
                        placeholder={t("settings.banks.search.placeholder")}
                        placeholderTextColor={colors.muted}
                        returnKeyType="search"
                        style={[SEARCH_FIELD, { color: colors.foreground }]}
                        value={query}
                    />
                    {query === "" ? null : (
                        <Pressable
                            accessibilityLabel={t("common.clearSearch")}
                            accessibilityRole="button"
                            hitSlop={8}
                            onPress={() => changeQuery("")}
                        >
                            <HugeiconsIcon color={colors.muted} icon={Cancel01Icon} size={16} strokeWidth={2} />
                        </Pressable>
                    )}
                </View>
            </View>
            <SettingsSection {...consent}>
                {failed && rows.length === 0 ? (
                    <View className="border-border border-b py-3.5">
                        <InlineFailure message={t("settings.banks.search.failed")} />
                    </View>
                ) : null}
                {noMatch ? (
                    <View className="border-border border-b py-3.5">
                        <Text className="text-foreground text-body font-sans-semibold">
                            {t("settings.banks.search.noMatch", { query })}
                        </Text>
                    </View>
                ) : null}
                {rows.map((row) => {
                    const copy = institutionCopy(t, language, row);
                    return (
                        <InstitutionRow
                            busy={busyId === row.id}
                            detail={copy.detail}
                            disabled={bankLink.busy}
                            key={row.id}
                            leading={
                                row.catchAll ? <BankGlyph size={ENTRY_MARK} /> : <InstitutionMark logo={row.logo} />
                            }
                            onPress={() => {
                                // Otherwise iOS hands focus back to the field when the result sheet closes.
                                Keyboard.dismiss();
                                setTapped(row.id);
                                bankLink.link(row, repair);
                            }}
                            title={copy.title}
                        />
                    );
                })}
                {offerManual ? (
                    <InstitutionRow
                        busy={false}
                        disabled={bankLink.busy}
                        leading={<HugeiconsIcon color={colors.tint} icon={PlusSignIcon} size={20} strokeWidth={1.9} />}
                        onPress={() => {
                            onLeave?.();
                            createAccount();
                        }}
                        title={t("settings.banks.search.manual")}
                    />
                ) : null}
            </SettingsSection>
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

function BanksList({ accounts }: { accounts: readonly LinkedBankAccount[] }) {
    const t = useTranslation();
    const router = useRouter();
    const colors = useColors();
    const { language } = useLanguage();
    const sheetRef = useRef<BottomSheetModal>(null);
    const [openId, setOpenId] = useState<LinkedBankAccount["id"] | null>(null);
    const groups = byInstitution(accounts);
    const open = accounts.find((account) => account.id === openId) ?? null;
    const android = Platform.OS === "android";

    const signIn = (account: LinkedBankAccount) => {
        router.push({ pathname: BANK_LINK_ROUTE, params: { q: account.institution, repair: account.id } });
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

export function useBankRowDetail(account: LinkedBankAccount) {
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
    onOpen,
    onSignIn,
}: {
    account: LinkedBankAccount;
    onOpen: () => void;
    onSignIn: () => void;
}) {
    const t = useTranslation();
    const { attention, detail } = useBankRowDetail(account);
    const relink = account.status === "relink";
    const signIn = relink ? (
        <Pressable
            accessibilityRole="button"
            className={
                Platform.OS === "android"
                    ? "bg-m3-secondary-container rounded-full px-4 py-2 active:opacity-60"
                    : "active:opacity-60"
            }
            hitSlop={8}
            onPress={onSignIn}
        >
            <Text
                className={
                    Platform.OS === "android"
                        ? "text-m3-on-secondary-container text-caption font-sans-semibold"
                        : "text-danger text-body"
                }
            >
                {Platform.OS === "android" ? t("settings.banks.signIn") : t("settings.banks.signInAgain")}
            </Text>
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
    onDismiss,
    onSignIn,
}: {
    ref: RefObject<BottomSheetModal | null>;
    account: LinkedBankAccount | null;
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
            onSuccess: (unlinked) => {
                if (!unlinked) {
                    haptics("error");
                    notifyFailure({
                        title: t("settings.banks.unlink.failed", { account: account ? accountTitle(account) : "" }),
                    });
                    return;
                }
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
