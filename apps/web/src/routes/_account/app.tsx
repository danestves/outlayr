import { ledgerGlance } from "@outlayr/backend/confect/ledgerView";
import { Outlet, createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { LINE_PILL, Muted, SOLID_PILL, Screen } from "@/components/account/parts";
import { DashboardPending } from "@/components/dashboard/pending";
import { signOut } from "@/components/dashboard/shell/account-menu";
import { DashboardContext, useFilters } from "@/components/dashboard/shell/dashboard";
import { dashboardSearch, searchPatch } from "@/components/dashboard/shell/filters";
import type { FilterPatch } from "@/components/dashboard/shell/filters";
import { mintedPhotos, photoKeys, seedPhotos, usePhotoUrls } from "@/components/dashboard/shell/photos";
import { DashboardShell } from "@/components/dashboard/shell/shell";
import type { Overview, PhotoUrls } from "@/components/ledger/overview";
import { prepareLedger } from "@/lib/dashboard-series-ledger";
import { dropLedger, hasLedgerCopy, restoreLedger, saveLedger } from "@/lib/ledger-cache";
import { ledgerCollections, preloadLedger, useLedgerBooks } from "@/lib/ledger-db";
import { currentToken, onSessionChange, userOf } from "@/lib/session";

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
        if (restored) {
            seedPhotos(context.queryClient, restored.photos);
            return { asOf, settled, synced: true, userId };
        }
        try {
            await settled;
        } catch (error) {
            if (error instanceof Error && proRequired(error)) {
                return { asOf, settled, synced: false, userId };
            }
            throw error;
        }
        return { asOf, settled, synced: true, userId };
    },
    pendingComponent: Pending,
    pendingMinMs: 0,
    pendingMs: 0,
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
    if (!hasLedgerCopy()) {
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
    // oxlint-disable-next-line outlayr/react-effect-budget -- other tabs are an external system.
    useEffect(() => onSessionChange(() => window.location.reload()), []);
    // oxlint-disable-next-line outlayr/react-effect-budget -- the restored copy shows before Convex answers, so a refusal arrives after the first paint.
    useEffect(() => {
        settled.then(setSynced).catch(async () => {
            await dropLedger();
            await router.invalidate();
        });
    }, [router, settled]);
    // oxlint-disable-next-line outlayr/react-effect-budget -- IndexedDB is an external system.
    useEffect(() => {
        if (!synced || userId === undefined) {
            return;
        }
        const save = () => saveLedger(dbClient, mintedPhotos(queryClient, photoKeys(overview)), userId);
        const timer = setTimeout(save, SAVE_DELAY_MS);
        return () => clearTimeout(timer);
        // oxlint-disable-next-line react/exhaustive-effect-dependencies -- newly minted photos re-arm the save.
    }, [dbClient, overview, photos, queryClient, synced, userId]);
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
    useLedgerCopy(overview, photos, loaded.settled, loaded.userId);
    const filters = useFilters(search, ledger);
    const dashboard = useMemo(
        () => ({
            filters,
            ledger,
            overview,
            photos,
            setFilters: (patch: FilterPatch) =>
                navigate({ resetScroll: false, search: (prev) => ({ ...prev, ...searchPatch(patch) }), to: "." }),
        }),
        [filters, ledger, navigate, overview, photos]
    );
    return <DashboardContext value={dashboard}>{children}</DashboardContext>;
}

const proRequired = (error: Error) => error.message.includes("Pro is required");

async function startOver() {
    await dropLedger();
    window.location.reload();
}

function NotSynced({ error }: ErrorComponentProps) {
    const router = useRouter();
    if (error instanceof Error && proRequired(error)) {
        return <TurnOnSync retry={() => router.invalidate()} />;
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

function TurnOnSync({ retry }: { retry: () => Promise<void> }) {
    return (
        <Screen title="Turn on sync">
            <Muted>Your web ledger shows what Outlayr Pro syncs from your phone.</Muted>
            <ol className="text-app-muted mb-6 flex flex-col gap-2 text-left text-sm">
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
