import type { ConvexQueryClient } from "@convex-dev/react-query";
import { ledgerOverview } from "@outlayr/backend/confect/ledgerView";
import { api } from "@outlayr/backend/convex/_generated/api";
import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Button, buttonVariants } from "panelui-web/button";
import { Menu } from "panelui-web/menu";
import { Sheet } from "panelui-web/sheet";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as Skullet from "skullet";
import { Skeleton } from "skullet/react";

import { LINE_PILL, Muted, SOLID_PILL, Screen } from "@/components/account/parts";
import { Icon } from "@/components/icon";
import { AccountsCard, BudgetsCard, EntryLog, MonthHero, UpcomingCard } from "@/components/ledger/overview";
import type { Overview, PhotoUrls } from "@/components/ledger/overview";
import { SAMPLE_OVERVIEW } from "@/components/ledger/sample";
import { LogoMark } from "@/components/logo-mark";
import { accentCss } from "@/lib/accent";
import { authClient } from "@/lib/auth-client";
import { ledgerBooks, preloadLedger, useLedgerBooks } from "@/lib/ledger-db";
import { LedgerSettingsContext, useLedgerSettings } from "@/lib/ledger-settings";

const PHOTO_REMINT_MS = 50 * 60_000;

function photoKeys({ balances, log, upcoming }: Overview) {
    const looks = [
        ...log.flatMap((day) => day.rows.flatMap((row) => (row.type === "entry" ? [row.look] : [row.from, row.to]))),
        ...balances.accounts.map((account) => account.look),
        ...upcoming.charges.map((charge) => charge.look),
    ];
    return [...new Set(looks.flatMap((look) => (look?.imageKey ? [look.imageKey] : [])))].toSorted();
}

const photoUrlsQuery = (convex: ConvexQueryClient | undefined, keys: readonly string[]) =>
    queryOptions({
        enabled: Boolean(convex) && keys.length > 0,
        queryFn: async () => {
            const client = convex?.serverHttpClient ?? convex?.convexClient;
            if (!client) {
                return [];
            }
            return client.mutation(api.photos.readUrls, { keys: [...keys] });
        },
        queryKey: ["photoUrls", keys],
        refetchInterval: PHOTO_REMINT_MS,
        staleTime: PHOTO_REMINT_MS,
    });

const toPhotoUrls = (minted: readonly { key: string; url: string }[]): PhotoUrls =>
    new Map(minted.map((photo) => [photo.key, photo.url]));

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
            await preloadLedger(context.dbClient);
            const overview = ledgerOverview(ledgerBooks(context.dbClient), asOf);
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

function Shell({ children }: { children: ReactNode }) {
    const settings = useLedgerSettings();
    return (
        <LedgerSettingsContext value={settings}>
            <style>{accentCss(settings.accent)}</style>
            <div className="app-shell ph-no-capture flex min-h-dvh">
                <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 border-r md:block">
                    <AppNav />
                </aside>
                <div className="min-w-0 flex-1">{children}</div>
            </div>
        </LedgerSettingsContext>
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

function AppNav() {
    return (
        <nav className="flex h-full flex-col gap-5 px-4 pt-7 pb-6">
            <Link className="flex items-center gap-2.5 px-2 text-[19px] font-extrabold tracking-[-0.015em]" to="/">
                <LogoMark className="size-6" />
                Outlayr
            </Link>
            <Link
                className={buttonVariants({
                    className: "justify-start gap-3 rounded-xl px-2.5 text-[15px] font-semibold",
                    variant: "secondary",
                })}
                to="/app"
            >
                <Icon className="size-4" name="receipt" />
                Log
            </Link>
            <AccountMenu />
        </nav>
    );
}

function MobileNav() {
    return (
        <Sheet side="left">
            <Sheet.Trigger
                render={<Button aria-label="Open menu" className="-ml-2 md:hidden" size="icon" variant="ghost" />}
            >
                <Icon className="size-5" name="list" />
            </Sheet.Trigger>
            <Sheet.Content className="app-shell ph-no-capture w-72">
                <Sheet.Title className="sr-only">Menu</Sheet.Title>
                <AppNav />
            </Sheet.Content>
        </Sheet>
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
        <Menu>
            <Menu.Trigger
                render={
                    <Button
                        className="text-muted-foreground mt-auto w-full justify-start rounded-xl px-2.5 font-medium"
                        variant="ghost"
                    />
                }
            >
                <span className="flex-1 truncate text-left">{session?.user.email ?? "Account"}</span>
                <Icon className="size-4" name="caret-up-down" />
            </Menu.Trigger>
            <Menu.Content className="app-shell ph-no-capture" side="top">
                <Menu.Item onClick={signOut}>
                    <Icon name="sign-out" />
                    Sign out
                </Menu.Item>
            </Menu.Content>
        </Menu>
    );
}

const NO_PHOTOS: PhotoUrls = new Map();

function usePhotoUrls(overview: Overview): PhotoUrls {
    const { convexQueryClient } = Route.useRouteContext();
    const { data } = useQuery({
        ...photoUrlsQuery(convexQueryClient, photoKeys(overview)),
        placeholderData: keepPreviousData,
        select: toPhotoUrls,
    });
    return data ?? NO_PHOTOS;
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

function LiveOverview() {
    const loaded = Route.useLoaderData();
    const [asOf, setAsOf] = useState(loaded.asOf);
    const books = useLedgerBooks();
    const overview = useMemo(() => ledgerOverview(books, asOf), [books, asOf]);
    useTurnover(overview.nextChangeAt, setAsOf);
    const photos = usePhotoUrls(overview);
    return <OverviewView overview={overview} photos={photos} />;
}

function OverviewView({ overview, photos }: { overview: Overview | undefined; photos: PhotoUrls }) {
    return (
        <div className="grid min-h-dvh xl:grid-cols-[minmax(0,1fr)_22rem]">
            <main className="min-w-0 px-5 pt-7 md:px-10">
                <header className="flex h-11 items-center gap-2">
                    <MobileNav />
                    <h1 className="text-[28px] leading-[34px] font-extrabold tracking-[-0.01em]">Log</h1>
                </header>
                <Skeleton data={overview} id="ledger-log" label="Loading your ledger" sample={SAMPLE_OVERVIEW}>
                    {({ budgets, log, summary }) => (
                        <>
                            <MonthHero budgets={budgets} summary={summary} today={summary.today} />
                            <EntryLog currency={summary.currency} log={log} photos={photos} today={summary.today} />
                        </>
                    )}
                </Skeleton>
            </main>
            <aside className="border-border px-5 pt-7 pb-10 md:px-10 xl:border-l xl:px-7">
                <Skeleton data={overview} id="ledger-rail" sample={SAMPLE_OVERVIEW}>
                    {({ balances, budgets, summary, upcoming }) => (
                        <div className="flex flex-col gap-6">
                            <AccountsCard balances={balances} photos={photos} />
                            <BudgetsCard budgets={budgets} />
                            <UpcomingCard currency={summary.currency} photos={photos} upcoming={upcoming} />
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
