import { api } from "@outlayr/backend/convex/_generated/api";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ChevronsUpDownIcon, LogOutIcon, ReceiptTextIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import * as Skullet from "skullet";
import { Skeleton } from "skullet/react";

import { LINE_PILL, Muted, SOLID_PILL, Screen } from "@/components/account/parts";
import { AccountsCard, BudgetsCard, EntryLog, MonthHero, UpcomingCard } from "@/components/ledger/overview";
import type { PhotoUrls } from "@/components/ledger/overview";
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

export const Route = createFileRoute("/_account/app")({
    beforeLoad: ({ context, location }) => {
        if (!context.token) {
            throw redirect({ search: { redirect: location.href }, to: "/login" });
        }
    },
    component: App,
    errorComponent: NotSynced,
    head: () => ({ meta: [{ title: "Outlayr" }] }),
});

const SIDEBAR_WIDTH: CSSProperties & Record<"--sidebar-width", string> = { "--sidebar-width": "14rem" };

function App() {
    return (
        <SidebarProvider className="app-shell ph-no-capture" style={SIDEBAR_WIDTH}>
            <AppSidebar />
            <SidebarInset className="bg-background">
                <Overview />
            </SidebarInset>
        </SidebarProvider>
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

function usePhotoUrls(keys: readonly string[]): PhotoUrls {
    const readUrls = useMutation(api.photos.readUrls);
    const [urls, setUrls] = useState<PhotoUrls>(new Map());
    const wanted = [...new Set(keys)].toSorted().join("\n");
    // oxlint-disable-next-line outlayr/react-effect-budget -- signed urls come from a mutation, an external system.
    useEffect(() => {
        if (wanted === "") {
            return;
        }
        let live = true;
        const mint = () =>
            readUrls({ keys: wanted.split("\n") })
                .then((minted) => {
                    if (live) {
                        setUrls(new Map(minted.map((photo) => [photo.key, photo.url])));
                    }
                })
                .catch(() => undefined);
        void mint();
        const timer = setInterval(mint, PHOTO_REMINT_MS);
        return () => {
            live = false;
            clearInterval(timer);
        };
    }, [readUrls, wanted]);
    return urls;
}

const ENTRY_LIMIT = 30;

const MIN_WAIT_MS = 15_000;

function useAsOf(nextChangeAt: number | undefined) {
    const [asOf, setAsOf] = useState(() => Date.now());
    // oxlint-disable-next-line outlayr/react-effect-budget -- the clock is an external system.
    useEffect(() => {
        if (nextChangeAt === undefined) {
            return;
        }
        let timer: ReturnType<typeof setTimeout>;
        const arm = () => {
            timer = setTimeout(
                () => {
                    setAsOf(Date.now());
                    arm();
                },
                Math.max(nextChangeAt - Date.now(), MIN_WAIT_MS)
            );
        };
        arm();
        const onVisible = () => {
            if (document.visibilityState === "visible" && Date.now() >= nextChangeAt) {
                setAsOf(Date.now());
            }
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearTimeout(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [nextChangeAt]);
    return asOf;
}

function useLatest<T>(value: T | undefined) {
    const [kept, setKept] = useState(value);
    if (value !== undefined && value !== kept) {
        setKept(value);
    }
    return value ?? kept;
}

function Overview() {
    const { isAuthenticated } = useConvexAuth();
    const [nextChangeAt, setNextChangeAt] = useState<number>();
    const asOf = useAsOf(nextChangeAt);
    const overview = useLatest(useQuery(api.ledger.overview, isAuthenticated ? { asOf, limit: ENTRY_LIMIT } : "skip"));
    if (overview && overview.nextChangeAt !== nextChangeAt) {
        setNextChangeAt(overview.nextChangeAt);
    }
    const photos = usePhotoUrls(
        [...(overview?.entries ?? []), ...(overview?.balances.accounts ?? [])].flatMap((row) =>
            row.imageKey ? [row.imageKey] : []
        )
    );
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

function NotSynced({ error, reset }: ErrorComponentProps) {
    if (!(error instanceof Error && error.message.includes("Pro is required"))) {
        return (
            <Screen title="Could not load your ledger">
                <Muted>Try again in a moment.</Muted>
                <button className={SOLID_PILL} onClick={reset} type="button">
                    Try again
                </button>
            </Screen>
        );
    }
    return (
        <Screen title="Turn on sync">
            <Muted>Your web ledger shows what Outlayr Pro syncs from your phone.</Muted>
            <ol className="text-app-muted mb-6 flex flex-col gap-2 text-left font-mono text-xs tracking-[0.08em] uppercase">
                <li>1 · Open Outlayr on your phone</li>
                <li>2 · Settings · Sync and backup</li>
                <li>3 · Turn on Sync this device</li>
            </ol>
            <button className={SOLID_PILL} onClick={reset} type="button">
                Check again
            </button>
            <button className={`${LINE_PILL} mt-2.5`} onClick={signOut} type="button">
                Sign out
            </button>
        </Screen>
    );
}
