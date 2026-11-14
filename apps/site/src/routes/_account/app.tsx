import { api } from "@outlayr/backend/convex/_generated/api";
import { ledgerGlance } from "@outlayr/money/ledger-view";
import { useQuery } from "@tanstack/react-query";
import {
    Navigate,
    Outlet,
    createFileRoute,
    redirect,
    useLocation,
    useNavigate,
    useRouter,
} from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { ConvexError } from "convex/values";
import { Toast, useToast } from "panelui-web/toast";
import { Suspense, lazy, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { IntlayerProvider, useIntlayer, useLocale } from "react-intlayer";

import { Muted, SOLID_PILL, Screen } from "@/components/account/parts";
import { AccountFlowsProvider } from "@/components/dashboard/accounts/flows";
import { DashboardPending } from "@/components/dashboard/pending";
import { DashboardContext, useFilters } from "@/components/dashboard/shell/dashboard";
import { dashboardSearch, searchPatch } from "@/components/dashboard/shell/filters";
import type { FilterPatch } from "@/components/dashboard/shell/filters";
import { mintedPhotos, photoKeys, seedPhotos, usePhotoUrls } from "@/components/dashboard/shell/photos";
import { DashboardShell } from "@/components/dashboard/shell/shell";
import type { Overview, PhotoUrls } from "@/components/ledger/overview";
import { accountStateOf, restoreAccountState, useAccountStateStamp, warmAccountState } from "@/lib/account-state";
import { convexClient } from "@/lib/convex";
import { readDashboardLocale, serverDashboardLocale, subscribeDashboardLocale } from "@/lib/dashboard-locale";
import { prepareLedger } from "@/lib/dashboard-series-ledger";
import { LANGUAGES } from "@/lib/i18n";
import { watchKeyboardInset } from "@/lib/keyboard-inset";
import type { LedgerBooks } from "@/lib/ledger-books";
import { dropLedger, forgetLedger, hasLedgerCopy, restoreLedger, saveLedger } from "@/lib/ledger-cache";
import { ledgerCommitter } from "@/lib/ledger-committer";
import { ledgerCollections, preloadLedger, useLedgerBooks } from "@/lib/ledger-db";
import { onboardingDue, readProgress, subscribeProgress } from "@/lib/onboarding";
import { currentToken, onSessionChange, userOf } from "@/lib/session";
import { readSync, subscribeSync, watchSync } from "@/lib/sync-status";

const Paywall = lazy(async () => {
    const { Paywall: page } = await import("@/components/dashboard/paywall/paywall");
    return { default: page };
});

export const Route = createFileRoute("/_account/app")({
    component: App,
    errorComponent: NotSynced,
    validateSearch: dashboardSearch,
    ssr: false,
    staleTime: Number.POSITIVE_INFINITY,
    loader: async ({ context, location }) => {
        const asOf = Date.now();
        const token = context.token ?? (await currentToken(context.session));
        if (!token) {
            throw redirect({ search: { redirect: location.href }, to: "/login" });
        }
        context.session.token = token;
        const userId = userOf(token);
        const idle = context.dbClient.collection(ledgerCollections.transactions).status === "idle";
        const restored = idle && userId !== undefined ? await restoreLedger(context.dbClient, userId) : undefined;
        const settled = preloadLedger(context.dbClient).then(() => true);
        ledgerCommitter(context.dbClient, userId).resume();
        restoreAccountState(context.queryClient, restored?.queries);
        warmAccountState(context.queryClient);
        if (restored) {
            seedPhotos(context.queryClient, restored.photos);
            return { asOf, restored: true, settled, synced: true, userId };
        }
        try {
            await settled;
        } catch (error) {
            if (error instanceof Error && proRequired(error)) {
                return { asOf, restored: false, settled, synced: false, userId };
            }
            throw error;
        }
        return { asOf, restored: false, settled, synced: true, userId };
    },
    pendingComponent: Pending,
    pendingMinMs: 0,
    pendingMs: 0,
    head: () => ({ meta: [{ title: "Outlayr" }] }),
});

function Localized({ children }: { children: ReactNode }) {
    const locale = useSyncExternalStore(subscribeDashboardLocale, readDashboardLocale, serverDashboardLocale);
    return (
        <IntlayerProvider locale={locale}>
            <div className="contents" lang={LANGUAGES[locale].lang}>
                {children}
            </div>
        </IntlayerProvider>
    );
}

function App() {
    return (
        <Localized>
            <SyncedApp />
        </Localized>
    );
}

function SyncedApp() {
    const { synced } = Route.useLoaderData();
    if (!synced) {
        return (
            <Suspense fallback={null}>
                <Paywall />
            </Suspense>
        );
    }
    return <Ledgered />;
}

const onOnboarding = (pathname: string) => pathname.startsWith("/app/onboarding");
const noProgress = () => null;

function Ledgered() {
    const { userId } = Route.useLoaderData();
    const books = useLedgerBooks();
    const progress = useSyncExternalStore(subscribeProgress, () => readProgress(userId), noProgress);
    const onboarding = useLocation({ select: (location) => onOnboarding(location.pathname) });
    const due = onboardingDue(progress, books);
    if (due && !onboarding) {
        return <Navigate replace search to="/app/onboarding" />;
    }
    if (onboarding && !due) {
        return <Navigate replace to="/app" />;
    }
    return (
        <DashboardShell bare={onboarding}>
            <Toast.Provider position="bottom-right">
                <Unlocked />
            </Toast.Provider>
            <LiveDashboard books={books}>
                <Outlet />
            </LiveDashboard>
        </DashboardShell>
    );
}

function Unlocked() {
    const { checkout, restore } = Route.useSearch();
    const navigate = useNavigate();
    const toast = useToast();
    const { locale } = useLocale();
    const { managePlan, proIsOn, proIsOnTrial } = useIntlayer("paywall");
    useQuery({
        enabled: checkout !== undefined || restore !== undefined,
        queryFn: async () => {
            const plan = await convexClient()
                .action(api.billing.plan, {})
                .catch(() => null);
            const trialEnds =
                plan?.state === "trial" && plan.expiresAtMs !== null
                    ? new Date(plan.expiresAtMs).toLocaleDateString(locale, { day: "numeric", month: "short" })
                    : null;
            toast.add({
                actionProps: {
                    children: managePlan.value,
                    onClick: () => navigate({ to: "/app/settings/plan" }),
                },
                title: trialEnds === null ? proIsOn.value : proIsOnTrial({ date: trialEnds }).value,
                type: "success",
            });
            await navigate({
                replace: true,
                search: ({ checkout: _checkout, restore: _restore, ...rest }) => rest,
                to: ".",
            });
            return true;
        },
        queryKey: ["billing", "unlocked", checkout, restore],
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
    });
    return null;
}

function Pending() {
    const onboarding = useLocation({ select: (location) => onOnboarding(location.pathname) });
    if (!hasLedgerCopy() || onboarding) {
        return null;
    }
    return (
        <Localized>
            <DashboardShell>
                <DashboardPending />
            </DashboardShell>
        </Localized>
    );
}

const MIN_WAIT_MS = 15_000;

function useTurnover(nextChangeAt: number, advance: (asOf: number) => void) {
    // oxlint-disable-next-line outlayr/react-effect-budget -- the clock is an external system.
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const arm = (delay: number) => {
            timer = setTimeout(() => {
                advance(Date.now());
                arm(MIN_WAIT_MS);
            }, delay);
        };
        arm(Math.max(nextChangeAt - Date.now(), 0));
        const onVisible = () => {
            if (document.visibilityState === "visible" && Date.now() >= nextChangeAt) {
                advance(Date.now());
            }
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearTimeout(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [advance, nextChangeAt]);
}

const SAVE_DELAY_MS = 1000;

function useLedgerCopy(overview: Overview, photos: PhotoUrls, settled: Promise<boolean>, userId: string | undefined) {
    const { dbClient, queryClient } = Route.useRouteContext();
    const router = useRouter();
    const [synced, setSynced] = useState(false);
    const [answered, setAnswered] = useState(false);
    const copiedAt = useAccountStateStamp(queryClient);
    // oxlint-disable-next-line outlayr/react-effect-budget -- other tabs are an external system.
    useEffect(() => onSessionChange(() => forgetLedger().finally(() => window.location.reload())), []);
    // oxlint-disable-next-line outlayr/react-effect-budget -- the Convex connection is an external system.
    useEffect(() => watchSync(convexClient()), []);
    // oxlint-disable-next-line outlayr/react-effect-budget -- the on-screen keyboard is an external system
    useEffect(() => watchKeyboardInset(), []);
    // oxlint-disable-next-line outlayr/react-effect-budget -- the restored copy shows before Convex answers, so a refusal arrives after the first paint.
    useEffect(() => {
        settled
            .then(setSynced)
            .catch(async (error) => {
                // Only a refusal ends the copy: a server that stays busy past the retries leaves the books on screen.
                if (error instanceof ConvexError) {
                    await dropLedger();
                    await router.invalidate();
                }
            })
            .finally(() => setAnswered(true));
    }, [router, settled]);
    // oxlint-disable-next-line outlayr/react-effect-budget -- IndexedDB is an external system.
    useEffect(() => {
        if (!synced || userId === undefined) {
            return;
        }
        const save = () =>
            saveLedger(dbClient, mintedPhotos(queryClient, photoKeys(overview)), userId, accountStateOf(queryClient));
        const timer = setTimeout(save, SAVE_DELAY_MS);
        return () => clearTimeout(timer);
        // oxlint-disable-next-line react/exhaustive-effect-dependencies -- newly minted photos and fresh account state re-arm the save.
    }, [copiedAt, dbClient, overview, photos, queryClient, synced, userId]);
    return answered;
}

const offline = () => readSync().status === "failed";

function LiveDashboard({ books, children }: { books: LedgerBooks; children: ReactNode }) {
    const loaded = Route.useLoaderData();
    const search = Route.useSearch();
    const navigate = useNavigate();
    const [asOf, setAsOf] = useState(loaded.asOf);
    const overview = useMemo(() => ledgerGlance(books, asOf), [books, asOf]);
    useTurnover(overview.nextChangeAt, setAsOf);
    const ledger = useMemo(() => prepareLedger(books, asOf), [books, asOf]);
    const photos = usePhotoUrls(overview);
    const answered = useLedgerCopy(overview, photos, loaded.settled, loaded.userId);
    const failed = useSyncExternalStore(subscribeSync, offline, () => false);
    const restoring = loaded.restored && !answered && !failed;
    const filters = useFilters(search, ledger);
    const dashboard = useMemo(
        () => ({
            filters,
            ledger,
            overview,
            photos,
            restoring,
            setFilters: (patch: FilterPatch) =>
                navigate({ resetScroll: false, search: (prev) => ({ ...prev, ...searchPatch(patch) }), to: "." }),
        }),
        [filters, ledger, navigate, overview, photos, restoring]
    );
    return (
        <DashboardContext value={dashboard}>
            <AccountFlowsProvider>{children}</AccountFlowsProvider>
        </DashboardContext>
    );
}

const proRequired = (error: Error) =>
    (error instanceof ConvexError ? String(error.data) : error.message).includes("Pro is required");

async function startOver() {
    await dropLedger();
    window.location.reload();
}

function NotSynced({ error }: ErrorComponentProps) {
    if (error instanceof Error && proRequired(error)) {
        return (
            <Suspense fallback={null}>
                <Paywall />
            </Suspense>
        );
    }
    return (
        <Screen title="Could not load your ledger">
            <Muted>Try again in a moment.</Muted>
            <button className={SOLID_PILL} onClick={startOver} type="button">
                Try again
            </button>
        </Screen>
    );
}
