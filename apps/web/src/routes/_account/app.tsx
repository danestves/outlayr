import { ledgerGlance } from "@outlayr/backend/confect/ledgerView";
import { Outlet, createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { LINE_PILL, Muted, SOLID_PILL, Screen } from "@/components/account/parts";
import { HomePanelPending, HomePending } from "@/components/dashboard/home/home-pending";
import { signOut } from "@/components/dashboard/shell/account-menu";
import { DashboardContext, useFilters } from "@/components/dashboard/shell/dashboard";
import { dashboardSearch, searchPatch } from "@/components/dashboard/shell/filters";
import type { FilterPatch } from "@/components/dashboard/shell/filters";
import { photoKeys, photoUrlsQuery, usePhotoUrls } from "@/components/dashboard/shell/photos";
import { DashboardShell } from "@/components/dashboard/shell/shell";
import { Workspace } from "@/components/dashboard/shell/workspace";
import { prepareLedger } from "@/lib/dashboard-series-ledger";
import { ledgerBooks, preloadLedger, useLedgerBooks } from "@/lib/ledger-db";

export const Route = createFileRoute("/_account/app")({
    beforeLoad: ({ context, location }) => {
        if (!context.token) {
            throw redirect({ search: { redirect: location.href }, to: "/login" });
        }
    },
    component: App,
    errorComponent: NotSynced,
    validateSearch: dashboardSearch,
    loader: async ({ context }) => {
        const asOf = Date.now();
        try {
            await preloadLedger(context.dbClient);
            const overview = ledgerGlance(ledgerBooks(context.dbClient), asOf);
            await context.queryClient.prefetchQuery(photoUrlsQuery(context.convexQueryClient, photoKeys(overview)));
        } catch (error) {
            if (error instanceof Error && proRequired(error)) {
                return { asOf, synced: false };
            }
            throw error;
        }
        return { asOf, synced: true };
    },
    pendingComponent: Pending,
    head: () => ({ meta: [{ title: "Outlayr" }] }),
});

function App() {
    const { synced } = Route.useLoaderData();
    const router = useRouter();
    if (!synced) {
        return <TurnOnSync retry={() => router.invalidate()} />;
    }
    return (
        <DashboardShell>
            <LiveDashboard>
                <Outlet />
            </LiveDashboard>
        </DashboardShell>
    );
}

function Pending() {
    const { nav } = useIntlayer("dashboard");
    return (
        <DashboardShell>
            <Workspace main={<HomePending />} panel={<HomePanelPending />} title={nav.dashboard} />
        </DashboardShell>
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

function LiveDashboard({ children }: { children: ReactNode }) {
    const loaded = Route.useLoaderData();
    const search = Route.useSearch();
    const navigate = useNavigate();
    const [asOf, setAsOf] = useState(loaded.asOf);
    const books = useLedgerBooks();
    const overview = useMemo(() => ledgerGlance(books, asOf), [books, asOf]);
    useTurnover(overview.nextChangeAt, setAsOf);
    const ledger = useMemo(() => prepareLedger(books, asOf), [books, asOf]);
    const photos = usePhotoUrls(overview);
    const filters = useFilters(search, ledger);
    const dashboard = useMemo(
        () => ({
            filters,
            ledger,
            overview,
            photos,
            setFilters: (patch: FilterPatch) =>
                navigate({ resetScroll: false, search: { ...search, ...searchPatch(patch) }, to: "." }),
        }),
        [filters, ledger, navigate, overview, photos, search]
    );
    return <DashboardContext value={dashboard}>{children}</DashboardContext>;
}

const proRequired = (error: Error) => error.message.includes("Pro is required");

function NotSynced({ error }: ErrorComponentProps) {
    const router = useRouter();
    const retry = () => router.invalidate();
    if (error instanceof Error && proRequired(error)) {
        return <TurnOnSync retry={retry} />;
    }
    return (
        <Screen title="Could not load your ledger">
            <Muted>Try again in a moment.</Muted>
            <button className={SOLID_PILL} onClick={retry} type="button">
                Try again
            </button>
        </Screen>
    );
}

function TurnOnSync({ retry }: { retry: () => Promise<void> }) {
    return (
        <Screen title="Turn on sync">
            <Muted>Your web ledger shows what Outlayr Pro syncs from your phone.</Muted>
            <ol className="text-app-muted mb-6 flex flex-col gap-2 text-left font-mono text-xs tracking-[0.08em] uppercase">
                <li>1 · Open Outlayr on your phone</li>
                <li>2 · Settings · Sync and backup</li>
                <li>3 · Turn on Sync this device</li>
            </ol>
            <button className={SOLID_PILL} onClick={retry} type="button">
                Check again
            </button>
            <button className={`${LINE_PILL} mt-2.5`} onClick={signOut} type="button">
                Sign out
            </button>
        </Screen>
    );
}
