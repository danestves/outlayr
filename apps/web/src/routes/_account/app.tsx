import { convexQuery } from "@convex-dev/react-query";
import { api } from "@outlayr/backend/convex/_generated/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useConvex } from "convex/react";
import { ChevronsUpDownIcon, LogOutIcon, ReceiptTextIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import * as Skullet from "skullet";
import { Skeleton } from "skullet/react";

import { LINE_PILL, Muted, SOLID_PILL, Screen } from "@/components/account/parts";
import { AccountsCard, BudgetsCard, EntryLog, MonthHero, UpcomingCard } from "@/components/ledger/overview";
import type { Overview, PhotoUrls } from "@/components/ledger/overview";
import { SAMPLE_OVERVIEW } from "@/components/ledger/sample";
import { LogoMark } from "@/components/logo-mark";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

const ENTRY_LIMIT = 30;

const overviewQuery = (asOf: number) => convexQuery(api.ledger.overview, { asOf, limit: ENTRY_LIMIT });

export const Route = createFileRoute("/_account/app")({
    beforeLoad: ({ context, location }) => {
        if (!context.token) {
            throw redirect({ search: { redirect: location.href }, to: "/login" });
        }
    },
    component: App,
    errorComponent: NotSynced,
    loader: async ({ context }) => {
        const asOf = Date.now();
        try {
            await context.queryClient.ensureQueryData(overviewQuery(asOf));
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

const SIDEBAR_WIDTH: CSSProperties & Record<"--sidebar-width", string> = { "--sidebar-width": "14rem" };

function Shell({ children }: { children: ReactNode }) {
    return (
        <SidebarProvider className="app-shell ph-no-capture" style={SIDEBAR_WIDTH}>
            <AppSidebar />
            <SidebarInset className="bg-background">{children}</SidebarInset>
        </SidebarProvider>
    );
}

function App() {
    const { synced } = Route.useLoaderData();
    const router = useRouter();
    if (!synced) {
        return <TurnOnSync retry={() => router.invalidate()} />;
    }
    return (
        <Shell>
            <LiveOverview />
        </Shell>
    );
}

function Pending() {
    return (
        <Shell>
            <OverviewView overview={undefined} photos={NO_PHOTOS} />
        </Shell>
    );
}

function AppSidebar() {
    return (
        <Sidebar className="app-shell ph-no-capture">
            <SidebarHeader className="px-4 pt-7 pb-5">
                <Link className="flex items-center gap-2.5 px-2 text-[19px] font-extrabold tracking-[-0.015em]" to="/">
                    <LogoMark className="size-6" />
                    Outlayr
                </Link>
            </SidebarHeader>
            <SidebarContent className="px-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            className="h-10 gap-3 rounded-xl px-2.5 text-[15px] font-semibold"
                            isActive
                            render={<Link to="/app" />}
                        >
                            <ReceiptTextIcon />
                            Log
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="px-4 pb-6">
                <AccountMenu />
            </SidebarFooter>
        </Sidebar>
    );
}

async function signOut() {
    Skullet.forgetShapes();
    await authClient.signOut();
    window.location.assign("/login");
}

function AccountMenu() {
    const { data: session } = authClient.useSession();
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <SidebarMenuButton className="text-muted-foreground h-10 rounded-xl px-2.5 text-sm font-medium" />
                }
            >
                <span className="flex-1 truncate">{session?.user.email ?? "Account"}</span>
                <ChevronsUpDownIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="app-shell ph-no-capture w-52" side="top">
                <DropdownMenuItem onClick={signOut}>
                    <LogOutIcon />
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const PHOTO_REMINT_MS = 50 * 60_000;

const NO_PHOTOS: PhotoUrls = new Map();

function usePhotoUrls(keys: readonly string[]): PhotoUrls {
    const convex = useConvex();
    const wanted = [...new Set(keys)].toSorted();
    const { data } = useQuery({
        enabled: wanted.length > 0,
        queryFn: async (): Promise<PhotoUrls> => {
            const minted = await convex.mutation(api.photos.readUrls, { keys: wanted });
            return new Map(minted.map((photo) => [photo.key, photo.url]));
        },
        queryKey: ["photoUrls", wanted],
        refetchInterval: PHOTO_REMINT_MS,
        staleTime: PHOTO_REMINT_MS,
    });
    return data ?? NO_PHOTOS;
}

const MIN_WAIT_MS = 15_000;

function useTurnover(nextChangeAt: number | undefined, advance: (asOf: number) => void) {
    // oxlint-disable-next-line outlayr/react-effect-budget -- the clock is an external system.
    useEffect(() => {
        if (nextChangeAt === undefined) {
            return;
        }
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

function LiveOverview() {
    const loaded = Route.useLoaderData();
    const [asOf, setAsOf] = useState(loaded.asOf);
    const { data: overview } = useQuery({
        ...overviewQuery(asOf),
        placeholderData: keepPreviousData,
        throwOnError: true,
    });
    useTurnover(overview?.nextChangeAt, setAsOf);
    const photos = usePhotoUrls(
        [...(overview?.entries ?? []), ...(overview?.balances.accounts ?? [])].flatMap((row) =>
            row.imageKey ? [row.imageKey] : []
        )
    );
    return <OverviewView overview={overview} photos={photos} />;
}

function OverviewView({ overview, photos }: { overview: Overview | undefined; photos: PhotoUrls }) {
    return (
        <div className="grid min-h-dvh xl:grid-cols-[minmax(0,1fr)_22rem]">
            <main className="min-w-0 px-5 pt-7 md:px-10">
                <header className="flex h-11 items-center gap-2">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-[28px] leading-[34px] font-extrabold tracking-[-0.01em]">Log</h1>
                </header>
                <Skeleton data={overview} id="ledger-log" label="Loading your ledger" sample={SAMPLE_OVERVIEW}>
                    {({ entries, budgets, summary }) => (
                        <>
                            <MonthHero budgets={budgets} summary={summary} today={summary.today} />
                            <EntryLog
                                currency={summary.currency}
                                entries={entries}
                                mayCutLastDay={entries.length === ENTRY_LIMIT}
                                photos={photos}
                                today={summary.today}
                            />
                        </>
                    )}
                </Skeleton>
            </main>
            <aside className="border-border px-5 pt-7 pb-10 md:px-10 xl:border-l xl:px-7">
                <Skeleton data={overview} id="ledger-rail" sample={SAMPLE_OVERVIEW}>
                    {({ balances, budgets, upcoming }) => (
                        <div className="flex flex-col gap-6">
                            <AccountsCard balances={balances} photos={photos} />
                            <BudgetsCard budgets={budgets} />
                            <UpcomingCard upcoming={upcoming} />
                        </div>
                    )}
                </Skeleton>
            </aside>
        </div>
    );
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
