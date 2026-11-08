import { api } from "@outlayr/backend/convex/_generated/api";
import type { ProPlan } from "@outlayr/money/pro-prices";
import { RiCheckLine, RiCloseLine, RiErrorWarningLine, RiInfinityLine, RiTimeLine } from "@remixicon/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLoaderData, useRouteContext, useSearch } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { CardFrame } from "@/components/dashboard/home/card-frame";
import { signOut } from "@/components/dashboard/shell/account-menu";
import { LocalizedLink } from "@/components/localized-link";
import { LogoMark } from "@/components/logo-mark";
import { authClient } from "@/lib/auth-client";
import { CHECKOUT_CONFIRMED, HELD_STATES, startCheckout } from "@/lib/billing";
import { convexClient } from "@/lib/convex";
import { paywallPrices } from "@/lib/pro-prices";
import { currentToken } from "@/lib/session";
import { SUPPORT_EMAIL } from "@/lib/site";

const TRIAL_DAYS = 7;
const PLANS = ["annual", "monthly", "lifetime"] as const;
const TABLE = [
    { free: "30", key: "autoLog", pro: "infinity" },
    { free: "20", key: "captures", pro: "500" },
    { free: "3", key: "accounts", pro: "infinity" },
    { free: "2", key: "installmentApps", pro: "infinity" },
    { free: "2", key: "payoffPlans", pro: "infinity" },
    { free: "2", key: "budgets", pro: "infinity" },
    { free: "1", key: "currencies", pro: "infinity" },
    { free: null, key: "sync", pro: "check" },
    { free: null, key: "receipts", pro: "check" },
    { free: null, key: "aiMatching", pro: "check" },
    { free: null, key: "notion", pro: "check" },
    { free: null, key: "merchantLookup", pro: "check" },
] as const;
const COMES_BACK = [
    ["ledger", "ledgerHint"],
    ["sync", "syncHint"],
    ["logs", "logsHint"],
    ["currencies", "currenciesHint"],
    ["installments", "installmentsHint"],
] as const;

const usePlan = () =>
    useQuery({
        queryFn: () => convexClient().action(api.billing.plan, {}),
        queryKey: ["billing", "plan"],
        retry: false,
    });

const useDate = () => {
    const { locale } = useLocale();
    return (ms: number) => new Date(ms).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
};

function Page({ children }: { children: ReactNode }) {
    const copy = useIntlayer("paywall");
    const { data: session } = authClient.useSession();
    return (
        <div className="app-shell bg-background text-foreground flex min-h-dvh flex-col">
            <header className="border-border flex h-16 shrink-0 items-center gap-3 border-b px-6 max-sm:px-4">
                <span className="mr-auto flex items-center gap-2.5 text-[15px] font-semibold">
                    <LogoMark className="size-6" />
                    Outlayr
                </span>
                <span className="text-muted-foreground ph-no-capture truncate text-[13px]">{session?.user.email}</span>
                <Button onClick={signOut} size="sm" variant="outline">
                    {copy.signOut}
                </Button>
            </header>
            <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center gap-4 px-6 py-10 max-sm:px-4 max-sm:py-6">
                {children}
            </main>
        </div>
    );
}

function Compare() {
    const copy = useIntlayer("paywall");
    return (
        <CardFrame title={copy.changes}>
            <table className="w-full text-[13px]">
                <thead>
                    <tr className="text-muted-foreground border-border border-b text-right text-xs">
                        <th aria-hidden="true" />
                        <th className="h-9 px-5 font-medium">{copy.free}</th>
                        <th className="h-9 px-5 font-medium">{copy.pro}</th>
                    </tr>
                </thead>
                <tbody>
                    {TABLE.map(({ free, key, pro }) => (
                        <tr className="border-border h-[37px] border-b last:border-0" key={key}>
                            <td className="px-5 text-left">{copy.rows[key]}</td>
                            <td className="text-muted-foreground w-[88px] px-5 text-right font-mono">
                                {free ?? <RiCloseLine className="ml-auto" size={16} />}
                            </td>
                            <td className="text-primary w-[88px] px-5 text-right font-mono">
                                {pro === "infinity" ? <RiInfinityLine className="ml-auto" size={16} /> : null}
                                {pro === "check" ? <RiCheckLine className="ml-auto" size={16} /> : null}
                                {pro === "500" ? pro : null}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </CardFrame>
    );
}

function ComesBack() {
    const copy = useIntlayer("paywall");
    return (
        <CardFrame title={copy.comesBack}>
            {COMES_BACK.map(([title, hint]) => (
                <div className="border-border border-t px-5 py-3 first:border-0" key={title}>
                    <p className="text-sm font-medium">{copy.back[title]}</p>
                    <p className="text-muted-foreground text-[13px]">{copy.back[hint]}</p>
                </div>
            ))}
        </CardFrame>
    );
}

function Timeline({ rows }: { rows: readonly (readonly [ReactNode, ReactNode])[] }) {
    return (
        <div className="border-border mt-5 border-t text-[13px]">
            {rows.map(([when, what], index) => (
                <div className="border-border flex h-10 items-center gap-2.5 border-b" key={index}>
                    <span className={`size-2 shrink-0 rounded-full ${index === 0 ? "bg-primary" : "bg-border"}`} />
                    {when}
                    <span className="text-muted-foreground ml-auto text-right">{what}</span>
                </div>
            ))}
        </div>
    );
}

function Notice({ icon = "warning", text }: { icon?: "time" | "warning"; text: ReactNode }) {
    const Icon = icon === "time" ? RiTimeLine : RiErrorWarningLine;
    return (
        <output className="border-border flex gap-2 rounded-[10px] border bg-white/[0.024] p-3 text-[13px]">
            <Icon className="text-muted-foreground mt-0.5 shrink-0" size={16} />
            <p>{text}</p>
        </output>
    );
}

function Links({ onRestore, restoring }: { onRestore?: () => void; restoring?: boolean }) {
    const copy = useIntlayer("paywall");
    return (
        <div className="text-muted-foreground mt-3.5 flex justify-center gap-4 text-xs">
            {onRestore ? (
                <button className="hover:text-foreground" disabled={restoring} onClick={onRestore} type="button">
                    {restoring ? copy.restoring : copy.restore}
                </button>
            ) : null}
            <LocalizedLink className="hover:text-foreground" to="/terms">
                {copy.terms}
            </LocalizedLink>
            <LocalizedLink className="hover:text-foreground" to="/privacy">
                {copy.privacy}
            </LocalizedLink>
        </div>
    );
}

function Panel({ children, terrain = false }: { children: ReactNode; terrain?: boolean }) {
    return (
        <div className="bg-card border-border relative isolate flex min-h-[480px] flex-col overflow-hidden rounded-2xl border p-5">
            {terrain ? (
                <img
                    alt=""
                    className="pointer-events-none absolute top-0 left-0 -z-10 w-full"
                    height={352}
                    src="/paywall-terrain.svg"
                    width={438}
                />
            ) : null}
            {children}
        </div>
    );
}

function Offer({
    busy,
    notice,
    onBuy,
    onRestore,
    restoring,
    trial,
}: {
    busy: boolean;
    notice: ReactNode;
    onBuy: (plan: ProPlan) => void;
    onRestore: () => void;
    restoring: boolean;
    trial: boolean;
}) {
    const copy = useIntlayer("paywall");
    const { locale } = useLocale();
    const format = useDate();
    const country = useLoaderData({ from: "__root__" });
    const [plan, setPlan] = useState<ProPlan>("annual");
    const prices = paywallPrices(country, locale);
    const [renewal] = useState(() => {
        const next = new Date();
        next.setMonth(next.getMonth() + 1);
        return next.getTime();
    });
    const ctaLabel = (() => {
        if (busy) {
            return copy.unlocking;
        }
        if (plan === "monthly") {
            return copy.getMonthly({ price: prices.monthly });
        }
        if (plan === "lifetime") {
            return copy.getLifetime({ price: prices.lifetime });
        }
        return trial ? copy.startTrial : copy.continueWithYearly;
    })();
    return (
        <Panel>
            <fieldset aria-label={copy.plans.label.value} className="bg-app-fill mb-5 flex rounded-[10px] p-[3px]">
                {PLANS.map((option) => (
                    <button
                        aria-pressed={option === plan}
                        className="dash-seg flex-1"
                        data-on={option === plan}
                        key={option}
                        onClick={() => setPlan(option)}
                        type="button"
                    >
                        {copy.plans[option]}
                    </button>
                ))}
            </fieldset>
            {plan === "annual" ? (
                <>
                    <div className="mb-2 flex gap-1.5 text-xs font-medium">
                        {trial ? (
                            <span className="text-app-income bg-app-fill rounded-md px-2 py-0.5">{copy.bestValue}</span>
                        ) : null}
                        <span className="text-app-income bg-app-fill rounded-md px-2 py-0.5">
                            {copy.save({ percent: prices.saving })}
                        </span>
                    </div>
                    <p className="text-[32px] leading-10 font-semibold tracking-[-0.02em]">
                        {prices.annual}{" "}
                        <small className="text-muted-foreground text-sm font-normal">{copy.perYear}</small>
                    </p>
                    <p className="text-muted-foreground font-mono text-[13px]">
                        {prices.annualPerMonth} {copy.perMo}
                    </p>
                    {trial ? (
                        <Timeline
                            rows={[
                                [copy.today, copy.proUnlocks],
                                [copy.dayN({ day: TRIAL_DAYS }), copy.firstCharge],
                            ]}
                        />
                    ) : null}
                </>
            ) : null}
            {plan === "monthly" ? (
                <>
                    <p className="text-[32px] leading-10 font-semibold tracking-[-0.02em]">
                        {prices.monthly}{" "}
                        <small className="text-muted-foreground text-sm font-normal">{copy.perMonth}</small>
                    </p>
                    <p className="text-muted-foreground font-mono text-[13px]">
                        {prices.monthlyPerYear} {copy.perYear}
                    </p>
                    <Timeline
                        rows={[
                            [copy.today, copy.unlocksAndCharges],
                            [format(renewal), copy.renewsFor({ price: prices.monthly })],
                            [copy.anytime, copy.cancelNoCharges],
                        ]}
                    />
                </>
            ) : null}
            {plan === "lifetime" ? (
                <>
                    <p className="text-[32px] leading-10 font-semibold tracking-[-0.02em]">
                        {prices.lifetime}{" "}
                        <small className="text-muted-foreground text-sm font-normal">{copy.once}</small>
                    </p>
                    <p className="text-muted-foreground text-[13px]">{copy.lifetimeNote}</p>
                    <Timeline
                        rows={[
                            [copy.today, copy.unlocksOneCharge],
                            [copy.everyDevice, copy.sameLedger],
                            [copy.afterThat, copy.noMoreCharges],
                        ]}
                    />
                </>
            ) : null}
            <div className="mt-auto flex flex-col gap-3 pt-5">
                {notice}
                <Button className="w-full" disabled={busy} onClick={() => onBuy(plan)}>
                    {ctaLabel}
                </Button>
            </div>
            {plan === "annual" ? (
                <p className="text-muted-foreground mt-2 text-center text-xs">
                    {trial ? copy.thenPerYear({ price: prices.annual }) : copy.chargedToday}
                </p>
            ) : null}
            {plan === "monthly" ? (
                <p className="text-muted-foreground mt-2 text-center text-xs">{copy.cancelAnytime}</p>
            ) : null}
            <Links onRestore={onRestore} restoring={restoring} />
        </Panel>
    );
}

function AlreadyPro({ plan }: { plan: NonNullable<ReturnType<typeof usePlan>["data"]> }) {
    const copy = useIntlayer("paywall");
    const format = useDate();
    const refresh = useMutation({
        mutationFn: () => convexClient().action(api.billing.restore, {}),
        onSuccess: (answer, _vars) => {
            if (answer === "restored") {
                window.location.assign("/app");
            }
        },
    });
    const manage = useMutation({
        mutationFn: () => convexClient().action(api.billing.openPortal, {}),
        onSuccess: (url) => {
            if (url) {
                window.location.assign(url);
            }
        },
    });
    const unconfirmed = refresh.isError || (refresh.isSuccess && refresh.data !== "restored");
    return (
        <Page>
            <div className="bg-card border-border mx-auto w-full max-w-[560px] overflow-hidden rounded-2xl border">
                <div className="flex items-center gap-2 px-5 pt-5 pb-4">
                    <h1 className="text-xl font-semibold tracking-[-0.02em]">{copy.proName}</h1>
                    <span
                        className={`ml-auto rounded-md border px-2 py-0.5 text-xs font-medium ${unconfirmed ? "text-app-warn border-border" : "text-app-income border-border"}`}
                    >
                        {unconfirmed ? copy.notConfirmedBadge : copy.active}
                    </span>
                </div>
                {[
                    plan.plan ? ([copy.plans.label, copy.plans[plan.plan]] as const) : null,
                    ...(unconfirmed
                        ? ([
                              [copy.syncRow, copy.off],
                              [copy.aiRow, copy.off],
                          ] as const)
                        : []),
                    !unconfirmed && plan.price
                        ? ([
                              copy.price,
                              new Intl.NumberFormat(undefined, {
                                  currency: plan.price.currency,
                                  style: "currency",
                              }).format(plan.price.amount),
                          ] as const)
                        : null,
                    !unconfirmed && plan.expiresAtMs !== null && plan.state === "renews"
                        ? ([copy.renews, format(plan.expiresAtMs)] as const)
                        : null,
                ].flatMap((row, index) =>
                    row ? (
                        <div
                            className="border-border flex h-11 items-center justify-between border-t px-5 text-[13px]"
                            key={index}
                        >
                            <span className="text-muted-foreground">{row[0]}</span>
                            <span>{row[1]}</span>
                        </div>
                    ) : (
                        []
                    )
                )}
                {unconfirmed ? (
                    <output className="border-border text-app-warn flex gap-2 border-t px-5 py-2.5 text-[13px]">
                        <RiTimeLine className="mt-0.5 shrink-0" size={16} />
                        {copy.alreadyNotConfirmed}
                    </output>
                ) : null}
                <div className="border-border flex min-h-[52px] items-center justify-end gap-2 border-t bg-white/[0.024] px-3 py-2">
                    {plan.store === "stripe" ? (
                        <Button disabled={manage.isPending} onClick={() => manage.mutate()} size="sm" variant="outline">
                            {copy.managePlan}
                        </Button>
                    ) : null}
                    <Button disabled={refresh.isPending} onClick={() => refresh.mutate()} size="sm">
                        {unconfirmed ? copy.checkAgain : copy.openDashboard}
                    </Button>
                </div>
            </div>
        </Page>
    );
}

function Layout({ left, right, sub, title }: { left: ReactNode; right: ReactNode; sub: ReactNode; title: ReactNode }) {
    return (
        <Page>
            <div>
                <h1 className="mb-1 text-[28px] leading-9 font-semibold tracking-[-0.02em] max-sm:text-2xl">{title}</h1>
                <p className="text-muted-foreground text-sm">{sub}</p>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_440px] gap-4 max-lg:grid-cols-1">
                <div className="max-lg:order-2">{left}</div>
                {right}
            </div>
        </Page>
    );
}

export function Paywall() {
    const copy = useIntlayer("paywall");
    const format = useDate();
    const { session } = useRouteContext({ from: "/_account/app" });
    const { checkout } = useSearch({ from: "/_account/app" });
    const plan = usePlan();
    const confirming = checkout !== undefined && checkout !== CHECKOUT_CONFIRMED;
    const confirm = useQuery({
        enabled: confirming,
        queryFn: async () => {
            const answer = await convexClient().action(api.billing.confirmCheckout, { sessionId: checkout ?? "" });
            if (answer === "unlocked") {
                window.location.replace(`/app?checkout=${CHECKOUT_CONFIRMED}`);
            }
            return answer;
        },
        queryKey: ["billing", "confirm", checkout],
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
    });
    const restore = useMutation({
        mutationFn: () => convexClient().action(api.billing.restore, {}),
        onSuccess: (answer) => {
            if (answer === "restored") {
                window.location.assign("/app");
            }
        },
    });
    const buy = useMutation({
        mutationFn: async (chosen: ProPlan) => {
            const answer = await startCheckout(chosen, await currentToken(session));
            if (answer.kind === "redirect") {
                window.location.assign(answer.url);
            }
            if (answer.kind === "alreadyPro") {
                window.location.assign("/app");
            }
            return answer;
        },
    });

    const left = plan.data?.state === "ended" ? <ComesBack /> : <Compare />;
    const title =
        plan.data?.state === "ended" && plan.data.expiresAtMs !== null
            ? copy.endedOn({ date: format(plan.data.expiresAtMs) })
            : copy.headline;
    const sub = plan.data?.state === "ended" ? copy.endedSub : copy.subhead;
    const frame = (right: ReactNode) => <Layout left={left} right={right} sub={sub} title={title} />;

    if (checkout === CHECKOUT_CONFIRMED) {
        return frame(
            <Panel terrain>
                <div className="mt-auto flex flex-col gap-3">
                    <Notice text={copy.didNotUnlock} />
                    <Button disabled={restore.isPending} onClick={() => restore.mutate()}>
                        {restore.isPending ? copy.restoring : copy.restore}
                    </Button>
                    <Button
                        render={<a aria-label={copy.writeToSupport.value} href={`mailto:${SUPPORT_EMAIL}`} />}
                        variant="outline"
                    >
                        {copy.writeToSupport}
                    </Button>
                </div>
                <Links />
            </Panel>
        );
    }
    if (confirming && (confirm.isError || confirm.data === "unconfirmed")) {
        return frame(
            <Panel terrain>
                <div className="mt-auto flex flex-col gap-3">
                    <Notice icon="time" text={copy.notConfirmed} />
                    <Button disabled={confirm.isFetching} onClick={() => confirm.refetch()}>
                        {copy.tryAgain}
                    </Button>
                </div>
                <Links onRestore={() => restore.mutate()} restoring={restore.isPending} />
            </Panel>
        );
    }
    if (plan.isPending) {
        return frame(
            <Panel>
                <div className="bg-app-fill mb-5 h-[38px] rounded-[10px]" />
                <div className="bg-app-fill mb-2 h-10 w-40 rounded-md" />
                <div className="bg-app-fill h-5 w-24 rounded-md" />
                <Button className="mt-auto w-full" disabled>
                    {copy.startTrial}
                </Button>
                <Links />
            </Panel>
        );
    }
    if (plan.isError || plan.data === null) {
        return frame(
            <Panel>
                <div className="mt-auto flex flex-col gap-3">
                    <Notice text={copy.plansUnavailable} />
                    <Button disabled={plan.isFetching} onClick={() => plan.refetch()}>
                        {copy.tryAgain}
                    </Button>
                </div>
                <Links />
            </Panel>
        );
    }
    if (HELD_STATES.has(plan.data.state) && !confirming) {
        return <AlreadyPro plan={plan.data} />;
    }
    const unlocking = confirming && (confirm.isPending || confirm.data === "unlocked");
    const message = (() => {
        if (confirm.data === "unpaid") {
            return copy.purchaseFailed;
        }
        if (restore.data === "nothing") {
            return copy.nothingRestored;
        }
        if (restore.isError || restore.data === "failed") {
            return copy.restoreFailed;
        }
        if (buy.isError || buy.data?.kind === "unavailable" || buy.data?.kind === "signedOut") {
            return copy.plansUnavailable;
        }
        return null;
    })();
    return frame(
        <Offer
            busy={unlocking || buy.isPending || buy.data?.kind === "redirect"}
            notice={message ? <Notice text={message} /> : null}
            onBuy={buy.mutate}
            onRestore={() => restore.mutate()}
            restoring={restore.isPending}
            trial={plan.data.trialAvailable}
        />
    );
}
