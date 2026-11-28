import * as Cause from "effect/Cause";
import { useRouter } from "expo-router";
import { BottomSheet } from "panelui-native/components/bottom-sheet";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { ProviderSignInButtons } from "@/components/account/provider-sign-in-buttons";
import { RowAmount } from "@/components/amount-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { FirstRun } from "@/components/first-run";
import { MonoLabel } from "@/components/mono-label";
import { ROW_TYPE } from "@/components/row-type";
import { Text } from "@/components/text";
import { TILE_RADIUS, TILE_SIZE } from "@/components/transfer-tile";
import { cn } from "@/components/tw";
import { useSheetInsets } from "@/components/use-sheet-insets";
import { useDatabase } from "@/contexts/local-data-context";
import { useSyncStatus } from "@/data/use-sync-status";
import { bankLinkRegion, banksScreen } from "@/domain/linked-banks";
import { useAiGate } from "@/hooks/use-ai-gate";
import { useBankOverview } from "@/hooks/use-bank-overview";
import { useMerchantMark } from "@/hooks/use-merchant-mark";
import { useRegionCode } from "@/hooks/use-region-code";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { activeProfileId } from "@/lib/active-profile";
import { authClient } from "@/lib/auth-client";
import { useAuthSession } from "@/lib/auth-session";
import { isGoogleSignInAvailable } from "@/lib/google-sign-in";
import { useWhen } from "@/lib/lifecycle";
import { STRIPE_READY } from "@/lib/stripe-link";
import { useHaptics } from "@/lib/use-haptics";
import { useProviderSignIn } from "@/lib/use-provider-sign-in";
import { SILENT } from "@/state/atom-command";
import { finishFirstRunCommand } from "@/state/lifecycle-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";

type AuthClient = NonNullable<typeof authClient>;

// Module state, not React state: signing in remounts the app under the new account and drops the screen's state.
let linkAfterSignIn = false;

const SAMPLE: readonly {
    amount: number;
    color: string;
    detail: TranslationKey;
    icon: string;
    name: string;
    pending: boolean;
}[] = [
    {
        amount: 6.45,
        color: "#00704A",
        detail: "onboarding.bank.pending",
        icon: "Coffee02",
        name: "Starbucks",
        pending: true,
    },
    {
        amount: 48.12,
        color: "#CC0000",
        detail: "categories.preset.groceries",
        icon: "ShoppingBasket01",
        name: "Target",
        pending: false,
    },
    {
        amount: 11.99,
        color: "#1DB954",
        detail: "categories.preset.subscriptions",
        icon: "MusicNote01",
        name: "Spotify",
        pending: false,
    },
];

/** Only a trial that just started gets the step, and only where a bank can be linked and an account made. */
export function useOnboardingBankDue(): boolean {
    const region = useRegionCode();
    const { accountId } = useAuthSession();
    const canSignIn = Platform.OS === "ios" || isGoogleSignInAvailable;
    return STRIPE_READY && authClient !== null && bankLinkRegion(region) && (accountId !== null || canSignIn);
}

export function OnboardingBank() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const haptics = useHaptics();
    const { accountId } = useAuthSession();
    const syncOn = useSyncStatus(db).enabled;
    const overview = useBankOverview();
    const screen = banksScreen({
        mode: "link",
        overview,
        personal: activeProfileId() === undefined,
        signedIn: accountId !== null,
        stripeReady: STRIPE_READY,
        syncOn,
    });
    const [signInOpen, setSignInOpen] = useState(false);
    // Sync turns on only once the new account adopts this ledger, a beat after sign-in lands.
    const [waiting, setWaiting] = useState(() => linkAfterSignIn);
    const finish = useAtomAction(
        finishFirstRunCommand,
        {
            onFailure: (cause) => {
                console.error("Finishing onboarding failed", Cause.squash(cause));
                haptics("error");
            },
        },
        SILENT
    );

    useWhen(accountId !== null && signInOpen, () => {
        setSignInOpen(false);
    });
    useWhen(waiting && screen.kind === "entry", () => {
        linkAfterSignIn = false;
        setWaiting(false);
        router.push("/onboarding/bank-link");
    });

    const link = () => {
        if (accountId === null) {
            setSignInOpen(true);
        } else if (screen.kind === "entry") {
            router.push("/onboarding/bank-link");
        } else {
            setWaiting(true);
        }
    };
    const leave = () => {
        linkAfterSignIn = false;
        setSignInOpen(false);
        finish(db);
    };

    return (
        <>
            <FirstRun
                action={{
                    disabled: waiting,
                    label: t(waiting ? "onboarding.bank.waiting" : "onboarding.bank.action"),
                    onPress: link,
                }}
                body={t("onboarding.bank.body")}
                eyebrow={t("onboarding.bank.eyebrow")}
                footnote={t("onboarding.bank.footnote")}
                skip={{ label: t("auth.signIn.notNow"), onPress: leave }}
                title={t("onboarding.bank.title")}
            >
                <BankProof />
            </FirstRun>
            {authClient === null ? null : (
                <BankSignInSheet client={authClient} onLeave={leave} onOpenChange={setSignInOpen} open={signInOpen} />
            )}
        </>
    );
}

function BankProof() {
    const t = useTranslation();
    return (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <ProofHeader label={t("common.today")} />
            {SAMPLE.map((row) => (
                <SampleRow key={row.name} {...row} detail={t(row.detail)} />
            ))}
        </View>
    );
}

export function ProofHeader({ label }: { label: string }) {
    return (
        <>
            <MonoLabel className="text-fr-muted">{label}</MonoLabel>
            <View className="bg-fr-rule mt-1.25" style={{ borderRadius: 0.65, height: 1.3 }} />
        </>
    );
}

function SampleRow({ name, ...row }: Omit<(typeof SAMPLE)[number], "detail"> & { detail: string }) {
    const mark = useMerchantMark(name);
    return <ProofRow {...row} code="USD" emoji={null} imageUri={mark} income={false} title={name} />;
}

export function ProofRow({
    amount,
    code,
    color,
    detail,
    emoji,
    icon,
    imageUri,
    income,
    pending = false,
    title,
}: {
    amount: number;
    code: string;
    color: string;
    detail: string;
    emoji: string | null;
    icon: string | null;
    imageUri: string | null;
    income: boolean;
    pending?: boolean;
    title: string;
}) {
    return (
        <View className="flex-row items-center gap-3 py-3">
            <CategoryIconTile
                color={color}
                emoji={emoji}
                icon={icon}
                imageUri={imageUri}
                radius={TILE_RADIUS}
                size={TILE_SIZE}
                type="solid"
            />
            <View className="flex-1 gap-0.5">
                <Text className={cn(ROW_TYPE.title, "text-fr-ink")} numberOfLines={1}>
                    {title}
                </Text>
                <Text
                    className={cn(ROW_TYPE.subtitle, pending ? "text-warning-foreground" : "text-fr-muted")}
                    numberOfLines={1}
                >
                    {detail}
                </Text>
            </View>
            <RowAmount amount={amount} code={code} income={income} isFuture={false} />
        </View>
    );
}

function BankSignInSheet({
    client,
    onLeave,
    onOpenChange,
    open,
}: {
    client: AuthClient;
    onLeave: () => void;
    onOpenChange: (open: boolean) => void;
    open: boolean;
}) {
    const t = useTranslation();
    const colors = useColors();
    const sheetInsets = useSheetInsets();
    const restoring = useAiGate() === "restoring";
    const signIn = useProviderSignIn(client);
    const start: typeof signIn.start = (request) => {
        linkAfterSignIn = true;
        signIn.start(request);
    };

    return (
        <BottomSheet native nativeBackground={colors.background} onOpenChange={onOpenChange} open={open}>
            <SafeAreaInsetsContext.Provider value={sheetInsets}>
                <BottomSheet.Content size="auto">
                    <View className="gap-1">
                        <Text accessibilityRole="header" className="text-foreground font-sans-semibold text-title">
                            {t("onboarding.bank.signInTitle")}
                        </Text>
                        <Text className="text-muted text-subtitle leading-snug">{t("onboarding.bank.signInBody")}</Text>
                    </View>
                    <View className="android:pb-safe gap-3 pt-5">
                        <ProviderSignInButtons busy={signIn.busy} disabled={restoring} start={start} />
                        {signIn.error === null ? null : (
                            <Text
                                accessibilityLiveRegion="polite"
                                className="text-danger text-subtitle leading-snug"
                                role="alert"
                            >
                                {signIn.error}
                            </Text>
                        )}
                        <Pressable accessibilityRole="button" className="active:opacity-60" onPress={onLeave}>
                            <Text className="font-sans-medium text-muted text-subtitle pt-1 text-center">
                                {t("auth.signIn.notNow")}
                            </Text>
                        </Pressable>
                    </View>
                </BottomSheet.Content>
            </SafeAreaInsetsContext.Provider>
        </BottomSheet>
    );
}
