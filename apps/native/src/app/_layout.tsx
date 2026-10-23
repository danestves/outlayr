import "../../global.css";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { GeistMono_400Regular } from "@expo-google-fonts/geist-mono/400Regular";
import { GeistMono_500Medium } from "@expo-google-fonts/geist-mono/500Medium";
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif/400Regular";
import { useConvexAuth } from "convex/react";
import { useFonts } from "expo-font";
import { setNotificationHandler } from "expo-notifications";
import type { ErrorBoundaryProps } from "expo-router";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { hideAsync, preventAutoHideAsync } from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { PanelUIProvider } from "panelui-native/provider";
import { useTheme } from "panelui-native/theme";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { SafeAreaListener, SafeAreaProvider } from "react-native-safe-area-context";
import { Uniwind, useCSSVariable } from "uniwind";

import { AiConsentSheet } from "@/components/ai-consent";
import { AppLockGate } from "@/components/app-lock-gate";
import { AuthCover } from "@/components/auth-cover";
import { CelebrationConfetti } from "@/components/confetti";
import { LocalDataError } from "@/components/local-data-error";
import { Text } from "@/components/text";
import { UpdateSheet } from "@/components/update-sheet";
import { AppSettingsProvider } from "@/contexts/display-settings-context";
import { IdentityDraftProvider } from "@/contexts/identity-draft-context";
import { LocalDataProvider, useDatabase, useLocalData } from "@/contexts/local-data-context";
import { RevenueCatProvider } from "@/contexts/revenuecat-context";
import { BackgroundWork } from "@/data/background-work";
import { useAccountDeferred, useOnboardingSettled } from "@/data/onboarding";
import { useSeededClockPreference } from "@/data/settings";
import { DeferredDeleteProvider } from "@/data/use-deferred-delete";
import { rootStackGroup } from "@/domain/auth-gate";
import { GROUP_ENTRY, MODAL_SCREENS, SHEET_SCREENS, TITLED_SCREENS } from "@/domain/root-stack";
import { localShellReady, routeSettled } from "@/domain/splash-gate";
import { LanguageProvider, useTranslation } from "@/i18n/context";
import { translateNow } from "@/i18n/runtime";
import { AuthSessionProvider, useAuthSession } from "@/lib/auth-session";
import { cloudRuntime } from "@/lib/cloud-runtime";
import { setCloudAuthenticated } from "@/lib/convex";
import { DeviceResetRecovery } from "@/lib/device-reset-recovery";
import { LedgerAdoptionProvider, useLedgerAdoption } from "@/lib/ledger-adoption";
import { useScreenTracking } from "@/lib/posthog";
import { useAnalyticsConsent } from "@/lib/posthog-consent";
import { usePostHogIdentity } from "@/lib/posthog-identity";
import { identityPickerDetent } from "@/lib/sheet-detents";
import { useSubscriptionReminderTaps } from "@/lib/use-subscription-reminder-taps";
import { useWalletPushTaps } from "@/lib/use-wallet-push-taps";
import { useStackChrome } from "@/navigation/stack-chrome";
import { BODY_FONTS } from "@/theme/body-fonts";
import { useAccent } from "@/theme/use-accent";
import { useApplyThemePreference } from "@/theme/use-theme-preference";

preventAutoHideAsync();

setNotificationHandler(null);

export const unstable_settings = {
    anchor: "(tabs)",
};

// Renders in place of the provider tree, so it reads the language off the runtime rather than `useTranslation`.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
    return (
        <View className="bg-background flex-1 items-center justify-center px-8">
            <Text className="font-sans-semibold text-foreground text-title pb-2">
                {translateNow("error.boundary.title")}
            </Text>
            <Text className="text-muted text-subtitle pb-4 text-center">{translateNow("error.boundary.body")}</Text>
            <Text className="text-label text-muted pb-6 text-center">{error.message}</Text>
            <Pressable
                accessibilityRole="button"
                className="bg-accent rounded-full px-6 py-3"
                onPress={() => {
                    retry();
                }}
            >
                <Text className="font-sans-semibold text-accent-foreground text-subtitle">
                    {translateNow("common.retry")}
                </Text>
            </Pressable>
        </View>
    );
}

function CloudRuntimeProvider({ children }: { children: ReactNode }) {
    return (
        <AuthSessionProvider>
            <RevenueCatProvider>
                <ActivatedCloudRuntime>{children}</ActivatedCloudRuntime>
            </RevenueCatProvider>
        </AuthSessionProvider>
    );
}

function Analytics() {
    useAnalyticsConsent();
    useScreenTracking();
    return null;
}

function ActivatedCloudRuntime({ children }: { children: ReactNode }) {
    const { accountId } = useAuthSession();
    usePostHogIdentity();
    if (cloudRuntime === null || accountId === null) {
        return children;
    }
    return (
        <ConvexBetterAuthProvider authClient={cloudRuntime.authClient} client={cloudRuntime.convex}>
            <CloudAuthMirror />
            {children}
        </ConvexBetterAuthProvider>
    );
}

function CloudAuthMirror() {
    const { isAuthenticated } = useConvexAuth();
    useEffect(() => {
        setCloudAuthenticated(isAuthenticated);
        return () => {
            setCloudAuthenticated(false);
        };
    }, [isAuthenticated]);
    return null;
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
    const { status } = useLocalData();
    // Above the splash gate: the accent must be written into both themes before the first screen paints.
    useAccent();
    useApplyThemePreference();
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [splashHidden, setSplashHidden] = useState(false);
    // SAFETY: every name below is declared in global.css, so each slot resolves.
    const [background, card, text, border, primary] = useCSSVariable([
        "--background",
        "--color-card",
        "--foreground",
        "--border",
        "--color-tint",
    ]) as string[];

    const hideSplash = useCallback(() => {
        hideAsync();
        setSplashHidden(true);
    }, []);

    // An error surface beats an indefinite splash, but it is in the owner's language, so it waits on the catalog.
    const failed = fontsLoaded && status === "error";
    if (failed && !splashHidden) {
        setSplashHidden(true);
    }

    useEffect(() => {
        if (failed) {
            hideAsync();
        }
    }, [failed]);

    const base = isDark ? DarkTheme : DefaultTheme;

    if (localShellReady({ data: status, fontsLoaded })) {
        return (
            <LedgerAdoptionProvider>
                <DeviceResetRecovery>
                    <RouteGate hideSplash={hideSplash} splashHidden={splashHidden}>
                        <BackgroundWork />
                        <StatusBar style={isDark ? "light" : "dark"} />

                        <ThemeProvider
                            value={{
                                ...base,
                                // `primary` too, or React Navigation keeps its own iOS blue on native toolbar buttons.
                                colors: { ...base.colors, background, border, card, primary, text },
                                dark: isDark,
                            }}
                        >
                            <AuthCover>
                                <AppLockGate>
                                    <RootStack />
                                    <Analytics />
                                    <UpdateSheet />
                                    <AiConsentSheet />
                                    <CelebrationConfetti />
                                </AppLockGate>
                            </AuthCover>
                        </ThemeProvider>
                    </RouteGate>
                </DeviceResetRecovery>
            </LedgerAdoptionProvider>
        );
    }

    // Latched on the splash because `retry()` walks the status back to `opening`: blanking then would empty the
    // screen for the attempt, and permanently if the migration never answers on a locked or corrupt file.
    if (!splashHidden) {
        return null;
    }

    return <LocalDataError />;
}

// Holds the splash until `rootStackGroup` can name a destination. `AuthCover` stays: a sign-in re-enters
// `resolving` long after launch, where a splash is not the right cover.
function RouteGate({
    children,
    hideSplash,
    splashHidden,
}: {
    children: ReactNode;
    hideSplash: () => void;
    splashHidden: boolean;
}) {
    const { gate } = useAuthSession();
    const { status } = useLedgerAdoption();
    const settled = routeSettled({ adoption: status, gate });

    useEffect(() => {
        if (settled) {
            hideSplash();
        }
    }, [settled, hideSplash]);

    if (!(settled || splashHidden)) {
        return null;
    }

    return children;
}

// Split out so `useDatabase` is only called below the splash gate, where the database is guaranteed open.
function RootStack() {
    const db = useDatabase();
    const t = useTranslation();
    const onboarded = useOnboardingSettled(db);
    const deferred = useAccountDeferred(db);
    const { gate } = useAuthSession();
    const { status: adoption } = useLedgerAdoption();
    const { height: windowHeight } = useWindowDimensions();
    const pickerDetent = identityPickerDetent(windowHeight);
    const chrome = useStackChrome();
    useSeededClockPreference(db);

    const group = rootStackGroup({
        deferred,
        gate,
        onboarded,
        reconciled: adoption === "settled",
    });
    useWalletPushTaps(db, group === "ledger");
    useSubscriptionReminderTaps(db, group === "ledger");

    return (
        <Stack>
            <Stack.Protected guard={group === "onboarding"} redirectTo={GROUP_ENTRY[group]}>
                <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
                {/* Transparent: the stock theme card differs from `--fr-ground`, so an opaque bar bands the top. */}
                <Stack.Screen name="onboarding/currency" options={chrome.firstRunStep} />
                <Stack.Screen name="onboarding/smart-features" options={chrome.firstRunStep} />
                <Stack.Screen name="onboarding/rhythm" options={chrome.firstRunStep} />
                <Stack.Screen name="onboarding/rating" options={chrome.firstRunStep} />
            </Stack.Protected>

            {/* Behind onboarding: only the currency step writes `currencyChosen`, and canonicalization declines every
                row on a ledger that lacks it (`docs/internals/convex-sync.md` §1.7). */}
            <Stack.Protected guard={group === "sign-in"} redirectTo={GROUP_ENTRY[group]}>
                <Stack.Screen name="auth/sign-in" options={{ headerShown: false }} />
                <Stack.Screen name="auth/email" options={chrome.firstRunStep} />
            </Stack.Protected>

            <Stack.Protected guard={group === "adopt"} redirectTo={GROUP_ENTRY[group]}>
                <Stack.Screen name="auth/adopt" options={{ gestureEnabled: false, headerShown: false }} />
            </Stack.Protected>

            {/* Every root screen must sit in exactly one of these four groups: one outside them all survives a guard
                flip and strands the stack on it, with no tab bar and no way back. */}
            <Stack.Protected guard={group === "ledger"} redirectTo={GROUP_ENTRY[group]}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

                {/* Header chrome comes from `useStackChrome`, which has an Android sibling. */}
                <Stack.Screen name="search" options={chrome.search(t("nav.search"))} />
                <Stack.Screen name="paywall" options={chrome.paywall} />

                {TITLED_SCREENS.map((screen) => (
                    <Stack.Screen key={screen.name} name={screen.name} options={chrome.titled(t(screen.titleKey))} />
                ))}
                <Stack.Screen name="accounts/reorder" options={chrome.pushed} />
                <Stack.Screen name="accounts/[accountId]/index" options={chrome.pushed} />
                <Stack.Screen name="installments/[planId]" options={chrome.pushed} />
                <Stack.Screen name="installments/scan" options={chrome.bareModal} />
                <Stack.Screen name="settings/categories/reorder" options={chrome.pushed} />
                <Stack.Screen name="settings/licenses/[name]" options={chrome.pushed} />
                {SHEET_SCREENS.map((sheet) => (
                    <Stack.Screen
                        key={sheet.name}
                        name={sheet.name}
                        options={chrome.sheet({ detent: sheet.detent, title: t(sheet.titleKey) })}
                    />
                ))}
                <Stack.Screen name="settings/category-symbol" options={chrome.pickerSheet(pickerDetent)} />
                <Stack.Screen name="settings/email" options={chrome.firstRunStep} />

                {MODAL_SCREENS.map((modal) => (
                    <Stack.Screen key={modal.name} name={modal.name} options={chrome.modal(t(modal.titleKey))} />
                ))}
                <Stack.Screen name="transactions/[id]" options={chrome.entrySheet} />
                <Stack.Screen name="transactions/transfers/[id]" options={chrome.entrySheet} />
                <Stack.Screen name="transactions/voice" options={chrome.bareModal} />
                <Stack.Screen name="transactions/scan" options={chrome.bareModal} />
                <Stack.Screen name="transactions/identity" options={chrome.identityPicker(pickerDetent)} />
            </Stack.Protected>
        </Stack>
    );
}

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        ...BODY_FONTS,
        GeistMono_400Regular,
        GeistMono_500Medium,
        InstrumentSerif_400Regular,
    });

    return (
        <SafeAreaProvider>
            <SafeAreaListener
                onChange={({ insets }) => {
                    Uniwind.updateInsets(insets);
                }}
            >
                <PanelUIProvider>
                    <LanguageProvider>
                        <CloudRuntimeProvider>
                            <LocalDataProvider>
                                <DeferredDeleteProvider>
                                    <AppSettingsProvider>
                                        <IdentityDraftProvider>
                                            <RootNavigator fontsLoaded={fontsLoaded} />
                                        </IdentityDraftProvider>
                                    </AppSettingsProvider>
                                </DeferredDeleteProvider>
                            </LocalDataProvider>
                        </CloudRuntimeProvider>
                    </LanguageProvider>
                </PanelUIProvider>
            </SafeAreaListener>
        </SafeAreaProvider>
    );
}
