import { api } from "@outlayr/backend/convex/_generated/api";
import { ledgerGlance } from "@outlayr/money/ledger-view";
import type { LedgerOpening } from "@outlayr/money/ledger-view";
import { useEventListener, useMirror, useTimers } from "@outlayr/shared/lifecycle";
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
import { Button } from "panelui-web/button";
import { Toast, useToast } from "panelui-web/toast";
import { Suspense, lazy, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { ArtCard, BrandPage, Centered, SessionEmail } from "@/components/brand-page";
import { AccountFlowsProvider } from "@/components/dashboard/accounts/flows";
import { DashboardPending } from "@/components/dashboard/pending";
import { CommandPalette } from "@/components/dashboard/shell/command-palette";
import { DashboardContext, useFilters } from "@/components/dashboard/shell/dashboard";
import { dashboardSearch, searchPatch } from "@/components/dashboard/shell/filters";
import type { FilterPatch } from "@/components/dashboard/shell/filters";
import { NoticesProvider } from "@/components/dashboard/shell/notifications";
import { DashboardShell } from "@/components/dashboard/shell/shell";
import { SessionExpired, SyncCard, leaveSession } from "@/components/dashboard/shell/status";
import { offerProfile, warmAccountState } from "@/lib/account-state";
import { convexClient } from "@/lib/convex";
import { prepareLedger } from "@/lib/dashboard-series-ledger";
import { watchKeyboardInset } from "@/lib/keyboard-inset";
import type { LedgerBooks } from "@/lib/ledger-books";
import { ledgerCommitter } from "@/lib/ledger-committer";
import { ledgerSync, markLanded, preloadLedger, useLedgerBooks } from "@/lib/ledger-db";
import { serverLedger } from "@/lib/ledger-server";
import { lightPathOf, viewCovered } from "@/lib/light-views";
import { viewTransition } from "@/lib/motion";
import { onboardingDue, readProgress, subscribeProgress } from "@/lib/onboarding";
import { currentToken, onSessionChange, userOf } from "@/lib/session";
import { watchSync } from "@/lib/sync-status";
import { dropOldCopy, forgetLedger } from "@/lib/unsent";

const Paywall = lazy(async () => {
    const { Paywall: page } = await import("@/components/dashboard/paywall/paywall");
    return { default: page };
});

export const Route = createFileRoute("/_account/_app")({
    component: App,
    errorComponent: NotSynced,
    validateSearch: dashboardSearch,
    staleTime: Number.POSITIVE_INFINITY,
    loader: async ({ context, location }) => {
        const asOf = Date.now();
        const token = context.token ?? (await currentToken(context.session));
        if (!token) {
            throw redirect({ search: { redirect: location.href }, to: "/login" });
        }
        context.session.token = token;
        const userId = userOf(token);
        let opening: LedgerOpening | null = null;
        try {
            if (import.meta.env.SSR) {
                const path = lightPathOf(location.pathname, location.searchStr);
                const seed = await serverLedger(token, path ? { asOf, path } : null);
                ({ opening } = seed);
                context.dbClient.hydrate({ collections: seed.collections });
                offerProfile(context.queryClient, seed.profile);
            }
            await preloadLedger(context.dbClient);
        } catch (error) {
            if (error instanceof Error && proRequired(error)) {
                return { asOf, opening: null, synced: false, userId };
            }
            throw error;
        }
        return { asOf, opening, synced: true, userId };
    },
    pendingComponent: Pending,
    pendingMinMs: 0,
    pendingMs: 0,
});

function App() {
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

const onOnboarding = (pathname: string) => pathname.startsWith("/onboarding");
const noProgress = () => null;

function Ledgered() {
    const { userId } = Route.useLoaderData();
    const books = useLedgerBooks();
    const progress = useSyncExternalStore(subscribeProgress, () => readProgress(userId), noProgress);
    const onboarding = useLocation({ select: (location) => onOnboarding(location.pathname) });
    const due = onboardingDue(progress, books);
    if (due && !onboarding) {
        return <Navigate replace search to="/onboarding" />;
    }
    if (onboarding && !due) {
        return <Navigate replace to="/" />;
    }
    return (
        <LiveDashboard bare={onboarding} books={books}>
            <Outlet />
        </LiveDashboard>
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
                    onClick: () => navigate({ to: "/settings/plan" }),
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
    if (onboarding) {
        return null;
    }
    return (
        <DashboardShell>
            <DashboardPending />
        </DashboardShell>
    );
}

const MIN_WAIT_MS = 15_000;

function useTurnover(nextChangeAt: number, advance: (asOf: number) => void) {
    const timers = useTimers();
    useMirror([advance, nextChangeAt], () => {
        let stop: () => void = () => undefined;
        const arm = (delay: number) => {
            stop = timers.after(delay, () => {
                advance(Date.now());
                arm(MIN_WAIT_MS);
            });
        };
        arm(Math.max(nextChangeAt - Date.now(), 0));
        return () => stop();
    });
    useEventListener(
        (listener) => {
            document.addEventListener("visibilitychange", listener);
            return () => document.removeEventListener("visibilitychange", listener);
        },
        () => {
            if (document.visibilityState === "visible" && Date.now() >= nextChangeAt) {
                advance(Date.now());
            }
        }
    );
}

function useLiveLedger(userId: string | undefined, onLanded: (outcome: "landed" | Error) => void) {
    const { dbClient, queryClient } = Route.useRouteContext();
    const router = useRouter();
    useMirror([dbClient, onLanded, queryClient, router, userId], () => {
        dropOldCopy();
        ledgerCommitter(dbClient, userId).resume();
        warmAccountState(queryClient);
        const landing = preloadLedger(dbClient).then(async () => {
            await ledgerSync(dbClient).landed();
            markLanded(dbClient);
            onLanded("landed");
        });
        landing.catch(async (error) => {
            // Only a refusal reloads: a server that stays busy past the retries leaves the rendered rows on screen.
            if (error instanceof ConvexError) {
                await router.invalidate();
                return;
            }
            onLanded(error instanceof Error ? error : new Error("The ledger did not land", { cause: error }));
        });
        const stops = [
            onSessionChange(() => {
                leaveSession();
                return forgetLedger().finally(() => window.location.reload());
            }),
            watchSync(convexClient()),
            watchKeyboardInset(),
        ];
        return () => {
            for (const stop of stops) {
                stop?.();
            }
        };
    });
}

function LiveDashboard({ bare, books, children }: { bare: boolean; books: LedgerBooks; children: ReactNode }) {
    const loaded = Route.useLoaderData();
    const search = Route.useSearch();
    const navigate = useNavigate();
    const [asOf, setAsOf] = useState(loaded.asOf);
    const [landing, setLanding] = useState<"landed" | Error | null>(null);
    const opening = landing === "landed" ? null : loaded.opening;
    const overview = useMemo(() => ledgerGlance(books, asOf, opening), [books, asOf, opening]);
    useTurnover(overview.nextChangeAt, setAsOf);
    const ledger = useMemo(() => prepareLedger(books, asOf, opening), [books, asOf, opening]);
    useLiveLedger(loaded.userId, setLanding);
    const filters = useFilters(search, ledger);
    const pathname = useLocation({ select: (location) => location.pathname });
    const pageSearch = useLocation({ select: (location) => location.search });
    const [stranded, setStranded] = useState(false);
    const waiting =
        opening !== null &&
        (stranded || !viewCovered(ledger, pathname === "/" ? filters.range : filters.period, pathname, pageSearch));
    if (waiting && landing instanceof Error) {
        throw landing;
    }
    const dashboard = useMemo(
        () => ({
            filters,
            ledger,
            overview,
            strand: () => setStranded(true),
            setFilters: (patch: FilterPatch) =>
                navigate({
                    resetScroll: false,
                    search: (prev) => ({ ...prev, ...searchPatch(patch) }),
                    to: ".",
                    viewTransition: "period" in patch || "range" in patch ? viewTransition("dissolve") : undefined,
                }),
        }),
        [filters, ledger, navigate, overview]
    );
    return (
        <DashboardContext value={dashboard}>
            <Toast.Provider position="bottom-right">
                <NoticesProvider>
                    <DashboardShell bare={bare}>
                        <Unlocked />
                        <AccountFlowsProvider>
                            {waiting ? <DashboardPending /> : children}
                            <CommandPalette />
                            <SyncCard />
                            <SessionExpired />
                        </AccountFlowsProvider>
                    </DashboardShell>
                </NoticesProvider>
            </Toast.Provider>
        </DashboardContext>
    );
}

const proRequired = (error: Error) =>
    (error instanceof ConvexError ? String(error.data) : error.message).includes("Pro is required");

const startOver = () => window.location.reload();

function NotSynced({ error }: ErrorComponentProps) {
    const copy = useIntlayer("not-synced");
    if (error instanceof Error && proRequired(error)) {
        return (
            <Suspense fallback={null}>
                <Paywall />
            </Suspense>
        );
    }
    return (
        <BrandPage actions={<SessionEmail />}>
            <Centered>
                <ArtCard
                    action={<Button onClick={startOver}>{copy.retry}</Button>}
                    body={copy.body}
                    title={copy.title}
                />
            </Centered>
        </BrandPage>
    );
}
